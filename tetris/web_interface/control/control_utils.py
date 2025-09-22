# control_utils.py - 관제 화면 전용 유틸리티 함수

import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def get_local_ip() -> str:
    """
    동적으로 로컬 IP 주소 감지
    
    Returns:
        감지된 로컬 IP 주소
    """
    import socket
    
    try:
        # 외부 서버에 연결하여 로컬 IP 감지
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Google DNS 서버에 연결 (실제로는 연결하지 않음)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            return local_ip
    except Exception:
        # 실패시 localhost 반환
        return "127.0.0.1"

def generate_qr_data(local_ip: str = None, port: int = None) -> str:
    """QR 코드용 데이터 생성 (동적 IP 감지)"""
    # IP 자동 감지
    if local_ip is None:
        local_ip = get_local_ip()
    
    # 포트 자동 감지
    if port is None:
        try:
            from config import get_config
            config = get_config()
            port = config['web']['PORT']
        except Exception:
            port = 5002
    
    mobile_url = f"http://{local_ip}:{port}/mobile/input"
    return mobile_url

def format_system_status(status: Dict[str, Any]) -> Dict[str, Any]:
    """시스템 상태 포맷팅"""
    formatted = {
        'session_id': status.get('session_id', 'N/A'),
        'progress': status.get('progress', 0),
        'status': status.get('status', 'idle'),
        'message': status.get('message', '시스템 준비됨'),
        'uploaded_file': status.get('uploaded_file', False),
        'people_count': status.get('people_count', 0),
        'last_update': datetime.fromtimestamp(
            status.get('last_update', time.time())
        ).strftime('%Y-%m-%d %H:%M:%S')
    }
    return formatted

def get_connection_info() -> Dict[str, str]:
    """연결 정보 반환 (동적 IP 감지)"""
    import socket
    
    try:
        hostname = socket.gethostname()
        local_ip = get_local_ip()  # 동적 IP 감지 사용
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

def validate_processing_request(data: Dict[str, Any]) -> tuple[bool, str]:
    """처리 요청 검증"""
    if not data.get('uploaded_file'):
        return False, "업로드된 파일이 없습니다."
    
    people_count = data.get('people_count', 0)
    if not isinstance(people_count, int) or people_count < 0 or people_count > 4:
        return False, "인원 수는 0-4명 사이여야 합니다."
    
    return True, "검증 통과"

def create_processing_steps() -> list:
    """처리 단계 목록 생성"""
    return [
        {'progress': 10, 'status': 'analyzing', 'message': '이미지 분석 중...'},
        {'progress': 30, 'status': 'processing', 'message': 'AI 처리 중...'},
        {'progress': 60, 'status': 'generating', 'message': '결과 생성 중...'},
        {'progress': 90, 'status': 'finalizing', 'message': '최종 처리 중...'},
        {'progress': 100, 'status': 'completed', 'message': '처리 완료!'}
    ]

def log_control_action(action: str, details: Optional[Dict] = None):
    """관제 화면 액션 로깅"""
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'action': action,
        'details': details or {}
    }
    logger.info(f"Control action: {json.dumps(log_data, ensure_ascii=False)}")

def get_system_metrics() -> Dict[str, Any]:
    """시스템 메트릭 수집 (성능 모니터 사용)"""
    try:
        from utils.performance_monitor import get_current_performance
        
        metrics = get_current_performance()
        if metrics:
            return {
                'cpu_percent': metrics.cpu_percent,
                'memory_percent': metrics.memory_percent,
                'memory_used_mb': metrics.memory_used_mb,
                'memory_total_mb': metrics.memory_total_mb,
                'disk_percent': metrics.disk_percent,
                'disk_used_gb': metrics.disk_used_gb,
                'disk_total_gb': metrics.disk_total_gb,
                'process_count': metrics.process_count,
                'load_average': metrics.load_average,
                'timestamp': metrics.timestamp.isoformat()
            }
        else:
            # 성능 모니터 사용 불가시 기본 psutil 사용
            import psutil
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'timestamp': datetime.now().isoformat(),
                'note': 'basic_metrics'
            }
    except Exception as e:
        return {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'timestamp': datetime.now().isoformat(),
            'error': f'Metrics collection failed: {str(e)}'
        }
