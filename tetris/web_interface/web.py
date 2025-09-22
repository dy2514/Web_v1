#!/usr/bin/env python3
"""
TETRIS Web Interface - Main web server
Blueprint-based modular structure + WebSocket support
"""
import asyncio
import logging
import sys
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, request, send_from_directory

# WebSocket optional import
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    print("⚠️  WebSocket support not available - install 'websockets' package for full functionality")

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simplified configuration loading
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_config

config = get_config()

# Flask 앱 초기화
app = Flask(__name__, 
            template_folder=str(Path(__file__).parent / 'source' / 'templates'),
            static_folder=str(Path(__file__).parent / 'source' / 'static'))
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
    return send_from_directory(str(Path(__file__).parent / 'source' / 'static'), filename)

@app.route('/api/system/performance')
def system_performance():
    """시스템 성능 정보 API"""
    try:
        from source.performance_optimizer import get_performance_stats
        stats = get_performance_stats()
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

# WebSocket 서버 시작 함수
def start_websocket_server(host='localhost', port=8765):
    """WebSocket 서버 시작"""
    if not WEBSOCKETS_AVAILABLE:
        logger.warning("WebSocket 모듈이 없어 WebSocket 서버를 시작할 수 없습니다.")
        return False
        
    try:
        from .source.websocket_manager import ws_manager
        
        async def websocket_handler(websocket, path):
            await ws_manager.register_connection(websocket, path)
        
        def run_websocket_server():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            start_server = websockets.serve(websocket_handler, host, port)
            loop.run_until_complete(start_server)
            loop.run_forever()
        
        ws_thread = threading.Thread(target=run_websocket_server, daemon=True)
        ws_thread.start()
        logger.info(f"WebSocket 서버 시작됨: ws://{host}:{port}")
        return True
    except Exception as e:
        logger.error(f"WebSocket 서버 시작 실패: {e}")
        return False

if __name__ == '__main__':
    print("🍓 TETRIS Web Interface - Blueprint 기반 모듈화 버전 + WebSocket")
    print("📱 모바일 접속: http://localhost:5002/mobile/input")
    print("🖥️  데스크탑 접속: http://localhost:5002/desktop/control")
    print("📊 상태 API: http://localhost:5002/desktop/api/status")
    print("📡 WebSocket: ws://localhost:8765")
    print("=" * 60)
    
    # WebSocket 서버 시작
    if start_websocket_server():
        print("🔌 WebSocket 서버 시작됨")
    else:
        print("⚠️  WebSocket 서버 시작 실패")
    
    # 성능 모니터링 시작
    try:
        from source.performance_optimizer import start_performance_monitoring
        if start_performance_monitoring(memory_limit_mb=1024, interval=30):
            print("📈 성능 모니터링 시작됨")
        else:
            print("⚠️  성능 모니터링 시작 실패")
    except Exception as e:
        print(f"⚠️  성능 모니터링 오류: {e}")
    
    # 통합 설정을 사용한 웹 서버 실행
    app.run(
        host=config['web']['HOST'],
        port=config['web']['PORT'],
        debug=config['web']['DEBUG'],
        threaded=config['web']['THREADED'],
        use_reloader=config['web']['USE_RELOADER']
    )
