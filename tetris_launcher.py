#!/usr/bin/env python3
"""
TETRIS 시스템 최종 런처
단계별 검증 후 안정적 실행
"""
import sys
import os
import argparse
import time
import subprocess
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

print("🚀 TETRIS 시스템 최종 런처")
print("=" * 60)

def check_prerequisites():
    """필수 조건 확인"""
    print("📋 1단계: 필수 조건 확인")
    
    # 프로젝트 구조 확인
    tetris_dir = Path("tetris")
    if not tetris_dir.exists():
        print("❌ tetris 디렉토리가 없습니다.")
        return False
    
    tetris_py = tetris_dir / "tetris.py"
    if not tetris_py.exists():
        print("❌ tetris.py 파일이 없습니다.")
        return False
    
    web_dir = tetris_dir / "web_interface"
    if not web_dir.exists():
        print("❌ web_interface 디렉토리가 없습니다.")
        return False
    
    print("✅ 프로젝트 구조 확인 완료")
    
    # Python 모듈 확인
    try:
        import flask
        import PIL
        import langchain
        print("✅ 필수 패키지 확인 완료")
    except ImportError as e:
        print(f"❌ 필수 패키지 누락: {e}")
        return False
    
    return True

def test_config_loading():
    """설정 로딩 테스트 - config_manager.py 사용"""
    print("\n⚙️ 2단계: 설정 시스템 확인")
    
    try:
        # config_manager.py 사용
        sys.path.insert(0, "tetris/web_interface/base")
        from config_manager import get_config
        
        config = get_config()
        
        port = config["web"]["PORT"]
        host = config["web"]["HOST"]
        
        print(f"✅ 웹 서버 설정: {host}:{port}")
        print(f"✅ 비밀키: {'설정됨' if config['web']['SECRET_KEY'] != 'YOUR_SECRET_KEY_HERE' else '미설정'}")
        print(f"✅ 설정 소스: {'환경변수' if 'TETRIS_HOST' in os.environ else 'config.py'}")
        
        return True, port, host
    except Exception as e:
        print(f"❌ 설정 로딩 실패: {e}")
        # 폴백: 기존 config.py 시도
        try:
            sys.path.insert(0, "tetris")
            from config import get_config
            config = get_config()
            
            port = config["web"]["PORT"]
            host = config["web"]["HOST"]
            
            print(f"✅ 폴백 설정 로드 성공: {host}:{port}")
            return True, port, host
        except Exception as fallback_error:
            print(f"❌ 폴백 설정 로딩도 실패: {fallback_error}")
            return False, None, None

def launch_tetris_web(mode, port):
    """TETRIS 웹 시스템 실행"""
    print(f"\n🌐 3단계: TETRIS 웹 시스템 실행 (포트: {port})")
    
    # tetris.py 실행
    cmd = [sys.executable, "tetris/tetris.py", "--mode", mode, "--port", str(port), "--no-browser"]
    
    print("🚀 TETRIS 시스템 시작 중...")
    process = subprocess.Popen(
        cmd, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT, 
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # 실시간 출력 모니터링
    server_ready = False
    output_lines = []
    
    def monitor_output():
        nonlocal server_ready
        for line in iter(process.stdout.readline, ''):
            line = line.strip()
            if line:
                output_lines.append(line)
                print(f"📟 {line}")
                
                # 서버 준비 상태 감지
                if "Running on" in line or "Serving Flask app" in line:
                    server_ready = True
    
    monitor_thread = threading.Thread(target=monitor_output, daemon=True)
    monitor_thread.start()
    
    # 서버 시작 대기
    max_wait = 15  # 15초 대기
    for i in range(max_wait):
        if server_ready:
            print(f"✅ 서버 준비 완료 ({i+1}초)")
            break
        time.sleep(1)
        if i % 3 == 0:
            print(f"⏳ 서버 시작 대기 중... ({i+1}/{max_wait}초)")
    
    return process, server_ready

def verify_web_access(port):
    """웹 접속 확인"""
    print(f"\n🔍 4단계: 웹 접속 확인 (포트: {port})")
    
    try:
        import requests
        
        base_url = f"http://127.0.0.1:{port}"
        
        # 기본 페이지 테스트
        try:
            response = requests.get(base_url, timeout=5, allow_redirects=True)
            print(f"✅ 메인 페이지: {response.status_code}")
        except Exception as e:
            print(f"❌ 메인 페이지 접속 실패: {e}")
            return False
        
        # 주요 페이지들 테스트
        pages = [
            ("/mobile/input", "모바일 입력"),
            ("/desktop/control", "데스크탑 제어"),
        ]
        
        for path, name in pages:
            try:
                response = requests.get(base_url + path, timeout=5)
                print(f"✅ {name} 페이지: {response.status_code}")
            except Exception as e:
                print(f"⚠️ {name} 페이지 오류: {e}")
        
        return True
        
    except ImportError:
        print("⚠️ requests 모듈이 없어 접속 테스트를 건너뜁니다.")
        return True

def reset_state_on_startup():
    """프로그램 시작 시 state.json 파일 초기화"""
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
        
        print("✅ state.json 파일 초기화 완료")
        return True
        
    except Exception as e:
        print(f"❌ 상태 파일 초기화 실패: {e}")
        return False

def main():
    """메인 실행 함수"""

    ap = argparse.ArgumentParser(description="AI TETRIS launcher")
    ap.add_argument("--mode", choices=["web", "scenario"], default="web")
    ap.add_argument("--port", type=int, default=5002)
    ap.add_argument("--no-reset", action="store_true", help="상태 파일 초기화 건너뛰기")
    args = ap.parse_args()
    
    # 0단계: 상태 파일 초기화 (기본적으로 활성화)
    if not args.no_reset:
        if not reset_state_on_startup():
            print("\n❌ 상태 파일 초기화에 실패했습니다.")
            return
    else:
        print("\n⚠️ 상태 파일 초기화를 건너뜁니다.")
    
    # 1단계: 필수 조건 확인
    if not check_prerequisites():
        print("\n❌ 필수 조건을 만족하지 않습니다.")
        return
    
    # 2단계: 설정 확인
    config_ok, port, host = test_config_loading()
    if not config_ok:
        print("\n❌ 설정 시스템에 문제가 있습니다.")
        return
    
    # 3단계: TETRIS 시스템 실행
    process, server_ready = launch_tetris_web(args.mode, args.port if port is None else port)
    
    if not server_ready:
        print("\n❌ 서버 시작에 실패했습니다.")
        process.terminate()
        return
    
    # 4단계: 웹 접속 확인
    if verify_web_access(port):
        print("\n🎉 TETRIS 시스템이 성공적으로 실행되었습니다!")
        print(f"\n📱 웹 접속 주소:")
        print(f"  🏠 메인 페이지: http://127.0.0.1:{port}/")
        print(f"  📱 모바일 입력: http://127.0.0.1:{port}/mobile/input")
        print(f"  🖥️  데스크탑 제어: http://127.0.0.1:{port}/desktop/control")
        
        print(f"\n💡 웹 브라우저에서 위 주소 중 하나로 접속하세요!")
        
        # 자동으로 브라우저 열기
        try:
            print("\n🌐 기본 브라우저를 열고 있습니다...")
            webbrowser.open(f"http://127.0.0.1:{port}/desktop/control")
        except:
            pass
        
        print("\n🛑 시스템을 종료하려면 Ctrl+C를 누르세요.")
        
        try:
            # 서버 프로세스 유지
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 사용자가 종료를 요청했습니다.")
            process.terminate()
            print("✅ TETRIS 시스템이 종료되었습니다.")
    else:
        print("\n❌ 웹 접속 확인에 실패했습니다.")
        process.terminate()

if __name__ == "__main__":
    main()
