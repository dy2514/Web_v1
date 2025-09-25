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
from source.api_utils import APIResponse, log_api_request, log_api_response, validate_file_upload
from source.file_handler import save_uploaded_file
from source.utils import update_status

from .input_handler import create_input_handler
from .user_utils import format_upload_response, get_mobile_status_info, log_user_action

logger = logging.getLogger(__name__)

# Blueprint 참조를 위해 동적 import
from . import user_bp

@user_bp.route('/input')
def mobile_input():
    """모바일 입력 수집 페이지"""
    session_id = str(uuid.uuid4())
    session['session_id'] = session_id
    update_status(status='mobile_connected', message='모바일 연결됨')
    
    # 세션 등록 (control 모듈의 함수 사용)
    try:
        from ..control.routes import register_session
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
    
    try:
        # 파일 검증
        if 'photo' not in request.files:
            error_msg = "업로드할 파일이 선택되지 않았습니다. 'photo' 필드가 누락되었습니다."
            logger.error(f"[에러] 파일 업로드 실패: {error_msg}")
            return APIResponse.error(error_msg, "NO_FILE", 400)
        
        file = request.files['photo']
        people_count = request.form.get('people_count', '0')
        session_id = request.form.get('session_id')
        
        logger.info(f"업로드 파일 정보 - 파일명: {file.filename}, 크기: {file.content_length if hasattr(file, 'content_length') else 'unknown'}, 세션: {session_id}")
        
        if file.filename == '':
            error_msg = "파일이 선택되지 않았습니다. 이미지를 선택해주세요."
            logger.error(f"[에러] 파일 업로드 실패: {error_msg}")
            return APIResponse.error(error_msg, "NO_FILE", 400)
        
        # 중앙 설정을 사용하여 업로드 제한 일치
        try:
            from  web_interface.source.simple_config import get_config
        except Exception as import_error:
            logger.error(f"[에러] 상대 import 실패, 절대 import 시도: {import_error}")
            import sys
            import os
            # Web_v1 디렉토리를 Python 경로에 추가
            web_v1_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
            if web_v1_path not in sys.path:
                sys.path.insert(0, web_v1_path)
            try:
                from web_interface.source.simple_config import get_config
            except Exception as abs_import_error:
                logger.error(f"[에러] 절대 import도 실패: {abs_import_error}")
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
            
            logger.info(f"[성공] 이미지 데이터 처리 완료 - MIME: {mime}, 크기: {len(image_data)} bytes")
            
        except Exception as process_error:
            error_msg = f"이미지 처리 중 오류가 발생했습니다: {str(process_error)}"
            logger.error(f"[에러] 이미지 처리 실패: {process_error}", exc_info=True)
            return APIResponse.error(error_msg, "PROCESS_ERROR", 500)
        
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
        except Exception as status_error:
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
        return APIResponse.success(response_data, "파일이 성공적으로 업로드되었습니다")
        
    except Exception as e:
        error_msg = f"파일 업로드 중 예상치 못한 오류가 발생했습니다: {str(e)}"
        logger.error(f"[에러] 파일 업로드 예외 발생: {e}", exc_info=True)
        
        # 상태 업데이트 시도 (실패해도 무시)
        try:
            update_status(status='error', message=error_msg)
        except:
            pass
        
        log_api_response('/api/upload', 500, str(e))
        return APIResponse.server_error(error_msg)

@user_bp.route('/progress')
def progress():
    """진행률 페이지"""
    return render_template('mobile/progress.html')
