# user/routes.py - User input routing
import logging
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

from flask import jsonify, render_template, request, session

# Path configuration
current_dir = Path(__file__).parent
web_interface_dir = current_dir.parent
sys.path.insert(0, str(web_interface_dir))

# Simplified imports
from base.api_utils import APIResponse, log_api_request, log_api_response
from base.file_handler import save_uploaded_file
from web_interface.base.state_manager import update_status
from web_interface.base.error_handler import (
    handle_tetris_error, handle_generic_error, create_success_response,
    validate_required_fields, validate_file_upload, validate_people_count,
    ValidationError, StateError
)

from .user_utils import format_upload_response, get_mobile_status_info, log_user_action

logger = logging.getLogger(__name__)

# Blueprint import
from . import user_bp

@user_bp.route('/')
@user_bp.route('/home')
def mobile_home():
    """모바일 홈 페이지 - 분석 중지"""
    try:
        # 진행 중인 분석이 있다면 중지
        from control.routes import stop_all_analysis
        from web_interface.base.state_manager import state_manager
        
        # 분석 상태 확인 (더 포괄적으로 체크)
        current_status = state_manager.get('processing.status', 'idle')
        system_status = state_manager.get('system.status', 'idle')
        progress = state_manager.get('processing.progress', 0)
        
        # 분석이 진행 중인지 확인 (더 넓은 조건)
        is_analysis_running = (
            current_status in ['running', 'processing'] or
            system_status in ['running', 'processing', '사용자 입력 분석', '최적 배치 생성', '시트 동작 계획', '최적 배치 생성'] or
            (progress > 0 and progress < 100)
        )
        
        # 항상 분석 중지 (상태와 관계없이)
        logger.info(f"[이탈] 홈 페이지 진입으로 인한 분석 중지 (상태: {current_status}, 시스템: {system_status}, 진행률: {progress}%)")
        stop_all_analysis()
        
        # 모든 분석 관련 상태 강제 초기화
        state_manager.set('processing.status', 'idle')
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.current_scenario', None)
        state_manager.set('processing.started_at', None)
        state_manager.set('processing.completed_at', None)
        state_manager.set('current_step', 0)
        state_manager.set('analysis_result', {})
        state_manager.set('processed_results', {})
        state_manager.set('step_times', {})
        state_manager.set('total_elapsed', 0)
        state_manager.set('system.status', 'idle')
        
        # 업로드 관련 데이터 초기화
        state_manager.set('upload.uploaded_file', None)
        state_manager.set('upload.image_path', None)
        state_manager.set('upload.image_data_url', None)
        state_manager.set('upload.people_count', 0)
        state_manager.set('upload.scenario', None)
        
        # 알림 초기화
        state_manager.set('notifications', [])
        
        logger.info("[완료] 홈 페이지 진입으로 인한 분석 중지 및 상태 초기화 완료")
            
    except Exception as e:
        logger.warning(f"홈 페이지 진입 시 분석 중지 실패: {e}")
    
    session_id = str(uuid.uuid4())
    session['session_id'] = session_id
    update_status(status='mobile_connected', message='모바일 홈 화면 접속')
    
    # 세션 등록 (control 모듈의 함수 사용)
    try:
        from control.routes import register_session
        register_session(session_id, 'mobile')
    except ImportError:
        # 직접 경로 추가
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from control.routes import register_session
        register_session(session_id, 'mobile')
    
    return render_template('mobile/home.html')

@user_bp.route('/input')
def mobile_input():
    """모바일 입력 수집 페이지"""
    session_id = str(uuid.uuid4())
    session['session_id'] = session_id
    update_status(status='mobile_connected', message='모바일 연결됨')
    
    # 세션 등록 (control 모듈의 함수 사용)
    try:
        from control.routes import register_session
        register_session(session_id, 'mobile')
    except ImportError:
        # 직접 경로 추가
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from control.routes import register_session
        register_session(session_id, 'mobile')
    
    return render_template('mobile/input.html')

@user_bp.route('/api/upload', methods=['POST'])
def upload_file():
    """파일 업로드 API - 표준화된 응답 형식"""
    log_api_request('/mobile/api/upload', 'POST')
    
    # 요청 정보 로깅
    logger.info(f"[시작] 업로드 요청 시작 - Content-Type: {request.content_type}, Files: {list(request.files.keys())}")
    logger.info(f"[요청 데이터] Form data: {dict(request.form)}")
    
    try:
        # 필수 필드 검증 (people_count는 선택적)
        validate_required_fields(request.files, ['photo'])
        
        file = request.files['photo']
        people_count = validate_people_count(request.form.get('people_count', '0'))
        session_id = request.form.get('session_id')
        
        logger.info(f"업로드 파일 정보 - 파일명: {file.filename}, 크기: {file.content_length if hasattr(file, 'content_length') else 'unknown'}, 세션: {session_id}, 인원수: {people_count}")
        
        # 파일 검증
        validate_file_upload(file, {'png', 'jpg', 'jpeg', 'webp'}, 5 * 1024 * 1024)  # 5MB
        
        # 중앙 설정을 사용하여 업로드 제한 일치 (config_manager 사용)
        try:
            from web_interface.base.config_manager import get_config
            logger.info("설정 로드: config_manager 사용")
        except Exception as import_error:
            logger.warning(f"config_manager 상대 import 실패, 절대 import 시도: {import_error}")
            import sys
            import os
            # Web_v1 디렉토리를 Python 경로에 추가
            web_v1_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
            if web_v1_path not in sys.path:
                sys.path.insert(0, web_v1_path)
            try:
                from web_interface.base.config_manager import get_config
                logger.info("설정 로드: 절대 경로 config_manager 사용")
            except Exception as abs_import_error:
                logger.error(f"[에러] config_manager 절대 import도 실패: {abs_import_error}")
                # 기본 설정 사용
                def get_config():
                    return {
                        'upload': {
                            'ALLOWED_EXTENSIONS': {'jpg', 'jpeg', 'png', 'gif', 'webp'},
                            'MAX_FILE_SIZE': 10 * 1024 * 1024  # 10MB
                        }
                    }
        
        cfg = get_config()
        allowed_extensions = set(cfg['upload']['ALLOWED_EXTENSIONS'])
        max_size = int(cfg['upload']['MAX_FILE_SIZE'])
        
        logger.info(f"업로드 설정 - 허용 확장자: {allowed_extensions}, 최대 크기: {max_size} bytes")
        
        validation_error = validate_file_upload(file, allowed_extensions, max_size)
        if validation_error:
            logger.error(f"[에러] 파일 검증 실패: {validation_error}")
            return validation_error
        
        # 파일 저장
        try:
            filename, filepath = save_uploaded_file(file)
            logger.info(f"[성공] 파일 저장 성공 - 파일명: {filename}, 경로: {filepath}")
        except Exception as save_error:
            error_msg = f"파일 저장 중 오류가 발생했습니다: {str(save_error)}"
            logger.error(f"[에러] 파일 저장 실패: {save_error}", exc_info=True)
            return APIResponse.error(error_msg, "SAVE_ERROR", 500)
        
        # 상태 업데이트: AI 체인이 기대하는 필드 채움
        try:
            import base64, mimetypes
            mime, _ = mimetypes.guess_type(filename)
            if not mime:
                mime = 'application/octet-stream'
            with open(filepath, 'rb') as f:
                image_data = f.read()
                image_data_url = 'data:{};base64,'.format(mime) + base64.b64encode(image_data).decode('utf-8')
            
            logger.info(f"[성공] 이미지 최적 배치 생성 완료 - MIME: {mime}, 크기: {len(image_data)} bytes")
            
        except Exception as process_error:
            logger.error(f"[에러] 이미지 처리 실패: {process_error}", exc_info=True)
            return handle_generic_error(process_error)
        
        scenario = f"items_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # 상태 업데이트
        try:
            update_status(
                current_step=0,
                progress=0,
                status='uploaded',
                message='파일 업로드 완료',
                uploaded_file=True,
                people_count=int(people_count),
                image_path=filepath,
                image_data_url=image_data_url,
                scenario=scenario
            )
            logger.info(f"[성공] 상태 업데이트 완료 - 시나리오: {scenario}, 인원수: {people_count}")
        except StateError as status_error:
            logger.warning(f"[경고] 상태 업데이트 실패: {status_error}")
            # 상태 업데이트 실패는 업로드 자체를 실패로 처리하지 않음
        
        # 응답 생성
        response_data = {
            'filename': filename,
            'people_count': int(people_count),
            'upload_time': datetime.now().isoformat(),
            'scenario': scenario
        }
        
        # logger.info(f"[성공] 업로드 성공 - 파일: {filename}, 시나리오: {scenario}")
        log_api_response('/mobile/api/upload', 200, "File uploaded successfully")
        return create_success_response(response_data, "파일이 성공적으로 업로드되었습니다")
        
    except ValidationError as e:
        logger.error(f"[에러] 검증 오류: {e}")
        return handle_tetris_error(e)
    except StateError as e:
        logger.error(f"[에러] 상태 관리 오류: {e}")
        return handle_tetris_error(e)
    except Exception as e:
        logger.error(f"[에러] 파일 업로드 예외 발생: {e}", exc_info=True)
        return handle_generic_error(e)

@user_bp.route('/progress')
def progress():
    """진행률 페이지 - 분석 내용 초기화"""
    try:
        from web_interface.base.state_manager import state_manager
        from control.routes import stop_all_analysis
        
        # 진행 중인 분석이 있다면 중지
        current_status = state_manager.get('processing.status', 'idle')
        if current_status in ['running', 'processing']:
            logger.info("[진입] Progress 페이지 진입으로 인한 이전 분석 중지")
            stop_all_analysis()
        
        # 모든 분석 관련 상태 강제 초기화
        state_manager.set('processing.current_scenario', None)
        state_manager.set('processing.progress', 0)
        state_manager.set('processing.status', 'idle')
        state_manager.set('processing.started_at', None)
        state_manager.set('processing.completed_at', None)
        state_manager.set('current_step', 0)
        state_manager.set('analysis_result', {})
        state_manager.set('processed_results', {})
        state_manager.set('step_times', {})
        state_manager.set('total_elapsed', 0)
        state_manager.set('system.status', 'idle')
        
        # 알림 초기화
        state_manager.set('notifications', [])
        
        state_manager.add_notification('새로운 분석을 시작합니다', 'info')
        
        logger.info("Progress 페이지 진입 - 분석 내용 초기화 완료")
        
    except Exception as e:
        logger.warning(f"Progress 페이지 진입 시 상태 초기화 실패: {e}")
    
    return render_template('mobile/progress.html')
