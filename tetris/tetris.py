# TETRIS 메인 엔진 - 웹 서버 및 AI 파이프라인 통합 관리
import argparse
import sys
import time
from pathlib import Path
from time import perf_counter
from typing import Optional, Tuple

HERE = Path(__file__).resolve().parent

# 설정 및 모듈 로드
from config import get_config
config = get_config()
MC_DIR = HERE / "main_chain"

if not MC_DIR.exists():
    raise FileNotFoundError(f"필수 폴더가 없습니다: {MC_DIR}")
if str(MC_DIR) not in sys.path:
    sys.path.insert(0, str(MC_DIR))

import main_chain as MC

# 하드웨어 제어 모듈 로드
RPI_DIR = HERE / "rpi_controller"
RPI_FILE = RPI_DIR / "rpi_controller.py"
if not RPI_FILE.exists():
    raise FileNotFoundError(f"필수 파일이 없습니다: {RPI_FILE}")
if str(RPI_DIR) not in sys.path:
    sys.path.insert(0, str(RPI_DIR))
import rpi_controller as RPI

# 공통 유틸리티 함수들
def _setup_module_path(module_name: str) -> Path:
    """모듈 경로 설정 및 sys.path 추가"""
    module_dir = HERE / module_name
    if str(module_dir) not in sys.path:
        sys.path.insert(0, str(module_dir))
    return module_dir

def _format_chain_results(result_data: dict, include_header: bool = False) -> list:
    """체인 결과를 포맷팅하여 리스트로 반환"""
    lines = []
    if include_header:
        lines.append("====================[ 단계별 AI 분석 결과 ]====================")
        lines.append("")
    
    sections = [
        ("chain1_out", "chain1_out"),
        ("chain2_out", "chain2_out"), 
        ("chain3_out", "chain3_out"),
        ("serial_encoder_out", "serial_encoder_out")
    ]
    
    for section_name, key in sections:
        lines.append(f"====================[ {section_name} ]====================")
        lines.append(result_data.get(key, ""))
        lines.append("")
    
    return lines

def _save_results_to_file(result_data: dict, out_path: Path, include_header: bool = False):
    """결과를 파일에 저장"""
    lines = _format_chain_results(result_data, include_header)
    out_path.write_text("\n".join(lines), encoding="utf-8")

def _prepare_output_path(scenario: str) -> Path:
    """출력 파일 경로 준비"""
    OUT_ROOT = config['output']['OUTPUT_ROOT']
    OUT_DIR = OUT_ROOT / "log_data"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUT_DIR / f"{scenario}.txt"

def _print_chain_results(result_data: dict):
    """체인 결과를 콘솔에 출력"""
    sections = [
        ("chain1_out", "chain1_out"),
        ("chain2_out", "chain2_out"), 
        ("chain3_out", "chain3_out"),
        ("serial_encoder_out", "serial_encoder_out")
    ]
    
    for section_name, key in sections:
        print(f"\n====================[ {section_name} ]====================")
        print(result_data.get(key, ""))

# 웹 서버 관리
def start_web_server(port: int = 5002, host: str = '0.0.0.0', debug: bool = False) -> tuple:
    """웹 서버 시작"""
    import threading
    
    _setup_module_path("web_interface")
    from web_interface.web import app
    
    print(f"🚀 TETRIS 웹 서버 시작 (포트: {port})")
    print(f"📱 모바일 접속: http://localhost:{port}/mobile/input")
    print(f"🖥️  데스크탑 접속: http://localhost:{port}/desktop/control")
    
    def run_server():
        app.run(host=host, port=port, debug=debug, threaded=True, use_reloader=False)
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    time.sleep(1)
    
    return server_thread

# 사용자 입력 수집
def get_user_input_web(port: int = 5002) -> Tuple[int, str, str]:
    """웹 모드 입력 수집"""
    try:
        from web_interface.base.state_manager import get_global_status
    except ImportError:
        try:
            from .web_interface.base.state_manager import get_global_status
        except ImportError:
            _setup_module_path("web_interface")
            from web_interface.base.state_manager import get_global_status

    print(f"통합 웹 서버에서 사용자 입력을 기다리는 중...")
    print(f"모바일 접속: http://localhost:{port}/mobile/input")
    print(f"데스크탑 접속: http://localhost:{port}/desktop/control")
    
    collected_people: Optional[int] = None
    collected_data_url: Optional[str] = None
    scenario: Optional[str] = None
    
    try:
        deadline = time.monotonic() + 120000
        while time.monotonic() < deadline:
            status = get_global_status()
            
            if status.get('uploaded_file') and status.get('people_count', 0) > 0:
                collected_people = status.get('people_count', 0)
                collected_data_url = status.get('image_data_url', '')
                scenario = status.get('scenario', 'items_unknown')
                
                print(f"[완료] 사용자 입력 수집 완료: 인원 {collected_people}명, 시나리오 {scenario}")
                break
                
            time.sleep(0.5)
        else:
            raise TimeoutError("웹 입력 수집 대기 시간이 초과되었습니다.")
            
    except KeyboardInterrupt:
        print("\n[중단] 사용자가 프로그램을 중단했습니다.")
        raise SystemExit(0)
    
    if not collected_data_url:
        raise RuntimeError("이미지 수집에 실패했습니다.")
    if not isinstance(collected_people, int) or collected_people < 0:
        raise RuntimeError("탑승 인원 수집에 실패했습니다.")

    return collected_people, collected_data_url, (scenario or "items_unknown")

def get_user_input_via_web(port: int = 5002, open_browser: bool = True) -> tuple:
    """웹을 통한 사용자 입력 수집"""
    
    if open_browser:
        try:
            import webbrowser
            webbrowser.open(f"http://localhost:{port}/desktop/control")
        except Exception:
            pass
    
    return get_user_input_web(port=port)

# 전체 파이프라인 실행
def run_full_pipeline(port: int = 5002, open_browser: bool = True) -> dict:
    """전체 파이프라인 실행"""
    start_web_server(port=port, debug=config['web']['DEBUG'])
    
    people_count, image_data_url, scenario = get_user_input_via_web(port=port, open_browser=open_browser)

    print("AI 체인 입력 생성 중...")
    user_msgs = MC.make_chain1_user_input(
        people_count=people_count, image_data_url=image_data_url
    )
    print(f"AI 체인 입력 생성 완료: {len(user_msgs)}개 메시지")

    out_path = _prepare_output_path(scenario)

    print("AI 체인 실행 시작...")
    t_chain_start = perf_counter()
    try:
        result = MC.tetris_chain.invoke({"user_input": user_msgs, "people_count": people_count})
        print("AI 체인 실행 완료")
    except Exception as e:
        print(f"\nAI 체인 실행 실패: {e}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1)
    t_chain_end = perf_counter()
    chain_elapsed = t_chain_end - t_chain_start
    print(f"AI 체인 실행 시간: {chain_elapsed:.3f}초")

    serial_encoder_out = result["serial_encoder_out"].strip()
    print(f"모터 제어 시작 (16-digit 코드: {serial_encoder_out})")
    try:
        RPI.connect_to_arduinos()

        connected = getattr(RPI, "arduino_connections", {})
        if not connected:
            print("연결된 아두이노가 없습니다. DRY-RUN 모드로 진행합니다.")
            print(f"[DRY-RUN] 16-digit 코드: {serial_encoder_out}")
        else:
            print(f"[연결] 아두이노 {len(connected)}개 연결됨")
            time.sleep(0.3)

            RPI.send_automated_command(serial_encoder_out)
            print("모터 제어 명령 전송 완료")

            time.sleep(2.0)

    except Exception as e:
        print(f"하드웨어 제어 중 예외 발생 → DRY-RUN 전환: {e}")
        print(f"[DRY-RUN] 16-digit 코드: {serial_encoder_out}")

    finally:
        try:
            RPI.close_all_connections()
            print("[연결] 아두이노 연결 종료")
        except Exception:
            pass
    print("모터 제어 완료")

    _print_chain_results(result)
    _save_results_to_file(result, out_path)

    return {
        "out_path": out_path,
        "chain_elapsed": chain_elapsed,
    }


# 단계별 분석 실행
def run_step_by_step_analysis(people_count: int, image_data_url: str, scenario: str, progress_callback=None, stop_callback=None, abort_controller=None) -> dict:
    """상태 저장 기반 단계별 AI 분석"""
    print("[DEBUG] 상태 저장 기반 단계별 AI 분석 시작...")
    print(f"[DEBUG] 파라미터: people_count={people_count}, scenario={scenario}")
    
    def check_stop():
        if stop_callback and stop_callback():
            print("[중지] 분석 중지 요청됨")
            return True
        if abort_controller and abort_controller.aborted:
            print("[중지] AbortController로 중지됨")
            return True
        return False
    
    class AnalysisCancelledException(Exception):
        def __init__(self, message="분석이 중지되었습니다."):
            self.message = message
            super().__init__(self.message)
    
    try:
        if check_stop():
            raise AnalysisCancelledException("분석이 중지되었습니다.")
        
        from web_interface.base.state_manager import state_manager
        state_manager.set('current_step', 0)
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.status', 'running')
        state_manager.set('processing.current_scenario', scenario)
        state_manager.set('upload.scenario', scenario)
        state_manager.set('upload.people_count', people_count)
        state_manager.set('analysis_result', {})
        state_manager.set('notifications', [])
        
        state_manager._progress_callback = progress_callback
        
        user_msgs = MC.make_chain1_user_input(
            people_count=people_count, image_data_url=image_data_url
        )
        
        print("상태 저장 기반 파이프라인 실행 시작...")
        result = MC.tetris_chain.invoke({
            "user_input": user_msgs,
            "people_count": people_count,
        })
        print("상태 저장 기반 파이프라인 실행 완료")
        
        analysis_result = state_manager.get('analysis_result', {})
        
        # serial_encoder_out이 analysis_result에 없으면 result에서 가져와서 추가
        if 'serial_encoder_out' not in analysis_result and 'serial_encoder_out' in result:
            analysis_result['serial_encoder_out'] = result['serial_encoder_out']
            state_manager.set('analysis_result', analysis_result)
        
        # 웹 인터페이스 호환성을 위해 모든 필요한 키가 analysis_result에 있는지 확인
        required_keys = ['chain1_out', 'chain2_out', 'chain3_out', 'serial_encoder_out']
        for key in required_keys:
            if key not in analysis_result and key in result:
                analysis_result[key] = result[key]
        
        # 업데이트된 analysis_result를 다시 저장
        if any(key in result for key in required_keys if key not in analysis_result):
            state_manager.set('analysis_result', analysis_result)
        
        out_path = _prepare_output_path(scenario)
        _save_results_to_file(analysis_result, out_path, include_header=True)
        
        total_elapsed = (result.get("chain1_run_time", 0) + 
                        result.get("chain2_run_time", 0) + 
                        result.get("chain3_run_time", 0))
        
        return {
            "analysis_result": analysis_result,
            "out_path": str(out_path),
            "total_elapsed": total_elapsed,
            "step_times": {
                "step1": result.get("chain1_run_time", 0),
                "step2": result.get("chain2_run_time", 0),
                "step3": result.get("chain3_run_time", 0),
                "step4": 0
            }
        }
        
    except AnalysisCancelledException:
        return {"status": "cancelled", "message": "분석이 중지되었습니다."}
    except Exception as e:
        print(f"[오류] 분석 중 예상치 못한 오류: {e}")
        raise


# 메인 실행 함수
def main():
    """명령줄 실행용 메인 함수"""
    ap = argparse.ArgumentParser(description="AI TETRIS launcher")
    ap.add_argument("--mode", default="web", choices=["web"], help="실행 모드 (웹 모드만 지원)")
    ap.add_argument("--port", type=int, default=5002)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    t_total_start = perf_counter()
    res = run_full_pipeline(port=args.port, open_browser=(not args.no_browser))

    t_total_end = perf_counter()
    total_elapsed = t_total_end - t_total_start

    print("\nTETRIS 시스템 실행 완료!")
    print(f"AI 체인 실행 시간: {res['chain_elapsed']:.3f}초")
    print(f"전체 실행 시간: {total_elapsed:.3f}초")
    print(f"결과 파일: {res['out_path']}")

    with res["out_path"].open("a", encoding="utf-8") as f:
        f.write("\n====================[ tetris 시스템 실행 완료 ]====================]\n")
        f.write(f"chain_run_time: {res['chain_elapsed']:.3f}s\n")
        f.write(f"tetris_run_time: {total_elapsed:.3f}s\n")

if __name__ == "__main__":
    main()
