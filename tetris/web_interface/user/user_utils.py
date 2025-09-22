# user_utils.py - 사용자 영역 전용 유틸리티 함수

import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

def format_upload_response(success: bool, data: Dict[str, Any], errors: list = None) -> Dict[str, Any]:
    """업로드 응답 포맷팅"""
    response = {
        'success': success,
        'timestamp': datetime.now().isoformat()
    }
    
    if success:
        response.update({
            'data': data,
            'message': '파일이 성공적으로 업로드되었습니다.'
        })
    else:
        response.update({
            'error': '; '.join(errors or ['알 수 없는 오류가 발생했습니다.']),
            'message': '업로드에 실패했습니다.'
        })
    
    return response

def validate_mobile_request(request_data: Dict[str, Any]) -> Tuple[bool, str]:
    """모바일 요청 검증"""
    if not request_data.get('photo'):
        return False, "사진이 선택되지 않았습니다."
    
    people_count = request_data.get('people_count')
    if not people_count:
        return False, "인원 수가 입력되지 않았습니다."
    
    return True, "요청 검증 통과"

def generate_upload_summary(data: Dict[str, Any]) -> Dict[str, Any]:
    """업로드 요약 정보 생성"""
    return {
        'filename': data.get('filename', 'N/A'),
        'people_count': data.get('people_count', 0),
        'upload_time': data.get('upload_time', datetime.now().isoformat()),
        'file_size': data.get('file_size', 0),
        'status': 'uploaded'
    }

def create_progress_update(step: int, total_steps: int, message: str) -> Dict[str, Any]:
    """진행상황 업데이트 생성"""
    progress = int((step / total_steps) * 100)
    
    return {
        'progress': progress,
        'step': step,
        'total_steps': total_steps,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }

def get_mobile_status_info(session_data: Dict[str, Any]) -> Dict[str, Any]:
    """모바일 상태 정보 반환"""
    return {
        'session_id': session_data.get('session_id'),
        'upload_status': session_data.get('uploaded_file', False),
        'people_count': session_data.get('people_count', 0),
        'progress': session_data.get('progress', 0),
        'last_activity': datetime.fromtimestamp(
            session_data.get('last_update', time.time())
        ).strftime('%H:%M:%S'),
        'mobile_connected': session_data.get('status') == 'mobile_connected'
    }

def log_user_action(action: str, session_id: str, details: Optional[Dict] = None):
    """사용자 액션 로깅"""
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'session_id': session_id,
        'action': action,
        'details': details or {}
    }
    logger.info(f"User action: {json.dumps(log_data, ensure_ascii=False)}")

def format_error_response(error_message: str, error_code: str = None) -> Dict[str, Any]:
    """오류 응답 포맷팅"""
    response = {
        'success': False,
        'error': error_message,
        'timestamp': datetime.now().isoformat()
    }
    
    if error_code:
        response['error_code'] = error_code
    
    return response

def get_file_preview_info(filepath: str) -> Dict[str, Any]:
    """파일 미리보기 정보 생성"""
    try:
        from pathlib import Path
        path = Path(filepath)
        
        if not path.exists():
            return {'exists': False, 'error': '파일을 찾을 수 없습니다.'}
        
        stat = path.stat()
        file_size_mb = stat.st_size / (1024 * 1024)
        
        return {
            'exists': True,
            'filename': path.name,
            'size_mb': round(file_size_mb, 2),
            'uploaded_at': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        logger.error(f"File preview error: {e}")
        return {'exists': False, 'error': str(e)}

def create_mobile_navigation_data(current_page: str) -> Dict[str, Any]:
    """모바일 네비게이션 데이터 생성"""
    navigation = {
        'current': current_page,
        'pages': {
            'input': {
                'title': '입력',
                'url': '/mobile/input',
                'icon': '📷'
            },
            'progress': {
                'title': '진행상황',
                'url': '/mobile/progress',
                'icon': '⏳'
            },
            'result': {
                'title': '결과',
                'url': '/mobile/result',
                'icon': '✅'
            }
        }
    }
    
    return navigation

def validate_session_timeout(session_data: Dict[str, Any], timeout_minutes: int = 30) -> bool:
    """세션 타임아웃 검증"""
    last_update = session_data.get('last_update', 0)
    current_time = time.time()
    
    # 30분 이상 비활성 상태면 타임아웃
    return (current_time - last_update) > (timeout_minutes * 60)

def get_user_agent_info(user_agent: str) -> Dict[str, str]:
    """사용자 에이전트 정보 파싱"""
    info = {
        'device': 'unknown',
        'browser': 'unknown',
        'os': 'unknown'
    }
    
    user_agent_lower = user_agent.lower()
    
    # 디바이스 감지
    if 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
        info['device'] = 'mobile'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        info['device'] = 'tablet'
    else:
        info['device'] = 'desktop'
    
    # 브라우저 감지
    if 'chrome' in user_agent_lower:
        info['browser'] = 'chrome'
    elif 'firefox' in user_agent_lower:
        info['browser'] = 'firefox'
    elif 'safari' in user_agent_lower:
        info['browser'] = 'safari'
    elif 'edge' in user_agent_lower:
        info['browser'] = 'edge'
    
    # OS 감지
    if 'windows' in user_agent_lower:
        info['os'] = 'windows'
    elif 'mac' in user_agent_lower:
        info['os'] = 'macos'
    elif 'linux' in user_agent_lower:
        info['os'] = 'linux'
    elif 'android' in user_agent_lower:
        info['os'] = 'android'
    elif 'ios' in user_agent_lower:
        info['os'] = 'ios'
    
    return info
