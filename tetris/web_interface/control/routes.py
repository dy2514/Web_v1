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
from web_interface.base.state_manager import get_global_status, update_status
from web_interface.base.error_handler import (
    handle_tetris_error, handle_generic_error, create_success_response,
    ValidationError, StateError, ChainError
)

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
analysis_threads = {}  # 분석 스레드 관리
analysis_stop_flags = {}  # 분석 중지 플래그
analysis_abort_controllers = {}  # 분석 AbortController 관리


# Blueprint import
from . import control_bp, api_bp

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

def stop_all_analysis():
    """모든 분석 중지"""
    logger.info("[중지] 모든 분석 중지 요청")
    
    # 모든 AbortController 중지
    for session_id, abort_controller in list(analysis_abort_controllers.items()):
        if abort_controller:
            abort_controller.abort()
            logger.info(f"AbortController 중지: {session_id}")
    
    # 모든 분석 중지 플래그 설정
    for session_id in analysis_stop_flags:
        analysis_stop_flags[session_id] = True
        logger.info(f"분석 중지 플래그 설정: {session_id}")
    
    # 모든 분석 스레드 정리
    for session_id, thread in list(analysis_threads.items()):
        if thread and thread.is_alive():
            logger.info(f"분석 스레드 중지 시도: {session_id}")
            # 스레드는 강제 종료하지 않고 플래그로 중지 신호만 보냄
            # thread.join(timeout=5)  # 5초 대기 후 강제 종료
        del analysis_threads[session_id]
    
    # 중지 플래그 및 AbortController 초기화
    analysis_stop_flags.clear()
    analysis_abort_controllers.clear()
    
    # 상태 강제 초기화 (중지 후 즉시 상태 리셋)
    from web_interface.base.state_manager import state_manager
    state_manager.set('processing.status', 'idle')
    state_manager.set('processing.progress', 0)
    state_manager.set('processing.current_scenario', None)
    state_manager.set('processing.started_at', None)
    state_manager.set('processing.completed_at', None)
    state_manager.set('current_step', 0)
    state_manager.set('system.status', 'idle')
    state_manager.set('analysis_result', {})
    state_manager.set('step_times', {})
    state_manager.set('total_elapsed', 0)
    
    # 업로드 관련 데이터 초기화
    state_manager.set('upload.uploaded_file', None)
    state_manager.set('upload.image_path', None)
    state_manager.set('upload.people_count', 0)
    state_manager.set('upload.scenario', None)
    
    logger.info("[완료] 모든 분석 중지 및 상태 초기화 완료")

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


@api_bp.route('/status')
def get_status():
    """시스템 상태 조회 API (폴링용)"""
    status_data = get_global_status().copy()
    # 호환성: 잘못 중첩된 analysis_result 구조를 평탄화
    try:
        ar = status_data.get('analysis_result')
        if isinstance(ar, dict) and 'analysis_result' in ar and 'chain4_out' not in ar:
            inner = ar.get('analysis_result')
            if isinstance(inner, dict):
                status_data['analysis_result'] = inner
        # 보조 체크를 위해 최종 출력이 있으면 최상위에도 복사
        ar2 = status_data.get('analysis_result')
        if isinstance(ar2, dict) and 'chain4_out' in ar2:
            status_data.setdefault('chain4_out', ar2.get('chain4_out'))
    except Exception:
        pass
    
    # 진행률을 최상위 레벨에 추가 (모바일 호환성)
    if 'processing' in status_data and 'progress' in status_data['processing']:
        status_data['progress'] = status_data['processing']['progress']
    
    # 상태를 최상위 레벨에 추가 (모바일 호환성)
    if 'system' in status_data and 'status' in status_data['system']:
        status_data['status'] = status_data['system']['status']
    
    # done 상태일 때 최상위 레벨에 명시적으로 설정
    if status_data.get('system', {}).get('status') == 'done':
        status_data['status'] = 'done'
    
    # 메시지를 최상위 레벨에 추가 (모바일 호환성)
    notifications = status_data.get('notifications', [])
    if notifications:
        latest_notification = notifications[-1]
        status_data['message'] = latest_notification.get('message', '')
    
    # 분석 결과를 최상위 레벨에 추가 (모바일 호환성)
    if 'analysis_result' in status_data:
        status_data['result'] = status_data['analysis_result']
    
    # 이미지 업로드 상태를 최상위 레벨에 추가 (데스크톱 관제 화면 호환성)
    # uploaded_file 필드를 image_uploaded로도 제공
    if 'uploaded_file' in status_data:
        status_data['image_uploaded'] = status_data['uploaded_file']
    elif 'upload' in status_data and 'uploaded_file' in status_data['upload']:
        status_data['image_uploaded'] = status_data['upload']['uploaded_file']

    return jsonify({
        'success': True,
        'ok': True,  # 모바일 호환성
        'data': status_data
    })

@api_bp.route('/status_stream')
def status_stream():
    """전역 상태 SSE 스트림 (모바일용)"""
    def generate():
        # 초기 연결 신호
        yield f"data: {json.dumps({'event': 'connected'})}\n\n"

        last_sent_steps = set()
        last_status = None
        last_step = None
        last_progress = None
        last_upload_file_status = None  # 업로드 파일 상태 추적
        last_processing_status = None  # 분석 상태 추적
        
        def build_payload() -> dict:
            data = get_global_status().copy()
            # 호환성: analysis_result 중첩 평탄화 및 chain4_out 복사
            try:
                ar = data.get('analysis_result')
                if isinstance(ar, dict) and 'analysis_result' in ar and 'chain4_out' not in ar:
                    inner = ar.get('analysis_result')
                    if isinstance(inner, dict):
                        data['analysis_result'] = inner
                ar2 = data.get('analysis_result')
                if isinstance(ar2, dict) and 'chain4_out' in ar2:
                    data.setdefault('chain4_out', ar2.get('chain4_out'))
            except Exception:
                pass

            # 진행률/상태를 최상위에 노출 (모바일 호환)
            if 'processing' in data and 'progress' in data['processing']:
                data['progress'] = data['processing']['progress']
            if 'processing' in data and 'status' in data['processing']:
                data['status'] = data['processing']['status']
            if data.get('system', {}).get('status') == 'done':
                data['status'] = 'done'

            # 메시지 최신값 반영
            notifications = data.get('notifications', [])
            if notifications:
                latest_notification = notifications[-1]
                data['message'] = latest_notification.get('message', '')
            
            # 이미지 업로드 상태를 최상위 레벨에 추가 (데스크톱 관제 화면 호환성)
            if 'uploaded_file' in data:
                data['image_uploaded'] = data['uploaded_file']
            elif 'upload' in data and 'uploaded_file' in data['upload']:
                data['image_uploaded'] = data['upload']['uploaded_file']
                
            # 업로드 정보를 최상위 레벨에 복사 (클라이언트 호환성)
            if 'upload' in data:
                upload_info = data['upload']
                if upload_info.get('uploaded_file'):
                    data['uploaded_file'] = True
                if upload_info.get('image_path'):
                    data['image_path'] = upload_info['image_path']
                if upload_info.get('people_count') is not None:
                    data['people_count'] = upload_info['people_count']
                if upload_info.get('scenario'):
                    data['scenario'] = upload_info['scenario']
            
            return data

        while True:
            try:
                status_data = build_payload()

                # 현재 완료된 스텝 키 수집
                ar = status_data.get('analysis_result')
                current_steps = set()
                if isinstance(ar, dict):
                    for key in ('chain1_out', 'chain2_out', 'chain3_out', 'chain4_out'):
                        if key in ar:
                            current_steps.add(key)

                new_steps = current_steps - last_sent_steps
                status = status_data.get('status') or status_data.get('system', {}).get('status')
                step_val = status_data.get('current_step') or status_data.get('processing', {}).get('current_step')
                progress_val = status_data.get('progress') or status_data.get('processing', {}).get('progress')
                processing_status = status_data.get('processing', {}).get('status')
                upload_file_status = status_data.get('upload', {}).get('uploaded_file')
                

                should_emit = False
                payload = None

                if new_steps:
                    # 새로 완료된 스텝만 담아 전송
                    payload = status_data.copy()
                    if isinstance(ar, dict):
                        payload_ar = {k: ar[k] for k in new_steps if k in ar}
                        payload['analysis_result'] = payload_ar
                        payload['result'] = payload_ar
                        if 'chain4_out' in payload_ar:
                            payload.setdefault('chain4_out', payload_ar['chain4_out'])
                    last_sent_steps.update(new_steps)
                    should_emit = True

                # 최종/에러 상태 변화 시에도 전송
                if status != last_status and status in ('done', 'error'):
                    if payload is None:
                        payload = status_data
                    should_emit = True
                    last_status = status

                # 진행 단계/진행률 변화 시에도 전송
                if (step_val is not None and step_val != last_step) or (progress_val is not None and progress_val != last_progress):
                    if payload is None:
                        payload = status_data
                    should_emit = True
                    last_step = step_val
                    last_progress = progress_val

                # 분석 상태 변화 시에도 전송
                if processing_status != last_processing_status:
                    if payload is None:
                        payload = status_data
                    should_emit = True
                    last_processing_status = processing_status
                    logger.info(f"[SSE] 분석 상태 변경 감지: {processing_status}")

                # 업로드 파일 상태 변화 시에도 전송 (이미지 업로드 감지)
                if upload_file_status != last_upload_file_status:
                    if payload is None:
                        payload = status_data
                    should_emit = True
                    last_upload_file_status = upload_file_status
                    logger.info(f"[SSE] 파일 업로드 상태 변경 감지: {upload_file_status}")

                if should_emit and payload is not None:
                    yield f"data: {json.dumps(payload)}\n\n"

                time.sleep(0.5)
            except Exception as e:
                logger.error(f"SSE 상태 스트림 오류: {e}")
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

@api_bp.route('/progress_stream')
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
                    
                    # 이미지 업로드 상태를 최상위 레벨에 추가 (데스크톱 관제 화면 호환성)
                    if 'uploaded_file' in global_status:
                        global_status['image_uploaded'] = global_status['uploaded_file']
                    elif 'upload' in global_status and 'uploaded_file' in global_status['upload']:
                        global_status['image_uploaded'] = global_status['upload']['uploaded_file']
                    
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

@api_bp.route('/start_processing', methods=['POST'])
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
                (10, 'analyzing', '사용자 입력 분석 중...'),
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

@api_bp.route('/reset', methods=['POST'])
def reset_system():
    """시스템 초기화 및 분석 중지"""
    try:
        # 요청 소스 확인
        user_agent = request.headers.get('User-Agent', '')
        referer = request.headers.get('Referer', '')
        
        if 'progress' in referer:
            logger.info("[이탈] Progress 페이지 이탈로 인한 분석 중지 요청")
        elif 'home' in referer:
            logger.info("[이탈] 홈 화면 진입으로 인한 분석 중지 요청")
        elif referer:
            logger.info(f"[이탈] 다른 페이지로 이동: {referer}")
        else:
            logger.info("[초기화] 시스템 초기화 및 분석 중지 요청")
        
        # 1. 모든 분석 중지
        stop_all_analysis()
        
        # 2. 상태 초기화
        from base.state_manager import reset_global_status, state_manager
        reset_global_status()
        
        # 3. 모든 분석 관련 필드 강제 초기화
        state_manager.set('current_step', 0)
        state_manager.set('step_times', {})
        state_manager.set('total_elapsed', 0)
        state_manager.set('processing.current_scenario', None)
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.status', 'idle')
        state_manager.set('processing.started_at', None)
        state_manager.set('processing.completed_at', None)
        state_manager.set('analysis_result', {})
        state_manager.set('system.status', 'idle')
        
        # 4. 업로드 관련 데이터 초기화
        state_manager.set('upload.uploaded_file', None)
        state_manager.set('upload.image_path', None)
        state_manager.set('upload.people_count', 0)
        state_manager.set('upload.scenario', None)
        
        # 5. 알림 초기화
        state_manager.set('notifications', [])
        
        logger.info("[완료] 모든 분석 관련 상태 강제 초기화 완료")
        
        logger.info("[완료] 시스템 초기화 및 분석 중지 완료")
        
        return jsonify({
            'success': True,
            'message': '시스템이 초기화되었습니다.'
        })
        
    except Exception as e:
        logger.error(f"[오류] 시스템 초기화 실패: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 새로운 HTTP API 엔드포인트들
@api_bp.route('/join_session', methods=['POST'])
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

@api_bp.route('/sessions', methods=['GET'])
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

@api_bp.route('/session/<session_id>/progress', methods=['GET'])
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

@api_bp.route('/trigger_hardware', methods=['POST'])
def trigger_hardware():
    """하드웨어 제어 (HTTP API) - 배치 코드 처리"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        command = data.get('command')
        placement_code = data.get('placement_code')  # 16자리 배치 코드
        
        if not session_id:
            return jsonify({'success': False, 'error': 'Session ID required'}), 400
        
        # 세션이 등록되지 않은 경우 자동 등록
        if session_id not in session_connections:
            logger.info(f"세션 자동 등록: {session_id}")
            register_session(session_id, 'desktop')
        
        # 저장된 분석 결과에서 placement_code 자동 추출
        if not placement_code:
            global_status = get_global_status()
            analysis_result = global_status.get('analysis_result', {})
            
            if isinstance(analysis_result, dict) and 'chain4_out' in analysis_result:
                placement_code = analysis_result['chain4_out']
                logger.info(f"분석 결과에서 placement_code 자동 추출: {placement_code}")
            else:
                # 분석이 완료되지 않은 경우 기본 배치 코드 사용 (테스트용)
                placement_code = "0000000000000000"  # 16자리 기본값
                logger.warning(f"분석 결과에서 chain4_out을 찾을 수 없습니다. 기본값 사용: {placement_code}")
                # return jsonify({
                #     'success': False, 
                #     'error': '분석 결과에서 배치 코드를 찾을 수 없습니다. 먼저 사용자 입력 분석을 완료해주세요.'
                # }), 400
        
        # 배치 코드 검증
        if placement_code:
            if not isinstance(placement_code, str) or len(placement_code) != 16:
                return jsonify({
                    'success': False, 
                    'error': 'Invalid placement code. Must be 16 characters.'
                }), 400
            
            # 숫자만 허용 (0-3)
            if not all(c.isdigit() and 0 <= int(c) <= 3 for c in placement_code):
                return jsonify({
                    'success': False, 
                    'error': 'Invalid placement code. Must contain only digits 0-3.'
                }), 400
        
        # 하드웨어 제어 시작 알림
        update_progress_stream(session_id, {
            'event': 'hardware_start',
            'message': f'하드웨어 제어 시작 - 배치 코드: {placement_code}',
            'command': command,
            'placement_code': placement_code
        })
        
        # 실제 아두이노 제어 실행
        try:
            import sys
            import os
            # rpi_controller 모듈 경로 추가
            sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'rpi_controller'))
            from rpi_controller import send_automated_command, connect_to_arduinos, arduino_connections
            
            
            # 아두이노 연결 확인 및 연결
            if not arduino_connections:
                connect_to_arduinos()
            
            if placement_code:
                # 배치 코드로 자동 제어
                send_automated_command(placement_code)
                update_progress_stream(session_id, {
                    'event': 'hardware_progress',
                    'message': f'배치 코드 {placement_code} 적용 중...',
                    'progress': 50
                })
            elif command:
                # 기존 명령어 처리
                from rpi_controller.rpi_controller import broadcast_command
                broadcast_command(command)
                update_progress_stream(session_id, {
                    'event': 'hardware_progress',
                    'message': f'명령어 {command} 실행 중...',
                    'progress': 50
                })
            
            # 제어 완료 알림 + 단계 5 반영
            update_progress_stream(session_id, {
                'event': 'hardware_complete',
                'message': '하드웨어 제어가 완료되었습니다.',
                'progress': 100,
                'current_step': 5
            })

            # 전역 상태에도 단계 5로 반영 (모바일/상태 스트림용)
            update_status(current_step=5)
            
        except Exception as hardware_error:
            logger.error(f"하드웨어 제어 실행 오류: {hardware_error}")
            update_progress_stream(session_id, {
                'event': 'hardware_error',
                'message': f'하드웨어 제어 오류: {str(hardware_error)}',
                'error': str(hardware_error)
            })
            return jsonify({
                'success': False, 
                'error': f'Hardware control failed: {str(hardware_error)}'
            }), 500
        
        return jsonify({
            'success': True,
            'message': '하드웨어 제어 명령이 성공적으로 실행되었습니다.',
            'command': command,
            'placement_code': placement_code
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


@api_bp.route('/logs/recent', methods=['GET'])
def get_recent_logs():
    """최신 로그 3개 조회 API"""
    try:
        import os
        import glob
        from datetime import datetime
        
        # log_data 디렉토리 경로
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'tetris_IO', 'log_data')
        
        # 로그 파일 목록 가져오기 (최신순 정렬)
        log_files = glob.glob(os.path.join(log_dir, 'items_*.txt'))
        log_files.sort(key=os.path.getmtime, reverse=True)
        
        # 최신 3개 파일만 선택
        recent_logs = []
        for i, log_file in enumerate(log_files[:3]):
            try:
                # 파일명에서 타임스탬프 추출
                filename = os.path.basename(log_file)
                timestamp_str = filename.replace('items_', '').replace('.txt', '')
                
                # 타임스탬프 파싱
                try:
                    timestamp = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                    formatted_time = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    formatted_time = timestamp_str
                
                # 파일 내용 읽기 (처음 30줄 또는 전체 내용 중 적은 것)
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    # 30줄 또는 전체 내용 중 적은 것 선택
                    content_lines = lines[: len(lines)]
                    content = ''.join(content_lines).strip()
                
                recent_logs.append({
                    'filename': filename,
                    'timestamp': formatted_time,
                    'content': content,
                    'file_path': log_file
                })
                
            except Exception as e:
                logger.warning(f"로그 파일 읽기 실패: {log_file} - {e}")
                continue
        
        return jsonify({
            'success': True,
            'data': {
                'logs': recent_logs,
                'count': len(recent_logs),
                'log_directory': log_dir
            }
        })
        
    except Exception as e:
        logger.error(f"최신 로그 조회 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/step_analysis', methods=['POST'])
def start_step_analysis():
    """단계별 AI 분석 시작"""
    try:
        data = request.get_json()
        people_count = data.get('people_count', 0)
        image_data_url = data.get('image_data_url', '')
        image_path = data.get('image_path', '')
        # 항상 새로운 시나리오 생성 (잔여 데이터로 인한 오표시 방지)
        scenario = f"items_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if not image_data_url:
            return jsonify({'success': False, 'error': '이미지 데이터가 필요합니다'}), 400
        
        # 이미지 데이터 형식 검증
        if image_data_url.startswith('blob:'):
            return jsonify({'success': False, 'error': 'blob URL은 지원되지 않습니다. 이미지를 다시 업로드해주세요.'}), 400
        
        # Base64 형식 또는 유효한 URL인지 확인
        if not (image_data_url.startswith('data:image/') or 
                (image_data_url.startswith('http://') or image_data_url.startswith('https://'))):
            return jsonify({'success': False, 'error': '유효하지 않은 이미지 형식입니다.'}), 400
        
        # 새로운 분석 시작 시 상태 초기화 (중복 데이터 방지)
        update_status(
            status='processing',
            message='분석을 시작합니다...',
            current_step=0,
            analysis_result={},
            **{
                'processing.progress': 0,
                'processing.current_scenario': scenario,
                'upload.scenario': scenario,
                'upload.image_path': image_path,  # 이미지 path 저장
                'upload.people_count': people_count,      # 인원 수 저장
                'processing.sent_steps': {}
            }
        )

        # tetris.py의 단계별 실행 함수 import
        sys.path.insert(0, str(Path(__file__).parent.parent.parent))
        from tetris import run_step_by_step_analysis
        
        # 진행률 콜백 함수
        def progress_callback(progress, status, message, current_step=None):
            update_status(
                progress=progress,
                status=status,
                message=message,
                uploaded_file=True,
                people_count=people_count,
                current_step=current_step
            )
            logger.info(f"단계별 진행률: step={current_step}, {progress}% - {status}: {message}")
            
            # current_step 변경 로깅
            if current_step is not None:
                logger.info(f"상태 변경: current_step = {current_step}")
        
        # 분석 세션 ID 생성
        analysis_session_id = f"analysis_{scenario}_{int(time.time())}"
        analysis_stop_flags[analysis_session_id] = False
        
        # AbortController 생성
        class AbortController:
            def __init__(self):
                self.aborted = False
            
            def abort(self):
                self.aborted = True
                logger.info(f"[중지] AbortController.abort() 호출됨: {analysis_session_id}")
        
        abort_controller = AbortController()
        analysis_abort_controllers[analysis_session_id] = abort_controller
        
        # 백그라운드에서 단계별 분석 실행
        def run_analysis():
            try:
                # 중지 플래그 확인 함수
                def check_stop_flag():
                    return analysis_stop_flags.get(analysis_session_id, False)
                
                logger.info(f"[시작] 분석 시작: {analysis_session_id}")
                
                result = run_step_by_step_analysis(
                    people_count=people_count,
                    image_data_url=image_data_url,
                    scenario=scenario,
                    progress_callback=progress_callback,
                    stop_callback=check_stop_flag,  # 중지 콜백 추가
                    abort_controller=abort_controller  # AbortController 추가
                )
                
                # 중지 플래그 확인
                if check_stop_flag():
                    logger.info(f"[중지] 분석 중지됨: {analysis_session_id}")
                    update_status(
                        status='cancelled',
                        message='분석이 중지되었습니다.',
                        uploaded_file=False
                    )
                    return
                
                # 결과가 중지된 경우인지 확인
                if result.get('status') == 'cancelled':
                    logger.info(f"[중지] 분석 중지됨 (결과): {analysis_session_id}")
                    update_status(
                        status='cancelled',
                        message=result.get('message', '분석이 중지되었습니다.'),
                        uploaded_file=False
                    )
                    return
                
                # 분석 완료 후 상태 업데이트
                update_status(
                    progress=100,
                    status='completed',
                    message='분석이 완료되었습니다!',
                    uploaded_file=True,
                    people_count=people_count,
                    analysis_result=result.get('analysis_result', result),
                    out_path=result.get('out_path'),
                    total_elapsed=result.get('total_elapsed'),
                    step_times=result.get('step_times')
                )
                # processing.status를 completed로 설정 (완료 타임스탬프 포함)
                try:
                    from web_interface.base.state_manager import state_manager
                    state_manager.set_processing_status('completed', 100)
                except Exception as _e:
                    logger.warning(f"processing.status 완료 설정 실패: {_e}")
                
                logger.info(f"[완료] 단계별 분석 완료: {result['out_path']}")
                
            except Exception as e:
                # 중지 플래그 확인
                if analysis_stop_flags.get(analysis_session_id, False):
                    logger.info(f"[중지] 분석 중지됨 (예외 발생): {analysis_session_id}")
                    return
                
                logger.error(f"[오류] 단계별 분석 실패: {e}")
                import traceback
                error_details = traceback.format_exc()
                logger.error(f"상세 오류 정보: {error_details}")
                
                # 오류 상태로 업데이트
                update_status(
                    progress=0,
                    status='error',
                    message=f'분석 실패: {str(e)}',
                    uploaded_file=False,
                    error_details=str(e)
                )
            finally:
                # 스레드 및 AbortController 정리
                if analysis_session_id in analysis_threads:
                    del analysis_threads[analysis_session_id]
                if analysis_session_id in analysis_abort_controllers:
                    del analysis_abort_controllers[analysis_session_id]
                if analysis_session_id in analysis_stop_flags:
                    del analysis_stop_flags[analysis_session_id]
        
        # 별도 스레드에서 실행
        analysis_thread = threading.Thread(target=run_analysis, daemon=True)
        analysis_threads[analysis_session_id] = analysis_thread
        analysis_thread.start()
        
        return jsonify({
            'success': True,
            'message': '단계별 분석이 시작되었습니다',
            'scenario': scenario
        })
        
    except Exception as e:
        logger.error(f"단계별 분석 시작 오류: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
