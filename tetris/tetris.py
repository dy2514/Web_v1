# tetris.py

import argparse
import sys
import time
from pathlib import Path
from time import perf_counter
from typing import Optional, Tuple

HERE = Path(__file__).resolve().parent

# config 로드
from config import get_config
config = get_config()
MC_DIR = HERE / "main_chain"

if not MC_DIR.exists():
    raise FileNotFoundError(f"필수 폴더가 없습니다: {MC_DIR}")
if str(MC_DIR) not in sys.path:
    sys.path.insert(0, str(MC_DIR))

import main_chain as MC

# rpi_controller 로드 
RPI_DIR = HERE / "rpi_controller"
RPI_FILE = RPI_DIR / "rpi_controller.py"
if not RPI_FILE.exists():
    raise FileNotFoundError(f"필수 파일이 없습니다: {RPI_FILE}")
if str(RPI_DIR) not in sys.path:
    sys.path.insert(0, str(RPI_DIR))
import rpi_controller as RPI

def start_web_server(port: int = 5002, host: str = '0.0.0.0', debug: bool = False) -> tuple:
    """웹 서버 시작 - 런처에서 직접 호출 가능한 함수"""
    import threading
    
    # web_interface 경로 추가
    WEB_DIR = HERE / "web_interface"
    if str(WEB_DIR) not in sys.path:
        sys.path.insert(0, str(WEB_DIR))
    
    from web_interface.web import app
    
    print(f"🚀 TETRIS 웹 서버 시작 (포트: {port})")
    print(f"📱 모바일 접속: http://localhost:{port}/mobile/input")
    print(f"🖥️  데스크탑 접속: http://localhost:{port}/desktop/control")
    
    # 웹 서버를 별도 스레드에서 실행
    def run_server():
        app.run(host=host, port=port, debug=debug, threaded=True, use_reloader=False)
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # 서버 시작 대기
    time.sleep(1)
    
    return server_thread

def get_user_input_web(port: int = 5002) -> Tuple[int, str, str]:
    """
    웹 모드 입력 수집 - 통합 웹 서버 사용
    이 함수는 이제 통합 웹 서버의 상태를 모니터링하여 입력을 수집합니다.
    """
    # 통합 웹 서버의 상태 관리 모듈 import
    try:
        from web_interface.base.state_manager import get_global_status
    except ImportError:
        try:
            from ..base.state_manager import get_global_status
        except ImportError:
            # 직접 경로 추가
            web_interface_path = Path(__file__).parent
            if str(web_interface_path) not in sys.path:
                sys.path.insert(0, str(web_interface_path))
            from web_interface.base.state_manager import get_global_status

    print(f"통합 웹 서버에서 사용자 입력을 기다리는 중...")
    print(f"모바일 접속: http://localhost:{port}/mobile/input")
    print(f"데스크탑 접속: http://localhost:{port}/desktop/control")
    
    # 통합 웹 서버의 상태를 모니터링하여 입력 수집
    collected_people: Optional[int] = None
    collected_data_url: Optional[str] = None
    scenario: Optional[str] = None
    
    try:
        deadline = time.monotonic() + 120000
        while time.monotonic() < deadline:
            status = get_global_status()
            
            # 업로드된 파일과 인원 수가 모두 있는지 확인
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

def run_full_pipeline(port: int = 5002, open_browser: bool = True) -> dict:
    """전체 파이프라인 실행 - 런처에서 직접 호출"""
    # 1) 웹 서버 시작
    start_web_server(port=port, debug=config['web']['DEBUG'])
    
    # 2) 사용자 입력 수집
    people_count, image_data_url, scenario = get_user_input_via_web(port=port, open_browser=open_browser)

    # 3) main_chain 입력 생성
    print("AI 체인 입력 생성 중...")
    user_msgs = MC.make_chain1_user_input(
        people_count=people_count, image_data_url=image_data_url
    )
    print(f"AI 체인 입력 생성 완료: {len(user_msgs)}개 메시지")

    # 4) 출력 파일 경로 준비
    OUT_ROOT = config['output']['OUTPUT_ROOT']
    OUT_DIR = OUT_ROOT / "log_data"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{scenario}.txt"

    # 5) 전체 체인 실행 
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

    # 6) chain4_out → 아두이노 전송 
    chain4_out = result["chain4_out"].strip()
    print(f"모터 제어 시작 (16-digit 코드: {chain4_out})")
    try:
        RPI.connect_to_arduinos()

        connected = getattr(RPI, "arduino_connections", {})
        if not connected:
            print("연결된 아두이노가 없습니다. DRY-RUN 모드로 진행합니다.")
            print(f"[DRY-RUN] 16-digit 코드: {chain4_out}")
        else:
            print(f"[연결] 아두이노 {len(connected)}개 연결됨")
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
            print("[연결] 아두이노 연결 종료")
        except Exception:
            pass
    print("모터 제어 완료")

    # 7) 최종 출력 
    print("\n====================[ chain1_out ]====================")
    print(result.get("chain1_out", ""))
    print("\n====================[ chain2_out ]====================")
    print(result.get("chain2_out", ""))
    print("\n====================[ chain3_out ]====================")
    print(result.get("chain3_out", ""))
    print("\n====================[ chain4_out ]====================")
    print(chain4_out)

    # 8) 파일 저장 
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
    """상태 저장 기반 단계별 AI 분석 - web_interface 호환성 유지"""
    print("[DEBUG] 상태 저장 기반 단계별 AI 분석 시작...")
    print(f"[DEBUG] 파라미터: people_count={people_count}, scenario={scenario}")
    
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
        
        # state_manager 초기화 (web_interface 호환성)
        from web_interface.base.state_manager import state_manager
        state_manager.set('current_step', 0)
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.status', 'running')
        state_manager.set('processing.current_scenario', scenario)
        state_manager.set('upload.scenario', scenario)
        state_manager.set('upload.people_count', people_count)
        state_manager.set('analysis_result', {})
        state_manager.set('notifications', [])
        
        # 진행률 콜백을 state_manager에 저장 (핵심)
        state_manager._progress_callback = progress_callback
        
        # 입력 준비
        user_msgs = MC.make_chain1_user_input(
            people_count=people_count, image_data_url=image_data_url
        )
        
        # 파이프라인 실행 (상태 저장 자동 처리)
        print("상태 저장 기반 파이프라인 실행 시작...")
        result = MC.tetris_chain.invoke({
            "user_input": user_msgs,
            "people_count": people_count,
        })
        print("상태 저장 기반 파이프라인 실행 완료")
        
        # 최종 결과 반환 (state_manager에서 자동으로 저장된 결과 사용)
        analysis_result = state_manager.get('analysis_result', {})
        
        # 결과 저장
        OUT_ROOT = config['output']['OUTPUT_ROOT']
        OUT_DIR = OUT_ROOT / "log_data"
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUT_DIR / f"{scenario}.txt"
        
        lines = []
        lines.append("====================[ 단계별 AI 분석 결과 ]====================")
        lines.append("")
        lines.append("====================[ chain1_out ]====================")
        lines.append(analysis_result.get("chain1_out", ""))
        lines.append("")
        lines.append("====================[ chain2_out ]====================")
        lines.append(analysis_result.get("chain2_out", ""))
        lines.append("")
        lines.append("====================[ chain3_out ]====================")
        lines.append(analysis_result.get("chain3_out", ""))
        lines.append("")
        lines.append("====================[ chain4_out ]====================")
        lines.append(analysis_result.get("chain4_out", ""))
        
        out_path.write_text("\n".join(lines), encoding="utf-8")
        
        # 전체 실행 시간 계산
        total_elapsed = (result.get("chain1_run_time", 0) + 
                        result.get("chain2_run_time", 0) + 
                        result.get("chain3_run_time", 0))
        
        # 결과 반환 (web_interface 호환성 유지)
        return {
            "analysis_result": analysis_result,
            "out_path": str(out_path),
            "total_elapsed": total_elapsed,
            "step_times": {
                "step1": result.get("chain1_run_time", 0),
                "step2": result.get("chain2_run_time", 0),
                "step3": result.get("chain3_run_time", 0),
                "step4": 0  # chain4는 변환만 하므로 시간 측정 안함
            }
        }
        
    except AnalysisCancelledException:
        return {"status": "cancelled", "message": "분석이 중지되었습니다."}
    except Exception as e:
        print(f"[오류] 분석 중 예상치 못한 오류: {e}")
        raise


def main():
    """명령줄 실행용 메인 함수 (하위 호환성 유지)"""
    ap = argparse.ArgumentParser(description="AI TETRIS launcher")
    ap.add_argument("--mode", default="web", choices=["web"], help="실행 모드 (웹 모드만 지원)")
    ap.add_argument("--port", type=int, default=5002)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    # 전체 실행 시간 측정 시작
    t_total_start = perf_counter()
    res = run_full_pipeline(port=args.port, open_browser=(not args.no_browser))

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
