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
    log_api_request('/api/upload', 'POST')
    
    try:
        # 파일 검증
        if 'photo' not in request.files:
            return APIResponse.error("No file provided", "NO_FILE", 400)
        
        file = request.files['photo']
        people_count = request.form.get('people_count', '0')
        session_id = request.form.get('session_id')
        
        if file.filename == '':
            return APIResponse.error("No file selected", "NO_FILE", 400)
        
        # 중앙 설정을 사용하여 업로드 제한 일치
        try:
            from ..source.config_manager import get_config
        except Exception:
            from tetris.web_interface.source.config_manager import get_config  # type: ignore
        cfg = get_config()
        allowed_extensions = set(cfg['upload']['ALLOWED_EXTENSIONS'])
        max_size = int(cfg['upload']['MAX_FILE_SIZE'])
        
        validation_error = validate_file_upload(file, allowed_extensions, max_size)
        if validation_error:
            return validation_error
        
        # 파일 저장
        filename, filepath = save_uploaded_file(file)
        
        # 상태 업데이트: AI 체인이 기대하는 필드 채움
        import base64, mimetypes
        mime, _ = mimetypes.guess_type(filename)
        if not mime:
            mime = 'application/octet-stream'
        with open(filepath, 'rb') as f:
            image_data_url = 'data:{};base64,'.format(mime) + base64.b64encode(f.read()).decode('utf-8')
        scenario = f"items_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        update_status(
            progress=25,
            status='uploaded',
            message='파일 업로드 완료',
            uploaded_file=True,
            people_count=int(people_count),
            image_path=filepath,
            image_data_url=image_data_url,
            scenario=scenario
        )
        
        # 응답 생성
        response_data = {
            'filename': filename,
            'people_count': int(people_count),
            'upload_time': datetime.now().isoformat(),
            'scenario': scenario
        }
        
        log_api_response('/api/upload', 200, "File uploaded successfully")
        return APIResponse.success(response_data, "File uploaded successfully")
        
    except Exception as e:
        logger.error(f"파일 업로드 오류: {e}")
        update_status(status='error', message=f'업로드 오류: {str(e)}')
        log_api_response('/api/upload', 500, str(e))
        return APIResponse.server_error(f"Upload failed: {str(e)}")
