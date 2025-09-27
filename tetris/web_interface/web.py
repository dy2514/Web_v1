#!/usr/bin/env python3
"""
TETRIS Web Interface - Main web server
Blueprint-based modular structure (WebSocket removed for simplicity)
"""
import logging
import sys
from datetime import datetime
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, request, send_from_directory

# 로깅 설정 - 에러 로그 표시를 위해 개선
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
logger.info("로깅 시스템 초기화 완료")

# Simplified configuration loading
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_config

config = get_config()

# Flask 앱 초기화
app = Flask(__name__, 
            template_folder=str(Path(__file__).parent / 'base' / 'templates'),
            static_folder=str(Path(__file__).parent / 'base' / 'static'))
app.config['SECRET_KEY'] = config['web']['SECRET_KEY']

# Blueprint 등록 - 단순화된 import
from control import control_bp
from user import user_bp

app.register_blueprint(control_bp)
app.register_blueprint(user_bp)

# 네트워크 접근 제어 미들웨어
@app.before_request
def check_network_access():
    """네트워크 접근 권한 확인"""
    try:
        from utils.network_manager import check_client_access
        if not check_client_access(request):
            logger.warning(f"접근 거부된 IP: {request.remote_addr}")
            abort(403)
    except Exception as e:
        logger.error(f"네트워크 접근 제어 오류: {e}")
        # 오류 발생시 접근 허용 (보안보다 안정성 우선)

@app.route('/')
def index():
    """메인 페이지 - 관제 화면으로 리다이렉트"""
    return redirect('/desktop/control')

@app.route('/static/<path:filename>')
def static_files(filename):
    """정적 파일 서빙"""
    return send_from_directory(str(Path(__file__).parent / 'base' / 'static'), filename)

@app.route('/api/system/performance')
def system_performance():
    """시스템 성능 정보 API (performance_monitor 사용)"""
    try:
        from utils.performance_monitor import get_performance_monitor
        monitor = get_performance_monitor()
        stats = monitor.get_metrics_summary()
        return jsonify({
            'success': True,
            'data': stats,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"성능 정보 조회 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# WebSocket 기능 제거됨 - HTTP + SSE만 사용

if __name__ == '__main__':
    print("TETRIS Web Interface - 라즈베리파이5 최적화 버전 (HTTP + SSE)")
    print("모바일 접속: http://localhost:5002/mobile/input")
    print("데스크탑 접속: http://localhost:5002/desktop/control")
    print("상태 API: http://localhost:5002/api/status")
    print("=" * 60)
    
    # 성능 모니터링 시작 (라즈베리파이5 최적화 설정)
    try:
        from utils.performance_monitor import start_performance_monitoring
        if start_performance_monitoring(interval=60):  # 간격 늘림
            print("성능 모니터링 시작됨 (라즈베리파이5 최적화)")
        else:
            print("성능 모니터링 시작 실패")
    except Exception as e:
        print(f"성능 모니터링 오류: {e}")
    
    # 통합 설정을 사용한 웹 서버 실행
    app.run(
        host=config['web']['HOST'],
        port=config['web']['PORT'],
        debug=config['web']['DEBUG'],
        threaded=config['web']['THREADED'],
        use_reloader=config['web']['USE_RELOADER']
    )
