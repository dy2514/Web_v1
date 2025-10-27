"""
TETRIS 시스템 공통 에러 처리 모듈
표준화된 예외 처리 및 에러 응답 생성
"""
import logging
from typing import Dict, Any, Optional
from flask import jsonify, Response

logger = logging.getLogger(__name__)

class TETRISError(Exception):
    """TETRIS 시스템 공통 예외 클래스"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "TETRIS_ERROR"
        self.details = details or {}

class ValidationError(TETRISError):
    """입력 검증 오류"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(message, "VALIDATION_ERROR")
        self.field = field
        self.value = value
        self.details = {"field": field, "value": str(value) if value is not None else None}

class StateError(TETRISError):
    """상태 관리 오류"""
    def __init__(self, message: str, state_key: str = None):
        super().__init__(message, "STATE_ERROR")
        self.state_key = state_key
        self.details = {"state_key": state_key}

class ChainError(TETRISError):
    """AI 체인 실행 오류"""
    def __init__(self, message: str, chain_step: str = None):
        super().__init__(message, "CHAIN_ERROR")
        self.chain_step = chain_step
        self.details = {"chain_step": chain_step}

class HardwareError(TETRISError):
    """하드웨어 제어 오류"""
    def __init__(self, message: str, device: str = None):
        super().__init__(message, "HARDWARE_ERROR")
        self.device = device
        self.details = {"device": device}

def handle_tetris_error(error: TETRISError) -> Response:
    """TETRIS 에러를 HTTP 응답으로 변환"""
    logger.error(f"TETRIS Error [{error.error_code}]: {error.message}")
    
    response_data = {
        "success": False,
        "error": {
            "code": error.error_code,
            "message": error.message,
            "details": error.details
        }
    }
    
    # 에러 코드별 HTTP 상태 코드 매핑
    status_codes = {
        "VALIDATION_ERROR": 400,
        "STATE_ERROR": 500,
        "CHAIN_ERROR": 500,
        "HARDWARE_ERROR": 503,
        "TETRIS_ERROR": 500
    }
    
    status_code = status_codes.get(error.error_code, 500)
    return jsonify(response_data), status_code

def handle_generic_error(error: Exception) -> Response:
    """일반 예외를 HTTP 응답으로 변환"""
    logger.error(f"Unexpected error: {str(error)}", exc_info=True)
    
    response_data = {
        "success": False,
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "내부 서버 오류가 발생했습니다.",
            "details": {}
        }
    }
    
    return jsonify(response_data), 500

def create_success_response(data: Any = None, message: str = "성공") -> Response:
    """성공 응답 생성"""
    response_data = {
        "success": True,
        "message": message,
        "data": data
    }
    
    return jsonify(response_data), 200

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """필수 필드 검증"""
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing_fields:
        raise ValidationError(
            f"필수 필드가 누락되었습니다: {', '.join(missing_fields)}",
            field="required_fields",
            value=missing_fields
        )

def validate_file_upload(file, allowed_extensions: set, max_size: int) -> None:
    """파일 업로드 검증"""
    if not file:
        raise ValidationError("업로드된 파일이 없습니다.", field="file")
    
    if not file.filename:
        raise ValidationError("파일명이 없습니다.", field="filename")
    
    # 확장자 검증
    if '.' not in file.filename:
        raise ValidationError("파일 확장자가 없습니다.", field="filename", value=file.filename)
    
    extension = file.filename.rsplit('.', 1)[1].lower()
    if extension not in allowed_extensions:
        raise ValidationError(
            f"허용되지 않는 파일 형식입니다. 허용 형식: {', '.join(allowed_extensions)}",
            field="extension",
            value=extension
        )
    
    # 파일 크기 검증
    file.seek(0, 2)  # 파일 끝으로 이동
    file_size = file.tell()
    file.seek(0)  # 파일 시작으로 이동
    
    if file_size > max_size:
        raise ValidationError(
            f"파일 크기가 너무 큽니다. 최대 크기: {max_size} bytes",
            field="file_size",
            value=file_size
        )

def validate_people_count(count: Any) -> int:
    """탑승 인원 수 검증"""
    # None, 빈 문자열, 공백 처리
    if count is None or count == '' or str(count).strip() == '':
        return 0  # 기본값 0 반환
    
    try:
        count = int(str(count).strip())
    except (ValueError, TypeError):
        raise ValidationError("탑승 인원은 숫자여야 합니다.", field="people_count", value=count)
    
    if count < 0:
        raise ValidationError("탑승 인원은 0 이상이어야 합니다.", field="people_count", value=count)
    
    if count > 10:  # 최대 10명으로 제한
        raise ValidationError("탑승 인원은 10명 이하여야 합니다.", field="people_count", value=count)
    
    return count
