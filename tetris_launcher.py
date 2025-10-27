#!/usr/bin/env python3
"""
TETRIS 시스템 최종 런처
단계별 검증 후 안정적 실행
Phase 2 & 3: 코드 정리 및 최적화
"""
import sys
import os
import argparse
import time
import threading
import webbrowser
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

# 로깅 시스템 초기화
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

print("🚀 TETRIS 시스템 최종 런처")
print("=" * 60)

# ============================================
# Phase 2: 공통 유틸리티 함수
# ============================================

def log_step(step_number: int, step_name: str):
    """단계 로깅"""
    logger.info(f"Step {step_number}: {step_name}")
    print(f"\n{step_number}단계: {step_name}")

def print_success(message: str):
    """성공 메시지 출력"""
    logger.info(message)
    print(f"✅ {message}")

def print_error(message: str):
    """에러 메시지 출력"""
    logger.error(message)
    print(f"❌ {message}")

def print_warning(message: str):
    """경고 메시지 출력"""
    logger.warning(message)
    print(f"⚠️ {message}")

def open_browser(url: str) -> bool:
    """브라우저 자동 열기"""
    try:
        webbrowser.open(url)
        print_success("브라우저 열기 성공")
        return True
    except Exception as e:
        logger.error(f"브라우저 열기 실패: {e}")
        return False

def print_urls(port: int):
    """접속 URL 출력"""
    print(f"\n📱 웹 접속 주소:")
    print(f"  🏠 메인 페이지: http://127.0.0.1:{port}/")
    print(f"  📱 모바일 입력: http://127.0.0.1:{port}/mobile/input")
    print(f"  🖥️  데스크탑 제어: http://127.0.0.1:{port}/desktop/control")

# ============================================
# Phase 2: 에러 처리 통합
# ============================================

class TetrisLaunchError(Exception):
    """TETRIS 런처 전용 예외"""
    pass

def handle_error(error: Exception, context: str = "") -> None:
    """통합 에러 처리"""
    error_msg = f"{context}: {str(error)}" if context else str(error)
    logger.error(error_msg, exc_info=True)
    print_error(error_msg)
    raise TetrisLaunchError(error_msg)

# ============================================
# Phase 1: 필수 조건 확인
# ============================================

def check_prerequisites() -> bool:
    """필수 조건 확인"""
    log_step(1, "필수 조건 확인")
    
    # 프로젝트 구조 확인
    tetris_dir = Path("tetris")
    if not tetris_dir.exists():
        print_error("tetris 디렉토리가 없습니다.")
        return False
    
    tetris_py = tetris_dir / "tetris.py"
    if not tetris_py.exists():
        print_error("tetris.py 파일이 없습니다.")
        return False
    
    web_dir = tetris_dir / "web_interface"
    if not web_dir.exists():
        print_error("web_interface 디렉토리가 없습니다.")
        return False
    
    print_success("프로젝트 구조 확인 완료")
    
    # Python 모듈 확인
    try:
        import flask
        import PIL
        import langchain
        print_success("필수 패키지 확인 완료")
    except ImportError as e:
        print_error(f"필수 패키지 누락: {e}")
        return False
    
    return True

# ============================================
# Phase 1: 설정 로딩
# ============================================

def test_config_loading() -> Tuple[bool, Optional[int], Optional[str]]:
    """설정 로딩 테스트 - config_manager.py 사용"""
    log_step(2, "설정 시스템 확인")
    
    try:
        # config_manager.py 사용
        sys.path.insert(0, "tetris/web_interface/base")
        from config_manager import get_config
        
        config = get_config()
        
        port = config["web"]["PORT"]
        host = config["web"]["HOST"]
        
        print_success(f"웹 서버 설정: {host}:{port}")
        print_success(f"비밀키: {'설정됨' if config['web']['SECRET_KEY'] != 'YOUR_SECRET_KEY_HERE' else '미설정'}")
        print_success(f"설정 소스: {'환경변수' if 'TETRIS_HOST' in os.environ else 'config.py'}")
        
        return True, port, host
    except Exception as e:
        print_error(f"설정 로딩 실패: {e}")
        # 폴백: 기존 config.py 시도
        try:
            sys.path.insert(0, "tetris")
            from config import get_config
            config = get_config()
            
            port = config["web"]["PORT"]
            host = config["web"]["HOST"]
            
            print_success(f"폴백 설정 로드 성공: {host}:{port}")
            return True, port, host
        except Exception as fallback_error:
            print_error(f"폴백 설정 로딩도 실패: {fallback_error}")
            return False, None, None

# ============================================
# Phase 1: 웹 서버 실행
# ============================================

def launch_tetris_direct(port: int) -> Tuple[Optional[threading.Thread], bool]:
    """TETRIS 웹 시스템 직접 실행 - subprocess 제거"""
    log_step(3, f"TETRIS 웹 시스템 실행 (포트: {port})")
    
    try:
        # tetris.py를 직접 import
        sys.path.insert(0, "tetris")
        from tetris import start_web_server
        
        logger.info("🚀 TETRIS 시스템 시작 중...")
        
        # 웹 서버 시작
        server_thread = start_web_server(port=port, debug=False)
        print_success("웹 서버 시작 완료")
        return server_thread, True
    except Exception as e:
        handle_error(e, "웹 서버 시작 실패")
        return None, False

# ============================================
# Phase 2: 웹 접속 확인
# ============================================

def verify_web_access(port: int) -> bool:
    """웹 접속 확인"""
    log_step(4, f"웹 접속 확인 (포트: {port})")
    
    try:
        import requests
        
        base_url = f"http://127.0.0.1:{port}"
        
        # 기본 페이지 테스트
        try:
            response = requests.get(base_url, timeout=5, allow_redirects=True)
            logger.info(f"메인 페이지: {response.status_code}")
            print_success(f"메인 페이지: {response.status_code}")
        except Exception as e:
            print_error(f"메인 페이지 접속 실패: {e}")
            return False
        
        # 주요 페이지들 테스트
        pages = [
            ("/mobile/input", "모바일 입력"),
            ("/desktop/control", "데스크탑 제어"),
        ]
        
        for path, name in pages:
            try:
                response = requests.get(base_url + path, timeout=5)
                logger.info(f"{name} 페이지: {response.status_code}")
                print_success(f"{name} 페이지: {response.status_code}")
            except Exception as e:
                print_warning(f"{name} 페이지 오류: {e}")
        
        return True
        
    except ImportError:
        print_warning("requests 모듈이 없어 접속 테스트를 건너뜁니다.")
        return True

# ============================================
# Phase 2: 상태 파일 초기화
# ============================================

def reset_state_on_startup() -> bool:
    """프로그램 시작 시 state.json 파일 초기화"""
    logger.info("0단계: 상태 파일 초기화")
    print("\n🔄 0단계: 상태 파일 초기화")
    
    try:
        # state.json 파일 경로 설정
        state_file = Path("tetris/state.json")
        
        # 초기 상태 생성
        initial_state = {
            'system': {
                'status': 'idle',
                'last_updated': datetime.now().isoformat(),
                'version': '1.0.0'
            },
            'sessions': {},
            'processing': {
                'current_scenario': None,
                'progress': 0,
                'status': 'idle',
                'started_at': None,
                'completed_at': None
            },
            'upload': {
                'uploaded_file': None,
                'image_path': None,
                'image_data_url': None,
                'people_count': 0,
                'scenario': None
            },
            'hardware': {
                'arduino_connected': False,
                'motor_status': 'idle',
                'last_command': None
            },
            'notifications': []
        }
        
        # 새로운 초기 state.json 파일 생성
        with open(state_file, 'w', encoding='utf-8') as f:
            import json
            json.dump(initial_state, f, ensure_ascii=False, indent=2)
        
        print_success("state.json 파일 초기화 완료")
        logger.info("State file initialized successfully")
        return True
        
    except Exception as e:
        print_error(f"상태 파일 초기화 실패: {e}")
        return False

# ============================================
# Phase 3: 메인 실행 함수 - 최적화
# ============================================

def main():
    """메인 실행 함수"""
    ap = argparse.ArgumentParser(description="AI TETRIS launcher")
    ap.add_argument("--mode", choices=["web"], default="web", help="실행 모드 (웹 모드만 지원)")
    ap.add_argument("--port", type=int, default=5002)
    ap.add_argument("--no-reset", action="store_true", help="상태 파일 초기화 건너뛰기")
    ap.add_argument("--no-browser", action="store_true", help="브라우저 자동 열기 건너뛰기")
    args = ap.parse_args()
    
    try:
        # 0단계: 상태 파일 초기화 (기본적으로 활성화)
        if not args.no_reset:
            if not reset_state_on_startup():
                print_error("상태 파일 초기화에 실패했습니다.")
                return
        else:
            logger.info("상태 파일 초기화를 건너뜁니다.")
            print("\n⚠️ 상태 파일 초기화를 건너뜁니다.")
        
        # 1단계: 필수 조건 확인
        if not check_prerequisites():
            print_error("필수 조건을 만족하지 않습니다.")
            return
        
        # 2단계: 설정 확인
        config_ok, port, host = test_config_loading()
        if not config_ok:
            print_error("설정 시스템에 문제가 있습니다.")
            return
        
        # 3단계: TETRIS 시스템 실행 (직접 호출)
        server_thread, server_ready = launch_tetris_direct(args.port if port is None else port)
        
        if not server_ready:
            print_error("서버 시작에 실패했습니다.")
            return
        
        # 4단계: 웹 접속 확인
        if verify_web_access(port):
            logger.info("TETRIS 시스템이 성공적으로 실행되었습니다!")
            print("\n🎉 TETRIS 시스템이 성공적으로 실행되었습니다!")
            
            # URL 출력 (중복 코드 제거)
            print_urls(port)
            
            print(f"\n💡 웹 브라우저에서 위 주소 중 하나로 접속하세요!")
            
            # 브라우저 자동 열기 (옵션)
            if not args.no_browser:
                logger.info("브라우저 자동 열기 시도")
                print("\n🌐 기본 브라우저를 열고 있습니다...")
                open_browser(f"http://127.0.0.1:{port}/desktop/control")
            
            print("\n🛑 시스템을 종료하려면 Ctrl+C를 누르세요.")
            
            try:
                # 서버 스레드 유지 (메인 스레드 대기)
                server_thread.join()
            except KeyboardInterrupt:
                logger.info("사용자가 종료를 요청했습니다.")
                print("\n🛑 사용자가 종료를 요청했습니다.")
                print_success("TETRIS 시스템이 종료되었습니다.")
        else:
            print_error("웹 접속 확인에 실패했습니다.")
            
    except TetrisLaunchError:
        logger.error("런처 실행 중 오류 발생")
        return
    except KeyboardInterrupt:
        logger.info("사용자가 중단했습니다.")
        print("\n🛑 사용자가 중단했습니다.")
    except Exception as e:
        handle_error(e, "예상치 못한 오류 발생")

if __name__ == "__main__":
    main()
