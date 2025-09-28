# user_utils.py - 사용자 영역 전용 유틸리티 함수
# 공통 함수들은 base/common_utils.py에서 import하여 사용

from base.common_utils import (
    format_upload_response,
    format_status_info,
    log_action
)

# 사용자 영역 전용 래퍼 함수들 (기존 호환성 유지)
def get_mobile_status_info(session_data):
    """모바일 상태 정보 반환 (기존 호환성)"""
    return format_status_info(session_data, "mobile")

def log_user_action(action: str, session_id: str, details=None):
    """사용자 액션 로깅 (기존 호환성)"""
    log_action(action, "user", session_id, details)
