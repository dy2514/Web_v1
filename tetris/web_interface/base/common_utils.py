# common_utils.py - 공통 유틸리티 함수들

import json
import time
import logging
import socket
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# ============================================================================
# 공통 로깅 함수
# ============================================================================

def log_action(action: str, source: str = "system", session_id: str = None, details: Optional[Dict] = None):
    """통합 액션 로깅 함수"""
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'source': source,
        'action': action,
        'details': details or {}
    }
    
    if session_id:
        log_data['session_id'] = session_id
    
    logger.info(f"{source.capitalize()} action: {json.dumps(log_data, ensure_ascii=False)}")

# ============================================================================
# 공통 응답 포맷팅 함수
# ============================================================================

def format_success_response(data: Dict[str, Any], message: str = "성공") -> Dict[str, Any]:
    """성공 응답 포맷팅"""
    return {
        'success': True,
        'data': data,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }

def format_error_response(error_message: str, error_code: str = None, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """오류 응답 포맷팅"""
    response = {
        'success': False,
        'error': error_message,
        'timestamp': datetime.now().isoformat()
    }
    
    if error_code:
        response['error_code'] = error_code
    
    if details:
        response['details'] = details
    
    return response

def format_upload_response(success: bool, data: Dict[str, Any] = None, errors: list = None) -> Dict[str, Any]:
    """업로드 응답 포맷팅"""
    if success:
        return format_success_response(data or {}, "파일이 성공적으로 업로드되었습니다.")
    else:
        return format_error_response(
            '; '.join(errors or ['알 수 없는 오류가 발생했습니다.']),
            details={'upload_failed': True}
        )

# ============================================================================
# 공통 상태 포맷팅 함수
# ============================================================================

def format_status_info(status_data: Dict[str, Any], info_type: str = "general") -> Dict[str, Any]:
    """통합 상태 정보 포맷팅"""
    base_info = {
        'session_id': status_data.get('session_id', 'N/A'),
        'status': status_data.get('status', 'idle'),
        'progress': status_data.get('progress', 0),
        'last_update': datetime.fromtimestamp(
            status_data.get('last_update', time.time())
        ).strftime('%Y-%m-%d %H:%M:%S')
    }
    
    if info_type == "mobile":
        base_info.update({
            'upload_status': status_data.get('uploaded_file', False),
            'people_count': status_data.get('people_count', 0),
            'mobile_connected': status_data.get('status') == 'mobile_connected',
            'last_activity': datetime.fromtimestamp(
                status_data.get('last_update', time.time())
            ).strftime('%H:%M:%S')
        })
    elif info_type == "system":
        base_info.update({
            'message': status_data.get('message', '시스템 준비됨'),
            'uploaded_file': status_data.get('uploaded_file', False),
            'people_count': status_data.get('people_count', 0)
        })
    
    return base_info

# ============================================================================
# 공통 검증 함수
# ============================================================================

def validate_people_count(people_count: Any) -> Tuple[bool, str]:
    """인원 수 검증"""
    if not isinstance(people_count, int):
        return False, "인원 수는 숫자여야 합니다."
    
    if people_count < 0 or people_count > 4:
        return False, "인원 수는 0-4명 사이여야 합니다."
    
    return True, "검증 통과"

def validate_mobile_request(request_data: Dict[str, Any]) -> Tuple[bool, str]:
    """모바일 요청 검증"""
    if not request_data.get('photo'):
        return False, "사진이 선택되지 않았습니다."
    
    people_count = request_data.get('people_count')
    if not people_count:
        return False, "인원 수가 입력되지 않았습니다."
    
    is_valid, message = validate_people_count(people_count)
    if not is_valid:
        return False, message
    
    return True, "요청 검증 통과"

def validate_processing_request(data: Dict[str, Any]) -> Tuple[bool, str]:
    """처리 요청 검증"""
    if not data.get('uploaded_file'):
        return False, "업로드된 파일이 없습니다."
    
    people_count = data.get('people_count', 0)
    is_valid, message = validate_people_count(people_count)
    if not is_valid:
        return False, message
    
    return True, "검증 통과"

# ============================================================================
# 공통 네트워크/연결 함수
# ============================================================================

def get_local_ip() -> str:
    """동적으로 로컬 IP 주소 감지"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            return local_ip
    except Exception:
        return "127.0.0.1"

def get_connection_info() -> Dict[str, str]:
    """연결 정보 반환 (동적 IP 감지)"""
    try:
        hostname = socket.gethostname()
        local_ip = get_local_ip()
    except Exception:
        local_ip = "127.0.0.1"
        hostname = "localhost"
    
    # 포트 동적 감지
    try:
        from config import get_config
        config = get_config()
        port = config['web']['PORT']
    except Exception:
        port = 5002
    
    return {
        'hostname': hostname,
        'local_ip': local_ip,
        'port': port,
        'desktop_url': f"http://{local_ip}:{port}/desktop/control",
        'mobile_url': f"http://{local_ip}:{port}/mobile/input"
    }

def generate_qr_data(local_ip: str = None, port: int = None) -> str:
    """QR 코드용 데이터 생성 (동적 IP 감지)"""
    if local_ip is None:
        local_ip = get_local_ip()
    
    if port is None:
        try:
            from config import get_config
            config = get_config()
            port = config['web']['PORT']
        except Exception:
            port = 5002
    
    return f"http://{local_ip}:{port}/mobile/input"

# ============================================================================
# 공통 데이터 생성 함수
# ============================================================================

def create_processing_steps() -> list:
    """처리 단계 목록 생성"""
    return [
        {'progress': 10, 'status': 'analyzing', 'message': '이미지 분석 중...'},
        {'progress': 30, 'status': 'processing', 'message': 'AI 처리 중...'},
        {'progress': 60, 'status': 'generating', 'message': '결과 생성 중...'},
        {'progress': 90, 'status': 'finalizing', 'message': '최종 처리 중...'},
        {'progress': 100, 'status': 'completed', 'message': '처리 완료!'}
    ]

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

def generate_upload_summary(data: Dict[str, Any]) -> Dict[str, Any]:
    """업로드 요약 정보 생성"""
    return {
        'filename': data.get('filename', 'N/A'),
        'people_count': data.get('people_count', 0),
        'upload_time': data.get('upload_time', datetime.now().isoformat()),
        'file_size': data.get('file_size', 0),
        'status': 'uploaded'
    }

# ============================================================================
# 공통 함수
# ============================================================================

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