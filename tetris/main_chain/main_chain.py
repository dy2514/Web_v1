# main_chain.py

import os, json, re
from pathlib import Path
from typing import List, Dict, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage
from time import perf_counter

# [경로/키] __file__ 기준 상대경로와 GOOGLE_API_KEY 확보
ROOT = Path(__file__).resolve().parent                        # .../AIRL_ATM/SW/tetris/main_chain
TETRIS_ROOT = ROOT.parent                                     # .../AIRL_ATM/SW/tetris

# config에서 secrets 파일 경로 로드
import sys
sys.path.insert(0, str(TETRIS_ROOT))
from config import get_config
config = get_config()
SECRETS_JSON = config['ai']['SECRETS_JSON']

#[Chain1 경로]
CHAIN1_PROMPT_TXT = ROOT / "chain1_prompt" / "chain1_prompt.txt"

# [Chain2 경로] __file__ 기준: ./chain2_prompt/{chain2_prompt.txt, chain2_option.txt}
CHAIN2_PROMPT_DIR = ROOT / "chain2_prompt"
CHAIN2_PROMPT_TXT = CHAIN2_PROMPT_DIR / "chain2_prompt.txt"
CHAIN2_OPTION_TXT = CHAIN2_PROMPT_DIR / "chain2_option.txt"

# [Chain3 경로] __file__ 기준: ./chain3_prompt/<파일>
CHAIN3_DIR              = ROOT / "chain3_prompt"
C3_SYSTEM_TXT           = CHAIN3_DIR / "chain3_system.txt"
C3_QUERY_TXT            = CHAIN3_DIR / "chain3_query.txt"
C3_ROLE_TXT             = CHAIN3_DIR / "chain3_prompt_role.txt"
C3_ENV_TXT              = CHAIN3_DIR / "chain3_prompt_environment.txt"
C3_FUNC_TXT             = CHAIN3_DIR /  "chain3_prompt_function.txt"
C3_OUTFMT_TXT           = CHAIN3_DIR / "chain3_prompt_output_format.txt"
C3_EXAMPLE_TXT          = CHAIN3_DIR / "chain3_prompt_example.txt"
C3_IMAGE_PNG            = CHAIN3_DIR / "chain3_prompt_image.png"

def _read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def _escape_braces(s: str) -> str:
    s = s.replace("{{","__O__").replace("}}","__C__").replace("{","{{").replace("}","}}")
    return s.replace("__O__","{{").replace("__C__","}}")

# === 리소스 존재 fail-fast ===
def _require_exists(p: Path, label: str):
    if not p.exists():
        raise FileNotFoundError(f"{label} 누락: {p}")

# 필수 파일들 검증
for p, label in [
    (CHAIN1_PROMPT_TXT, "chain1_prompt.txt"),
    (CHAIN2_PROMPT_TXT, "chain2_prompt.txt"),
    (CHAIN2_OPTION_TXT, "chain2_option.txt"),
    (C3_SYSTEM_TXT, "chain3_system.txt"),
    (C3_QUERY_TXT, "chain3_query.txt"),
    (C3_ROLE_TXT, "chain3_prompt_role.txt"),
    (C3_ENV_TXT, "chain3_prompt_environment.txt"),
    (C3_FUNC_TXT, "chain3_prompt_function.txt"),
    (C3_OUTFMT_TXT, "chain3_prompt_output_format.txt"),
    (C3_EXAMPLE_TXT, "chain3_prompt_example.txt"),
]:
    _require_exists(p, label)

# ---- API 키 로드 ----
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if not GOOGLE_API_KEY and SECRETS_JSON.exists():
    GOOGLE_API_KEY = json.loads(_read_text(SECRETS_JSON))["google"]["GOOGLE_API_KEY"]
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY가 설정되어야 합니다.")

# === 모델/온도 환경변수 ===
chain1_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",
    temperature=0.2,
    api_key=GOOGLE_API_KEY
)
chain2_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-image-preview",
    temperature=0.2,
    api_key=GOOGLE_API_KEY
)
chain3_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",
    temperature=0.2,
    api_key=GOOGLE_API_KEY
)

# [LLM] 모델 초기화 부재함!!!

# ------------------------------------------------ chain ------------------------------------------------
# chain 1

# [Chain1 프롬프트] chain1_prompt.txt를 SystemMessage로 그대로 사용(중괄호 이스케이프)
_chain1_system = _escape_braces(_read_text(CHAIN1_PROMPT_TXT))
chain1_prompt = ChatPromptTemplate.from_messages([
    ("system", _chain1_system),
    MessagesPlaceholder(variable_name="user_input"),  # user_input: [사람수 텍스트, 이미지 메시지]
])

# [Chain1 입력 헬퍼] 사람수/이미지를 별도의 HumanMessage 2개로 구성(이미지는 data URL 그대로 전달)
def make_chain1_user_input(people_count: int, image_data_url: str) -> List[HumanMessage]:
    return [
        HumanMessage(content=f"people_count = {people_count}"),
        HumanMessage(content=[{"type":"image_url","image_url":{"url":image_data_url}}]),
    ]

def _inject_people_into_json(result_text: str, people_count: int) -> str:
    text = (result_text or "").strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S | re.I)
    if m:
        text = m.group(1).strip()
    if not (text.startswith("{") and text.endswith("}")):
        first = text.find("{"); last = text.rfind("}")
        if first != -1 and last != -1 and first < last:
            text = text[first:last+1]
    try:
        data = json.loads(text)
        out = {"people": int(people_count or 0)}
        if isinstance(data, dict):
            out.update(data)
        else:
            out["model_output"] = data
        return json.dumps(out, ensure_ascii=False, indent=2)
    except Exception:
        return json.dumps(
            {"people": int(people_count or 0), "raw_model_output": result_text},
            ensure_ascii=False, indent=2,
        )

def _inject_people_value(inputs: dict) -> str:
    return _inject_people_into_json(
        inputs.get("chain1_out_raw", ""),
        int(inputs.get("people_count", 0)),
    )

# chain 2
# user_input(List[HumanMessage])에서 이미지 메시지 추출 → chain2_image에 전달

_chain2_system = _escape_braces(_read_text(CHAIN2_PROMPT_TXT))
_chain2_option = _escape_braces(_read_text(CHAIN2_OPTION_TXT))
chain2_prompt = ChatPromptTemplate.from_messages([
    ("system", _chain2_system),
    ("system", _chain2_option),
    ("human", "{chain1_out}"),
    MessagesPlaceholder(variable_name="chain2_image"),
])

def _extract_chain2_image(inputs: dict) -> dict:
    msgs = inputs["user_input"]
    img_msgs = [m for m in msgs if isinstance(m.content, list)]
    if not img_msgs:
        raise ValueError("user_input에 이미지 메시지가 없습니다.")
    return {"chain2_image": [img_msgs[0]]}

def _chain2_image_value(inputs: dict):
    return _extract_chain2_image(inputs)["chain2_image"]

def _extract_instruction_json(result_text: str) -> str:
    """
    chain2_out_raw 전체 응답에서 instruction 딕셔너리만 꺼내
    {"instruction": { ... }} 형태로 반환.
    - 배열/콜론 뒤 공백 제거: separators=(",", ":")
    - 보기 좋게 들여쓰기 2칸 유지: indent=2
    """
    text = (result_text or "").strip()

    # 코드펜스 우선 추출
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S | re.I)
    if m:
        text = m.group(1).strip()

    # 바깥 텍스트 섞인 경우 { ... }만 재추출
    if not (text.startswith("{") and text.endswith("}")):
        first = text.find("{"); last = text.rfind("}")
        if first != -1 and last != -1 and first < last:
            text = text[first:last+1]

    def _wrap(instr_obj: dict) -> str:
        # 최종 포맷: {"instruction":{ ... }}  (콤마/콜론 뒤 공백 없음)
        return json.dumps({"instruction": instr_obj}, ensure_ascii=False, indent=2, separators=(",", ":"))

    # 1) 정식 JSON 파싱
    try:
        data = json.loads(text)

        # (a) 표준 형태: {"instruction": {...}, ...}
        if isinstance(data, dict) and "instruction" in data:
            instr = data["instruction"]
            # instruction이 dict가 아니면 안전하게 감싼다
            if isinstance(instr, dict):
                return _wrap(instr)
            else:
                return _wrap({"raw_model_output": instr})

        # (b) 축약형: 최상위가 instruction 내용(= seats 포함)
        if isinstance(data, dict) and ("seats" in data or "1" in data or "2" in data):
            return _wrap(data)

        # (c) dict지만 구조가 다른 경우도 래핑하여 반환
        if isinstance(data, dict):
            return _wrap(data)

        # dict 아님 → raw 보존
        return _wrap({"raw_model_output": data})

    except Exception:
        # 2) 정규식으로 "instruction": {...} 블록만 재시도
        m2 = re.search(r'"instruction"\s*:\s*(\{.*\})', text, re.S | re.I)
        if m2:
            block = m2.group(1)
            try:
                instr = json.loads(block)
                if isinstance(instr, dict):
                    return _wrap(instr)
                else:
                    return _wrap({"raw_model_output": instr})
            except Exception:
                pass

        # 실패 시 raw를 instruction으로 감싸서 반환
        return _wrap({"raw_model_output": result_text})

def _inject_instruction_value(inputs: dict) -> str:
    """pipeline용: chain2_out_raw -> chain2_out(= {"instruction": {...}})"""
    return _extract_instruction_json(inputs.get("chain2_out_raw", ""))


# chain 3
# [Chain3 프롬프트] system=chain3_system.txt, human=role/env/func/output_format/example + {chain2_out} + query + 이미지
_chain3_system   = _escape_braces(_read_text(C3_SYSTEM_TXT))
_chain3_role     = _escape_braces(_read_text(C3_ROLE_TXT))
_chain3_env      = _escape_braces(_read_text(C3_ENV_TXT))
_chain3_func     = _escape_braces(_read_text(C3_FUNC_TXT))
_chain3_outfmt   = _escape_braces(_read_text(C3_OUTFMT_TXT))
_chain3_example  = _escape_braces(_read_text(C3_EXAMPLE_TXT))
_chain3_query    = _escape_braces(_read_text(C3_QUERY_TXT))

chain3_prompt = ChatPromptTemplate.from_messages([
    ("system", _chain3_system),
    ("human",  _chain3_role),
    ("human",  _chain3_env),
    ("human",  _chain3_func),
    ("human",  _chain3_outfmt),
    ("human",  _chain3_example),
    ("human",  "{chain2_out}"),
    ("human",  _chain3_query),
])


# chain 4
class chain4:
    def __init__(self):
        self.encoding_rules = {
            'disk_rotate': {0: '0000', 90: '0010'},
            'move_on_rail': {'M': '0000', 'A': '0100', 'C': '0200'},
            'seat_rotate': {0: '0000', 90: '1000', 180: '2000', 270: '3000'},
            'unfold': '0000',
            'fold': '0001',
            'unchanged': '0000'
        }
    def parse_function_call(self, func_call: str) -> Dict[str, Union[str, int, None]]:
        if not func_call or not isinstance(func_call, str):
            raise ValueError(f"Invalid function call (empty): {func_call}")
        s = func_call.strip()
        if not s:
            raise ValueError(f"Invalid function call (blank): {func_call}")
        if "(" not in s and ")" not in s:
            return {"function": s, "param": None}
        m = re.match(r"^\s*(\w+)\s*\(\s*(.*?)\s*\)\s*$", s)
        if not m:
            raise ValueError(f"Invalid function call format: {func_call}")
        func_name, arg_str = m.group(1), m.group(2)
        if arg_str == "":
            param = None
        else:
            param_raw = arg_str.strip().strip('\'"')
            param = int(param_raw) if param_raw.isdigit() else param_raw
        return {"function": func_name, "param": param}
    def process_cell(self, function_calls: Union[str, List[str]]) -> str:
        if function_calls is None:
            return "0000"
        if isinstance(function_calls, str):
            raw = function_calls.strip()
            if not raw:
                calls = []
            elif ";" in raw or "\n" in raw:
                calls = [x.strip() for x in re.split(r"[;\n]", raw) if x.strip()]
            else:
                calls = [raw]
        elif isinstance(function_calls, list):
            calls = [str(x).strip() for x in function_calls if str(x).strip()]
        else:
            raise ValueError(f"Cell actions must be list or str, got: {type(function_calls)}")
        total_sum = 0
        unfold_count = 0
        for func_call in calls:
            parsed = self.parse_function_call(func_call)
            func_name = parsed["function"]; param = parsed["param"]
            if func_name == "unchanged":
                encoded_pin = '0000'
            elif func_name == "disk_rotate":
                if param not in self.encoding_rules["disk_rotate"]:
                    raise ValueError(f"Invalid degree value for disk_rotate: {param}")
                encoded_pin = self.encoding_rules["disk_rotate"][param]
            elif func_name == "move_on_rail":
                if param not in self.encoding_rules["move_on_rail"]:
                    raise ValueError(f"Invalid target value for move_on_rail: {param}")
                encoded_pin = self.encoding_rules["move_on_rail"][param]
            elif func_name == "seat_rotate":
                if param not in self.encoding_rules["seat_rotate"]:
                    raise ValueError(f"Invalid degree value for seat_rotate: {param}")
                encoded_pin = self.encoding_rules["seat_rotate"][param]
            elif func_name == "unfold":
                encoded_pin = '0000'; unfold_count += 1
            elif func_name == "fold":
                encoded_pin = '0001'
            else:
                raise ValueError(f"Unknown function: {func_name}")
            total_sum += int(encoded_pin)
        final_result = total_sum - unfold_count
        return f"{final_result:04d}"
    def convert_to_16_digit(self, task_sequence: Dict[str, Union[str, List[str]]]) -> str:
        if not isinstance(task_sequence, dict):
            raise ValueError(f"task_sequence must be dict, got: {type(task_sequence)}")
        return ''.join(self.process_cell(task_sequence.get(cell, "unchanged")) for cell in ['1','2','3','4'])
    def convert_from_json_string(self, json_string: str) -> str:
        try:
            data = json.loads(json_string)
            if 'task_sequence' in data:
                return self.convert_to_16_digit(data['task_sequence'])
            else:
                return self.convert_to_16_digit(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")

def _extract_json_str_for_chain4(text: str) -> str:
    if not text or text.strip() == "":
        # Chain3 빈 응답에 대한 폴백 처리
        print("[경고] Chain3 응답이 비어있습니다. 기본 작업 순서를 사용합니다.")
        fallback_json = {
            "task_sequence": {
                "1": "unchanged",
                "2": "unchanged", 
                "3": "unchanged",
                "4": "unchanged"
            }
        }
        return json.dumps(fallback_json, ensure_ascii=False, indent=2)
    
    t = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S | re.I)
    if m:
        return m.group(1).strip()
    if not (t.startswith("{") and t.endswith("}")):
        first = t.find("{"); last = t.rfind("}")
        if first != -1 and last != -1 and first < last:
            t = t[first:last+1]
    return t

_chain4_converter = chain4()

def _run_chain3_with_retry(inputs: dict) -> str:
    """Chain3 실행 시 빈 응답에 대한 재시도 로직"""
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            # Chain3 실행
            result = (chain3_prompt | chain3_llm | StrOutputParser()).invoke(inputs)
            
            # 빈 응답 체크
            if result and result.strip():
                print(f"[성공] Chain3 실행 성공 (시도 {attempt + 1})")
                return result
            else:
                print(f"[경고] Chain3 빈 응답 (시도 {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    print(f"[재시도] Chain3 재시도 중... ({attempt + 2}/{max_retries})")
                    continue
                else:
                    print("[폴백] Chain3 최대 재시도 초과, 기본 응답 사용")
                    return '{"task_sequence": {"1": "unchanged", "2": "unchanged", "3": "unchanged", "4": "unchanged"}}'
                    
        except Exception as e:
            print(f"[오류] Chain3 실행 실패 (시도 {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                print(f"[재시도] Chain3 재시도 중... ({attempt + 2}/{max_retries})")
                continue
            else:
                print("[폴백] Chain3 최대 재시도 초과, 기본 응답 사용")
                return '{"task_sequence": {"1": "unchanged", "2": "unchanged", "3": "unchanged", "4": "unchanged"}}'
    
    # 최종 폴백
    return '{"task_sequence": {"1": "unchanged", "2": "unchanged", "3": "unchanged", "4": "unchanged"}}'

def _run_chain4_transform(inputs: dict) -> dict:
    raw = inputs.get("chain3_out", "")
    json_str = _extract_json_str_for_chain4(raw)
    result16 = _chain4_converter.convert_from_json_string(json_str)
    result16 = (result16 or "").strip()
    if not result16.isdigit():
        raise ValueError(f"chain4 result is not numeric: {result16}")
    if len(result16) < 16:
        result16 = result16.rjust(16, "0")
    elif len(result16) > 16:
        result16 = result16[:16]
    return {"chain4_out": result16}


# ---------------------- 탭 프린터 (즉시 터미널 출력) ----------------------
def _tap_print_chain1(d):
    print("\n=====================chain1_out =====================")
    print(d.get("chain1_out", ""))
    print(f"\n[시간] chain1_run_time: {d.get('chain1_run_time', 0.0):.3f}s")
    return ""

def _tap_print_chain2(d):
    print("\n=====================chain2_out =====================")
    print(d.get("chain2_out_raw", ""))
    print(f"\n[시간] chain2_run_time: {d.get('chain2_run_time', 0.0):.3f}s")
    return ""

def _tap_print_chain3(d):
    print("\n=====================chain3_out =====================")
    print(d.get("chain3_out", ""))
    print(f"\n[시간] chain3_run_time: {d.get('chain3_run_time', 0.0):.3f}s")
    return ""

def _tap_print_chain4(d):
    print("\n=====================chain4_out =====================")
    print(d.get("chain4_out", ""))
    return ""

# ---------------------- 상태 저장 함수들 (진행률 콜백 포함) ----------------------
def _tap_save_chain1(d):
    """1단계 결과 저장 및 진행률 업데이트"""
    # 기존 출력 기능
    print("\n=====================chain1_out =====================")
    print(d.get("chain1_out", ""))
    print(f"\n[시간] chain1_run_time: {d.get('chain1_run_time', 0.0):.3f}s")
    
    # 상태 저장
    try:
        from web_interface.base.state_manager import state_manager
        analysis_result = state_manager.get('analysis_result', {})
        analysis_result['chain1_out'] = d.get("chain1_out", "")
        state_manager.set('analysis_result', analysis_result)
        
        # 진행률 콜백 호출
        if hasattr(state_manager, '_progress_callback') and state_manager._progress_callback:
            state_manager._progress_callback(25, "사용자 입력 분석 완료", "1단계 완료", current_step=1)
        
        print(f"[DEBUG] 1단계 결과 저장 완료")
    except Exception as e:
        print(f"[오류] 1단계 상태 저장 실패: {e}")
    
    return ""

def _tap_save_chain2(d):
    """2단계 결과 저장 및 진행률 업데이트"""
    # 기존 출력 기능
    print("\n=====================chain2_out =====================")
    print(d.get("chain2_out_raw", ""))
    print(f"\n[시간] chain2_run_time: {d.get('chain2_run_time', 0.0):.3f}s")
    
    # 상태 저장
    try:
        from web_interface.base.state_manager import state_manager
        analysis_result = state_manager.get('analysis_result', {})
        analysis_result['chain2_out'] = d.get("chain2_out", "")
        state_manager.set('analysis_result', analysis_result)
        
        # 진행률 콜백 호출
        if hasattr(state_manager, '_progress_callback') and state_manager._progress_callback:
            state_manager._progress_callback(50, "최적 배치 생성 완료", "2단계 완료", current_step=2)
        
        print(f"[DEBUG] 2단계 결과 저장 완료")
    except Exception as e:
        print(f"[오류] 2단계 상태 저장 실패: {e}")
    
    return ""

def _tap_save_chain3(d):
    """3단계 결과 저장 및 진행률 업데이트"""
    # 기존 출력 기능
    print("\n=====================chain3_out =====================")
    print(d.get("chain3_out", ""))
    print(f"\n[시간] chain3_run_time: {d.get('chain3_run_time', 0.0):.3f}s")
    
    # 상태 저장
    try:
        from web_interface.base.state_manager import state_manager
        analysis_result = state_manager.get('analysis_result', {})
        analysis_result['chain3_out'] = d.get("chain3_out", "")
        state_manager.set('analysis_result', analysis_result)
        
        # 진행률 콜백 호출
        if hasattr(state_manager, '_progress_callback') and state_manager._progress_callback:
            state_manager._progress_callback(75, "시트 동작 계획 완료", "3단계 완료", current_step=3)
        
        print(f"[DEBUG] 3단계 결과 저장 완료")
    except Exception as e:
        print(f"[오류] 3단계 상태 저장 실패: {e}")
    
    return ""

def _tap_save_chain4(d):
    """4단계 결과 저장 및 진행률 업데이트"""
    # 기존 출력 기능
    print("\n=====================chain4_out =====================")
    print(d.get("chain4_out", ""))
    
    # 상태 저장
    try:
        from web_interface.base.state_manager import state_manager
        analysis_result = state_manager.get('analysis_result', {})
        analysis_result['chain4_out'] = d.get("chain4_out", "")
        state_manager.set('analysis_result', analysis_result)
        
        # 진행률 콜백 호출
        if hasattr(state_manager, '_progress_callback') and state_manager._progress_callback:
            state_manager._progress_callback(100, "최적 배치 생성 완료", "4단계 완료", current_step=4)
        
        print(f"[DEBUG] 4단계 결과 저장 완료")
    except Exception as e:
        print(f"[오류] 4단계 상태 저장 실패: {e}")
    
    return ""

# =============================== LCEL 파이프라인 ===============================
_pipeline = (
    RunnablePassthrough()

    # --- chain1 ---
    .assign(_t1_start=RunnableLambda(lambda _: perf_counter()))
    .assign(chain1_out_raw=(chain1_prompt | chain1_llm | StrOutputParser()))
    .assign(chain1_out=RunnableLambda(_inject_people_value))
    .assign(chain1_run_time=RunnableLambda(lambda d: perf_counter() - d["_t1_start"]))
    .assign(_tap1=RunnableLambda(_tap_print_chain1))
    .assign(_save1=RunnableLambda(_tap_save_chain1))  # 상태 저장 추가

    # --- chain2 ---
    .assign(chain2_image=RunnableLambda(_chain2_image_value))
    .assign(_t2_start=RunnableLambda(lambda _: perf_counter()))
    .assign(chain2_out_raw=(chain2_prompt | chain2_llm | StrOutputParser()))
    .assign(chain2_out=RunnableLambda(_inject_instruction_value))
    .assign(chain2_run_time=RunnableLambda(lambda d: perf_counter() - d["_t2_start"]))
    .assign(_tap2=RunnableLambda(_tap_print_chain2))
    .assign(_save2=RunnableLambda(_tap_save_chain2))  # 상태 저장 추가

    # --- chain3 ---
    .assign(_t3_start=RunnableLambda(lambda _: perf_counter()))
    .assign(chain3_out=RunnableLambda(lambda d: _run_chain3_with_retry(d)))
    .assign(chain3_run_time=RunnableLambda(lambda d: perf_counter() - d["_t3_start"]))
    .assign(_tap3=RunnableLambda(_tap_print_chain3))
    .assign(_save3=RunnableLambda(_tap_save_chain3))  # 상태 저장 추가

    # --- chain4 (변환) ---
    .assign(chain4_out=RunnableLambda(lambda d: _run_chain4_transform(d)["chain4_out"]))
    .assign(_tap4=RunnableLambda(_tap_print_chain4))
    .assign(_save4=RunnableLambda(_tap_save_chain4))  # 상태 저장 추가
)

def _select_outputs(d: dict) -> dict:
    return {
        "chain1_out": d.get("chain1_out", ""),
        "chain2_out": d.get("chain2_out", ""),           # {"instruction":{...}}
        "chain3_out": d.get("chain3_out", ""),
        "chain4_out": d.get("chain4_out", ""),
        "chain1_run_time": d.get("chain1_run_time", 0.0),
        "chain2_run_time": d.get("chain2_run_time", 0.0),
        "chain3_run_time": d.get("chain3_run_time", 0.0),
        "chain2_out_raw": d.get("chain2_out_raw", ""),   # 원문(로그용)
    }

tetris_chain = _pipeline | RunnableLambda(_select_outputs)

