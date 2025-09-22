# control/routes.py - Control screen routing (HTTP API + SSE hybrid)
import json
import logging
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
import qrcode  # pip install qrcode[pil]
from io import BytesIO

from flask import Response, jsonify, render_template, request, session, make_response

# Path configuration
current_dir = Path(__file__).parent
web_interface_dir = current_dir.parent
sys.path.insert(0, str(web_interface_dir))

# Simplified imports
from source.utils import get_global_status, update_status

from .control_utils import (
    create_processing_steps,
    format_system_status,
    generate_qr_data,
    get_connection_info,
    log_control_action,
    validate_processing_request,
)

logger = logging.getLogger(__name__)

# 전역 세션 및 진행 상태 관리 (HTTP + SSE 하이브리드)
session_progress = {}  # 세션별 진행 상태
session_connections = set()  # 활성 세션 목록
session_metadata = {}  # 세션 메타데이터

# Blueprint 참조를 위해 동적 import
from . import control_bp

# 서버 URL 생성 함수
def _server_url():
    """서버 URL 생성"""
    from .control_utils import get_connection_info
    conn_info = get_connection_info()
    return conn_info['mobile_url']

# 세션 관리 함수들
def register_session(session_id, session_type='desktop'):
    """세션 등록"""
    session_connections.add(session_id)
    session_metadata[session_id] = {
        'type': session_type,
        'created_at': datetime.now().isoformat(),
        'last_activity': datetime.now().isoformat()
    }
    logger.info(f"세션 등록됨: {session_id} ({session_type})")

def update_session_activity(session_id):
    """세션 활동 업데이트"""
    if session_id in session_metadata:
        session_metadata[session_id]['last_activity'] = datetime.now().isoformat()

def update_progress_stream(session_id, data):
    """세션별 진행 상태 업데이트 (SSE용)"""
    session_progress[session_id] = {
        **data,
        'timestamp': time.time(),
        'session_id': session_id
    }
    update_session_activity(session_id)
    logger.info(f"진행 상태 업데이트: {session_id} - {data}")

def get_session_progress(session_id):
    """세션별 진행 상태 조회"""
    return session_progress.get(session_id)

def get_active_sessions():
    """활성 세션 목록 조회"""
    return {
        'sessions': list(session_connections),
        'metadata': session_metadata,
        'total': len(session_connections)
    }

@control_bp.route('/control')
def desktop_control():
    """데스크탑 관제 화면"""
    session_id = str(uuid.uuid4())
    session['session_id'] = session_id
    get_global_status()['session_id'] = session_id
    
    # 세션 등록
    register_session(session_id, 'desktop')
    
    update_status(status='connected', message='데스크탑 연결됨')
    
    return render_template('desktop/control.html', 
                         qr_code="QR_CODE_PLACEHOLDER", 
                         local_ip="192.168.1.100",
                         mobile_url="http://192.168.1.100:5002/mobile/input")


@control_bp.route('/api/status')
def get_status():
    """시스템 상태 조회 API (폴링용)"""
    return jsonify({
        'success': True,
        'data': get_global_status().copy()
    })

@control_bp.route('/api/progress_stream')
def progress_stream():
    """진행 상태 SSE 스트림 (하이브리드 방식)"""
    session_id = request.args.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    if session_id not in session_connections:
        return jsonify({'error': 'Invalid session ID'}), 400
    
    def generate():
        # SSE 헤더 설정
        yield f"data: {json.dumps({'event': 'connected', 'session_id': session_id})}\n\n"
        
        # 세션별 진행 상태 스트림
        while True:
            try:
                # 세션별 진행 상태 조회
                progress_data = get_session_progress(session_id)
                if progress_data:
                    yield f"data: {json.dumps(progress_data)}\n\n"
                else:
                    # 기본 상태 전송
                    global_status = get_global_status().copy()
                    global_status['session_id'] = session_id
                    yield f"data: {json.dumps(global_status)}\n\n"
                
                time.sleep(0.5)  # 0.5초마다 업데이트
                
            except Exception as e:
                logger.error(f"SSE 스트림 오류: {e}")
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                break
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    )

@control_bp.route('/api/start_processing', methods=['POST'])
def start_processing():
    """AI 처리 시작 (HTTP API + SSE 하이브리드)"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID required'}), 400
        
        if session_id not in session_connections:
            return jsonify({'success': False, 'error': 'Invalid session ID'}), 400
        
        # 처리 시뮬레이션 (SSE로 진행 상태 전송)
        def simulate_processing():
            steps = [
                (10, 'analyzing', '이미지 분석 중...'),
                (30, 'processing', 'AI 처리 중...'),
                (60, 'generating', '결과 생성 중...'),
                (90, 'finalizing', '최종 처리 중...'),
                (100, 'completed', '처리 완료!')
            ]
            
            for progress, status, message in steps:
                # SSE로 진행 상태 전송
                update_progress_stream(session_id, {
                    'event': 'progress_update',
                    'progress': progress,
                    'status': status,
                    'message': message
                })
                time.sleep(2)  # 2초마다 단계 진행
        
        # 백그라운드에서 처리 실행
        thread = threading.Thread(target=simulate_processing)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'AI 처리가 시작되었습니다.',
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"처리 시작 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/api/reset', methods=['POST'])
def reset_system():
    """시스템 초기화"""
    from ..source.utils import reset_global_status
    reset_global_status()
    
    return jsonify({
        'success': True,
        'message': '시스템이 초기화되었습니다.'
    })

# 새로운 HTTP API 엔드포인트들
@control_bp.route('/api/join_session', methods=['POST'])
def join_session():
    """세션 참여 (HTTP API)"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        session_type = data.get('type', 'desktop')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID required'}), 400
        
        # 세션 등록
        register_session(session_id, session_type)
        
        return jsonify({
            'success': True,
            'message': '세션에 참여했습니다.',
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"세션 참여 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/api/sessions', methods=['GET'])
def get_sessions():
    """활성 세션 목록 조회 (HTTP API)"""
    try:
        sessions_info = get_active_sessions()
        return jsonify({
            'success': True,
            'data': sessions_info
        })
    except Exception as e:
        logger.error(f"세션 목록 조회 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/api/session/<session_id>/progress', methods=['GET'])
def get_session_progress_api(session_id):
    """특정 세션의 진행 상태 조회 (HTTP API)"""
    try:
        if session_id not in session_connections:
            return jsonify({'success': False, 'error': 'Invalid session ID'}), 400
        
        progress_data = get_session_progress(session_id)
        return jsonify({
            'success': True,
            'data': progress_data
        })
    except Exception as e:
        logger.error(f"세션 진행 상태 조회 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/api/trigger_hardware', methods=['POST'])
def trigger_hardware():
    """하드웨어 제어 (HTTP API)"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        command = data.get('command')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID required'}), 400
        
        if session_id not in session_connections:
            return jsonify({'success': False, 'error': 'Invalid session ID'}), 400
        
        # 하드웨어 제어 로직 (기존 rpi_controller 사용)
        # 여기서는 시뮬레이션으로 처리
        update_progress_stream(session_id, {
            'event': 'hardware_start',
            'message': '하드웨어 제어 시작',
            'command': command
        })
        
        return jsonify({
            'success': True,
            'message': '하드웨어 제어 명령이 전송되었습니다.',
            'command': command
        })
        
    except Exception as e:
        logger.error(f"하드웨어 제어 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# QR 이미지 생성 라우트
@control_bp.route("/qr.png")
def qr_png():
    """QR 코드 이미지 생성"""
    try:
        url = _server_url()
        qr = qrcode.QRCode(box_size=10, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        
        resp = make_response(buf.getvalue())
        resp.headers["Content-Type"] = "image/png"
        return resp
        
    except Exception as e:
        logger.error(f"QR 코드 생성 오류: {e}")
        return jsonify({'error': 'QR 코드 생성 실패'}), 500
