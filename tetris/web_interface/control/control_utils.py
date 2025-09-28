# control_utils.py - 관제 화면 전용 유틸리티 함수
# 공통 함수들은 base/common_utils.py에서 import하여 사용

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from base.common_utils import (
    get_connection_info,
    generate_qr_data,
    format_status_info,
    log_action,
    validate_processing_request,
    create_processing_steps
)

logger = logging.getLogger(__name__)

# 관제 화면 전용 래퍼 함수들 (기존 호환성 유지)
def format_system_status(status: Dict[str, Any]) -> Dict[str, Any]:
    """시스템 상태 포맷팅 (기존 호환성)"""
    return format_status_info(status, "system")

def log_control_action(action: str, details: Optional[Dict] = None):
    """관제 화면 액션 로깅 (기존 호환성)"""
    log_action(action, "control", details=details)

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
