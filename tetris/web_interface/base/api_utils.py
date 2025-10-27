"""
API 유틸리티 - 표준화된 응답 형식 및 에러 처리
"""
import logging
from typing import Any, Dict, Optional

from flask import jsonify, request

logger = logging.getLogger(__name__)

class APIResponse:
    """표준화된 API 응답 클래스"""
    
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> tuple:
        """성공 응답"""
        response = {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        return jsonify(response), status_code
    
    @staticmethod
    def error(message: str = "Error", error_code: str = "UNKNOWN_ERROR", 
             status_code: int = 400, details: Any = None) -> tuple:
        """에러 응답"""
        response = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details
            },
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        return jsonify(response), status_code
    
    @staticmethod
    def validation_error(errors: Dict[str, str], message: str = "Validation Error") -> tuple:
        """검증 에러 응답"""
        return APIResponse.error(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details={"validation_errors": errors}
        )
    
    @staticmethod
    def not_found(resource: str = "Resource") -> tuple:
        """리소스 없음 응답"""
        return APIResponse.error(
            message=f"{resource} not found",
            error_code="NOT_FOUND",
            status_code=404
        )
    
    @staticmethod
    def unauthorized(message: str = "Unauthorized") -> tuple:
        """인증 실패 응답"""
        return APIResponse.error(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401
        )
    
    @staticmethod
    def forbidden(message: str = "Forbidden") -> tuple:
        """권한 없음 응답"""
        return APIResponse.error(
            message=message,
            error_code="FORBIDDEN",
            status_code=403
        )
    
    @staticmethod
    def server_error(message: str = "Internal Server Error") -> tuple:
        """서버 에러 응답"""
        return APIResponse.error(
            message=message,
            error_code="INTERNAL_ERROR",
            status_code=500
        )

def validate_request_data(required_fields: list, data: Dict[str, Any]) -> Optional[tuple]:
    """요청 데이터 검증"""
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        return APIResponse.validation_error(
            {field: f"{field} is required" for field in missing_fields}
        )
    
    return None

def validate_file_upload(file, allowed_extensions: set, max_size: int) -> Optional[tuple]:
    """파일 업로드 검증"""
    if not file:
        return APIResponse.error("No file provided", "NO_FILE", 400)
    
    # 파일 확장자 검증
    if '.' not in file.filename:
        return APIResponse.error("File must have an extension", "INVALID_FILE_TYPE", 400)
    
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    if file_extension not in allowed_extensions:
        return APIResponse.error(
            f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}",
            "INVALID_FILE_TYPE",
            400
        )
    
    # 파일 크기 검증
    file.seek(0, 2)  # 파일 끝으로 이동
    file_size = file.tell()
    file.seek(0)  # 파일 시작으로 이동
    
    if file_size > max_size:
        return APIResponse.error(
            f"File too large. Maximum size: {max_size} bytes",
            "FILE_TOO_LARGE",
            400
        )
    
    return None

def get_request_data() -> Dict[str, Any]:
    """요청 데이터 가져오기 (JSON 또는 Form)"""
    if request.is_json:
        return request.get_json() or {}
    else:
        return request.form.to_dict()

def log_api_request(endpoint: str, method: str, data: Dict[str, Any] = None):
    """API 요청 로깅"""
    logger.info(f"API Request: {method} {endpoint}")
    if data:
        # 민감한 정보는 마스킹
        safe_data = {k: v for k, v in data.items() if 'password' not in k.lower() and 'key' not in k.lower()}
        logger.debug(f"Request data: {safe_data}")

def log_api_response(endpoint: str, status_code: int, message: str = None):
    """API 응답 로깅"""
    logger.info(f"API Response: {endpoint} -> {status_code}")
    if message:
        logger.debug(f"Response message: {message}")

# 에러 코드 상수
class ErrorCodes:
    """에러 코드 상수"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    NO_FILE = "NO_FILE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    HARDWARE_ERROR = "HARDWARE_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"

# API 엔드포인트 상수
class Endpoints:
    """API 엔드포인트 상수"""
    # 시스템
    SYSTEM_STATUS = "/api/system/status"
    SYSTEM_HEALTH = "/api/system/health"
    
    # 세션
    SESSIONS = "/api/sessions"
    SESSION_DETAIL = "/api/sessions/<session_id>"
    
    # 업로드
    UPLOAD = "/api/upload"
    UPLOAD_STATUS = "/api/upload/status"
    
    # 처리
    PROCESSING_START = "/api/processing/start"
    PROCESSING_STATUS = "/api/processing/status"
    PROCESSING_STOP = "/api/processing/stop"
    
    # 하드웨어
    HARDWARE_STATUS = "/api/hardware/status"
    HARDWARE_CONNECT = "/api/hardware/connect"
    HARDWARE_DISCONNECT = "/api/hardware/disconnect"
    HARDWARE_COMMAND = "/api/hardware/command"
    
    # 알림
    NOTIFICATIONS = "/api/notifications"
    NOTIFICATIONS_CLEAR = "/api/notifications/clear"
