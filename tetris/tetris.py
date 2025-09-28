# tetris.py

import argparse
import sys
import time
from pathlib import Path
from time import perf_counter

HERE = Path(__file__).resolve().parent
MC_DIR = HERE / "main_chain"
UI_DIR = HERE / "user_input"

for p in (MC_DIR, UI_DIR):
    if not p.exists():
        raise FileNotFoundError(f"필수 폴더가 없습니다: {p}")
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from user_input import get_user_input_web, get_user_input_scenario
import main_chain as MC

# rpi_controller 로드 
RPI_DIR = HERE / "rpi_controller"
RPI_FILE = RPI_DIR / "rpi_controller.py"
if not RPI_FILE.exists():
    raise FileNotFoundError(f"필수 파일이 없습니다: {RPI_FILE}")
if str(RPI_DIR) not in sys.path:
    sys.path.insert(0, str(RPI_DIR))
import rpi_controller as RPI

def run_web_mode(port: int = 5002, open_browser: bool = True) -> tuple:
    """웹 모드 실행 - 통합 웹 서버 사용"""
    # web_interface 모듈 로드
    WEB_DIR = HERE / "web_interface"
    if str(WEB_DIR) not in sys.path:
        sys.path.insert(0, str(WEB_DIR))
    
    # 통합 웹 서버 실행
    from web_interface.web import app
    import threading
    import time
    
    print(f"TETRIS 통합 웹 서버 시작 (포트: {port})")
    print(f"모바일 접속: http://localhost:{port}/mobile/input")
    print(f"데스크탑 접속: http://localhost:{port}/desktop/control")
    
    if open_browser:
        try:
            import webbrowser
            webbrowser.open(f"http://localhost:{port}/desktop/control")
        except Exception:
            pass
    
    # 웹 서버를 별도 스레드에서 실행
    def run_server():
        app.run(host='0.0.0.0', port=port, debug=True, threaded=True, use_reloader=False)
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # user_input.py의 웹 모드 함수 사용
    from user_input import get_user_input_web
    return get_user_input_web(port=port, auto_open_browser=False)

def run_pipeline(mode: str, port: int = 5002, open_browser: bool = True) -> dict:
    # 1) 입력 수집
    if mode == "web":
        # 웹 모드: Blueprint 기반 통합 웹 서버 사용
        people_count, image_data_url, scenario = run_web_mode(
            port=port, open_browser=open_browser
        )
    else:  # scenario 모드
        people_count, image_data_url, scenario = get_user_input_scenario()

    # 2) main_chain 입력 생성
    print("AI 체인 입력 생성 중...")
    user_msgs = MC.make_chain1_user_input(
        people_count=people_count, image_data_url=image_data_url
    )
    print(f"AI 체인 입력 생성 완료: {len(user_msgs)}개 메시지")

    # 2-1) 출력 파일 경로 준비
    OUT_ROOT = HERE / "tetris_IO"
    OUT_DIR = OUT_DIR = OUT_ROOT / "log_data"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{scenario}.txt"

    # 3) 전체 체인 실행 
    print("AI 체인 실행 시작...")
    t_chain_start = perf_counter()
    try:
        result = MC.seq_chain.invoke({"user_input": user_msgs, "people_count": people_count})
        print("AI 체인 실행 완료")
    except Exception as e:
        print(f"\nAI 체인 실행 실패: {e}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1)
    t_chain_end = perf_counter()
    chain_elapsed = t_chain_end - t_chain_start
    print(f"AI 체인 실행 시간: {chain_elapsed:.3f}초")

    # 3-1) chain4_out → 아두이노 전송 
    chain4_out = result["chain4_out"].strip()
    print(f"모터 제어 시작 (16-digit 코드: {chain4_out})")
    try:
        RPI.connect_to_arduinos()

        connected = getattr(RPI, "arduino_connections", {})
        if not connected:
            print("연결된 아두이노가 없습니다. DRY-RUN 모드로 진행합니다.")
            print(f"[DRY-RUN] 16-digit 코드: {chain4_out}")
        else:
            print(f"🔌 아두이노 {len(connected)}개 연결됨")
            # 연결 직후 약간 대기 (보드 리셋/초기화 여유)
            time.sleep(0.3)

            RPI.send_automated_command(chain4_out)
            print("모터 제어 명령 전송 완료")

            # 동작할 시간 확보
            time.sleep(2.0)

    except Exception as e:
        # 하드웨어 제어 중 예외가 나도 결과 저장은 계속 진행
        print(f"하드웨어 제어 중 예외 발생 → DRY-RUN 전환: {e}")
        print(f"[DRY-RUN] 16-digit 코드: {chain4_out}")

    finally:
        # 연결 유무와 상관없이 안전 종료 시도
        try:
            RPI.close_all_connections()
            print("🔌 아두이노 연결 종료")
        except Exception:
            pass
    print("모터 제어 완료")

    # 4) 최종 출력 
    print("\n====================[ chain1_out ]====================")
    print(result.get("chain1_out", ""))
    print("\n====================[ chain2_out ]====================")
    print(result.get("chain2_out", ""))
    print("\n====================[ chain3_out ]====================")
    print(result.get("chain3_out", ""))
    print("\n====================[ chain4_out ]====================")
    print(chain4_out)

    # 5) 파일 저장 
    lines = []
    lines.append("====================[ chain1_out ]====================")
    lines.append(result.get("chain1_out", ""))
    lines.append("")
    lines.append("====================[ chain2_out ]====================")
    lines.append(result.get("chain2_out", ""))
    lines.append("")
    lines.append("====================[ chain3_out ]====================")
    lines.append(result.get("chain3_out", ""))
    lines.append("")
    lines.append("====================[ chain4_out ]====================")
    lines.append(chain4_out)

    out_path.write_text("\n".join(lines), encoding="utf-8")

    return {
        "out_path": out_path,
        "chain_elapsed": chain_elapsed,
    }


def run_step_by_step_analysis(people_count: int, image_data_url: str, scenario: str, progress_callback=None, stop_callback=None, abort_controller=None) -> dict:
    """단계별 AI 분석 실행"""
    print("[DEBUG] 단계별 AI 분석 시작...")
    print(f"[DEBUG] 파라미터: people_count={people_count}, scenario={scenario}")
    print(f"[DEBUG] progress_callback: {progress_callback}")
    print(f"[DEBUG] stop_callback: {stop_callback}")
    print(f"[DEBUG] abort_controller: {abort_controller}")
    
    # 중지 플래그 확인 함수
    def check_stop():
        if stop_callback and stop_callback():
            print("[중지] 분석 중지 요청됨")
            return True
        if abort_controller and abort_controller.aborted:
            print("[중지] AbortController로 중지됨")
            return True
        return False
    
    # 강제 중단을 위한 예외 클래스
    class AnalysisCancelledException(Exception):
        def __init__(self, message="분석이 중지되었습니다."):
            self.message = message
            super().__init__(self.message)
    
    try:
        # 시작 전 중지 확인
        if check_stop():
            raise AnalysisCancelledException("분석이 중지되었습니다.")
        
        # 분석 시작 시 이전 상태 완전 초기화
        print("[초기화] 새로운 분석 시작 - 이전 상태 완전 초기화")
        from base.state_manager import state_manager
        
        # 모든 분석 관련 상태 강제 초기화
        state_manager.set('current_step', 0)
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.status', 'running')
        state_manager.set('processing.current_scenario', None)
        state_manager.set('processing.started_at', None)
        state_manager.set('processing.completed_at', None)
        state_manager.set('analysis_result', {})
        state_manager.set('processed_results', {})
        state_manager.set('step_times', {})
        state_manager.set('total_elapsed', 0)
        state_manager.set('system.status', 'running')
        
        # 알림 초기화
        state_manager.set('notifications', [])
        
        print("[초기화] 상태 초기화 완료 - 1단계부터 시작")
        
        # 1단계: 이미지 분석 (Chain1)
        if progress_callback:
            print("[DEBUG] progress_callback 호출 중...")
            progress_callback(20, "이미지 분석 중", "이미지를 분석하고 있습니다...", current_step=1)
            print("[DEBUG] progress_callback 호출 완료")
        else:
            print("[DEBUG] progress_callback이 None입니다!")
        
        # 1단계 시작 전 중지 확인
        if check_stop():
            raise AnalysisCancelledException("분석이 중지되었습니다.")
        
        print("1단계: 이미지 분석 시작")
        t_step1_start = perf_counter()
        try:
            # Chain1 실행 전 중지 확인
            if check_stop():
                raise AnalysisCancelledException("분석이 중지되었습니다.")
                
            user_msgs = MC.make_chain1_user_input(
                people_count=people_count, image_data_url=image_data_url
            )
            
            # Chain1 실행 전 다시 한번 중지 확인
            if check_stop():
                raise AnalysisCancelledException("분석이 중지되었습니다.")
                
            chain1_result = MC.chain_1.invoke({"user_input": user_msgs})
            chain1_out = chain1_result["chain1_out_raw"]
            
            # people_count 주입
            from main_chain import _inject_people_into_json
            chain1_out = _inject_people_into_json(chain1_out, people_count)
            
            print("1단계: 이미지 분석 완료")
            t_step1_end = perf_counter()
            step1_elapsed = t_step1_end - t_step1_start
            print(f"1단계 실행 시간: {step1_elapsed:.3f}초")
            
            # 1단계 결과를 analysis_result에 저장 (새로운 분석 시작)
            from base.state_manager import state_manager
            # 새로운 analysis_result 시작 (이전 데이터 완전 제거)
            new_analysis_result = {}
            new_analysis_result['chain1_out'] = chain1_out
            state_manager.set('analysis_result', new_analysis_result)
            print(f"[DEBUG] 1단계 결과를 새로운 analysis_result에 저장: {len(chain1_out)}자")
            
        except Exception as e:
            print(f"1단계 실행 실패: {e}")
            raise
        
        # 1단계 완료 후 중지 확인
        if check_stop():
            raise AnalysisCancelledException("분석이 중지되었습니다.")
        
        # 2단계: 짐 인식 및 분류 (Chain2)
        print("2단계 시작 전 - current_step=2 설정")
        if progress_callback:
            progress_callback(40, "짐 인식 및 분류", "짐을 인식하고 분류하고 있습니다...", current_step=2)
        
        print("2단계: 짐 인식 및 분류 시작")
        t_step2_start = perf_counter()
        try:
            # Chain2 준비 - user_input에서 이미지 추출
            prep_result = MC.prep_chain2_from_user_input.invoke({
                "user_input": user_msgs
            })
            chain2_image = prep_result["chain2_image"]
            
            # Chain2 실행 - chain1_out과 chain2_image 사용
            chain2_result = MC.chain_2.invoke({
                "chain1_out": chain1_out,
                "chain2_image": chain2_image
            })
            chain2_out = chain2_result["chain2_out"]
            
            print("2단계: 짐 인식 및 분류 완료")
            t_step2_end = perf_counter()
            step2_elapsed = t_step2_end - t_step2_start
            print(f"2단계 실행 시간: {step2_elapsed:.3f}초")
            
            # 2단계 완료 후 중지 확인
            if check_stop():
                raise AnalysisCancelledException("분석이 중지되었습니다.")
            
            # 2단계 결과를 analysis_result에 저장 (기존 데이터 유지)
            current_analysis_result = state_manager.get('analysis_result', {})
            current_analysis_result['chain2_out'] = chain2_out
            state_manager.set('analysis_result', current_analysis_result)
            print(f"[DEBUG] 2단계 결과를 analysis_result에 저장: {len(chain2_out)}자")
            
        except Exception as e:
            print(f"2단계 실행 실패: {e}")
            raise
        
        # 3단계: 차량 공간 계산 (Chain3)
        print("3단계 시작 전 - current_step=3 설정")
        if progress_callback:
            progress_callback(60, "차량 공간 계산", "차량 공간을 계산하고 있습니다...", current_step=3)
        
        print("3단계: 차량 공간 계산 시작")
        t_step3_start = perf_counter()
        try:
            # Chain3 준비 - 입력 변수 없음
            prep_result = MC.prep_chain3_image.invoke({})
            chain3_image = prep_result["chain3_image"]
            
            # Chain3 실행 - chain2_out과 chain3_image 사용
            chain3_result = MC.chain_3.invoke({
                "chain2_out": chain2_out,
                "chain3_image": chain3_image
            })
            chain3_out = chain3_result["chain3_out"]
            
            print("3단계: 차량 공간 계산 완료")
            t_step3_end = perf_counter()
            step3_elapsed = t_step3_end - t_step3_start
            print(f"3단계 실행 시간: {step3_elapsed:.3f}초")
            
            # 3단계 완료 후 중지 확인
            if check_stop():
                raise AnalysisCancelledException("분석이 중지되었습니다.")
            
            # 3단계 결과를 analysis_result에 저장 (기존 데이터 유지)
            current_analysis_result = state_manager.get('analysis_result', {})
            current_analysis_result['chain3_out'] = chain3_out
            state_manager.set('analysis_result', current_analysis_result)
            print(f"[DEBUG] 3단계 결과를 analysis_result에 저장: {len(chain3_out)}자")
            
        except Exception as e:
            print(f"3단계 실행 실패: {e}")
            raise
        
        # 4단계: 최적 배치 생성 (Chain4)
        if progress_callback:
            progress_callback(80, "최적 배치 생성", "최적의 배치를 생성하고 있습니다...", current_step=4)
        
        print("4단계: 최적 배치 생성 시작")
        t_step4_start = perf_counter()
        try:
            # Chain4 실행
            chain4_result = MC.chain_4.invoke({"chain3_out": chain3_out})
            chain4_out = chain4_result["chain4_out"]
            
            print("4단계: 최적 배치 생성 완료")
            t_step4_end = perf_counter()
            step4_elapsed = t_step4_end - t_step4_start
            print(f"4단계 실행 시간: {step4_elapsed:.3f}초")
            
            # 4단계 완료 후 중지 확인
            if check_stop():
                raise AnalysisCancelledException("분석이 중지되었습니다.")
            
            # 4단계 결과를 analysis_result에 저장 (기존 데이터 유지)
            current_analysis_result = state_manager.get('analysis_result', {})
            current_analysis_result['chain4_out'] = chain4_out
            state_manager.set('analysis_result', current_analysis_result)
            print(f"[DEBUG] 4단계 결과를 analysis_result에 저장: {len(chain4_out)}자")
            
        except Exception as e:
            print(f"4단계 실행 실패: {e}")
            raise
        
        # 5단계: 결과 검증 및 완료
        if progress_callback:
            progress_callback(100, "결과 검증 및 완료", "분석이 완료되었습니다!", current_step=5)
        
        print("5단계: 결과 검증 및 완료")
        
        # 전체 실행 시간 계산
        total_elapsed = step1_elapsed + step2_elapsed + step3_elapsed + step4_elapsed
        
        # 결과 저장
        OUT_ROOT = HERE / "tetris_IO"
        OUT_DIR = OUT_ROOT / "log_data"
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUT_DIR / f"{scenario}.txt"
        
        lines = []
        lines.append("====================[ 단계별 AI 분석 결과 ]====================")
        lines.append(f"총 실행 시간: {total_elapsed:.3f}초")
        lines.append("")
        lines.append("====================[ chain1_out ]====================")
        lines.append(chain1_out)
        lines.append("")
        lines.append("====================[ chain2_out ]====================")
        lines.append(chain2_out)
        lines.append("")
        lines.append("====================[ chain3_out ]====================")
        lines.append(chain3_out)
        lines.append("")
        lines.append("====================[ chain4_out ]====================")
        lines.append(chain4_out)
        
        out_path.write_text("\n".join(lines), encoding="utf-8")
        
        # analysis_result만 반환 (result 제거)
        final_analysis_result = state_manager.get('analysis_result', {})
        print(f"[DEBUG] 최종 analysis_result 반환: {list(final_analysis_result.keys())}")
    
        return {
            "analysis_result": final_analysis_result,
            "out_path": str(out_path),  # WindowsPath를 문자열로 변환
            "total_elapsed": total_elapsed,
            "step_times": {
                "step1": step1_elapsed,
                "step2": step2_elapsed,
                "step3": step3_elapsed,
                "step4": step4_elapsed
            }
        }
        
    except AnalysisCancelledException as e:
        print(f"[중지] {e.message}")
        return {"status": "cancelled", "message": e.message}
    except Exception as e:
        print(f"[오류] 분석 중 예상치 못한 오류: {e}")
        raise


def main():
    ap = argparse.ArgumentParser(description="AI TETRIS launcher")
    ap.add_argument("--mode", required=True, choices=["web", "scenario"])
    ap.add_argument("--port", type=int, default=5002)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    # 전체 실행 시간 측정 시작
    t_total_start = perf_counter()
    res = run_pipeline(mode=args.mode, port=args.port, open_browser=(not args.no_browser))

    # 전체 실행 시간 측정 종료
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
