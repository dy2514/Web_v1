# 성능 모니터링 시스템 - 시스템 리소스 및 프로세스 모니터링
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """성능 메트릭 데이터 클래스"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    process_count: int
    load_average: Optional[List[float]] = None

class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    def __init__(self, 
                 interval: int = 30,
                 alert_thresholds: Optional[Dict[str, float]] = None,
                 max_history: int = 100):
        """성능 모니터 초기화"""
        self.interval = interval
        self.max_history = max_history
        self.metrics_history: List[PerformanceMetrics] = []
        self.is_monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.alert_callbacks: List[Callable] = []
        
        self.alert_thresholds = alert_thresholds or {
            'cpu_percent': 80.0,
            'memory_percent': 90.0,
            'disk_percent': 85.0
        }
        
        try:
            import psutil
            self.psutil_available = True
            logger.info("psutil 사용 가능 - 성능 모니터링 활성화")
        except ImportError:
            self.psutil_available = False
            logger.warning("psutil 미설치 - 성능 모니터링 비활성화")
    
    def collect_metrics(self) -> Optional[PerformanceMetrics]:
        """현재 성능 메트릭 수집"""
        if not self.psutil_available:
            return None
        
        try:
            import psutil
            
            cpu_percent = psutil.cpu_percent(interval=1)
            
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / (1024 * 1024)
            memory_total_mb = memory.total / (1024 * 1024)
            
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            disk_used_gb = disk.used / (1024 * 1024 * 1024)
            disk_total_gb = disk.total / (1024 * 1024 * 1024)
            
            process_count = len(psutil.pids())
            
            try:
                load_average = list(psutil.getloadavg())
            except AttributeError:
                load_average = None
            
            metrics = PerformanceMetrics(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                memory_used_mb=memory_used_mb,
                memory_total_mb=memory_total_mb,
                disk_percent=disk_percent,
                disk_used_gb=disk_used_gb,
                disk_total_gb=disk_total_gb,
                process_count=process_count,
                load_average=load_average
            )
            
            return metrics
            
        except Exception as e:
            logger.error(f"성능 메트릭 수집 오류: {e}")
            return None
    
    def check_alerts(self, metrics: PerformanceMetrics):
        """알림 조건 확인"""
        alerts = []
        
        if metrics.cpu_percent > self.alert_thresholds.get('cpu_percent', 80):
            alerts.append(f"CPU 사용률 높음: {metrics.cpu_percent:.1f}%")
        
        if metrics.memory_percent > self.alert_thresholds.get('memory_percent', 85):
            alerts.append(f"메모리 사용률 높음: {metrics.memory_percent:.1f}%")
        
        if metrics.disk_percent > self.alert_thresholds.get('disk_percent', 90):
            alerts.append(f"디스크 사용률 높음: {metrics.disk_percent:.1f}%")
        
        if alerts:
            alert_message = " | ".join(alerts)
            logger.warning(f"성능 알림: {alert_message}")
            
            for callback in self.alert_callbacks:
                try:
                    callback(metrics, alerts)
                except Exception as e:
                    logger.error(f"알림 콜백 실행 오류: {e}")
    
    def add_alert_callback(self, callback: Callable):
        """알림 콜백 추가"""
        self.alert_callbacks.append(callback)
    
    def _monitor_loop(self):
        """모니터링 루프"""
        logger.info(f"성능 모니터링 시작 (간격: {self.interval}초)")
        
        while self.is_monitoring:
            try:
                metrics = self.collect_metrics()
                if metrics:
                    self.metrics_history.append(metrics)
                    
                    if len(self.metrics_history) > self.max_history:
                        self.metrics_history.pop(0)
                    
                    self.check_alerts(metrics)
                    
                    logger.debug(f"성능 메트릭 수집: CPU {metrics.cpu_percent:.1f}%, "
                               f"메모리 {metrics.memory_percent:.1f}%")
                
                time.sleep(self.interval)
                
            except Exception as e:
                logger.error(f"모니터링 루프 오류: {e}")
                time.sleep(self.interval)
        
        logger.info("성능 모니터링 종료")
    
    def start_monitoring(self):
        """모니터링 시작"""
        if not self.psutil_available:
            logger.error("psutil 미설치로 모니터링 시작 불가")
            return False
        
        if self.is_monitoring:
            logger.warning("모니터링이 이미 실행 중입니다")
            return False
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info("성능 모니터링 시작됨")
        return True
    
    def stop_monitoring(self):
        """모니터링 중지"""
        if not self.is_monitoring:
            logger.warning("모니터링이 실행 중이 아닙니다")
            return False
        
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("성능 모니터링 중지됨")
        return True
    
    def get_current_metrics(self) -> Optional[PerformanceMetrics]:
        """현재 성능 메트릭 반환"""
        return self.collect_metrics()
    
    def get_metrics_history(self, minutes: int = 60) -> List[PerformanceMetrics]:
        """지정된 시간 범위의 메트릭 히스토리 반환"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        return [m for m in self.metrics_history if m.timestamp >= cutoff_time]
    
    def get_metrics_summary(self) -> Dict:
        """메트릭 요약 정보 반환"""
        if not self.metrics_history:
            return {'status': 'no_data'}
        
        recent_metrics = self.get_metrics_history(minutes=10)
        if not recent_metrics:
            return {'status': 'no_recent_data'}
        
        cpu_values = [m.cpu_percent for m in recent_metrics]
        memory_values = [m.memory_percent for m in recent_metrics]
        disk_values = [m.disk_percent for m in recent_metrics]
        
        return {
            'status': 'monitoring',
            'interval_minutes': len(recent_metrics) * (self.interval / 60),
            'cpu': {
                'current': recent_metrics[-1].cpu_percent,
                'average': sum(cpu_values) / len(cpu_values),
                'max': max(cpu_values),
                'min': min(cpu_values)
            },
            'memory': {
                'current': recent_metrics[-1].memory_percent,
                'average': sum(memory_values) / len(memory_values),
                'max': max(memory_values),
                'min': min(memory_values),
                'used_mb': recent_metrics[-1].memory_used_mb,
                'total_mb': recent_metrics[-1].memory_total_mb
            },
            'disk': {
                'current': recent_metrics[-1].disk_percent,
                'average': sum(disk_values) / len(disk_values),
                'max': max(disk_values),
                'min': min(disk_values),
                'used_gb': recent_metrics[-1].disk_used_gb,
                'total_gb': recent_metrics[-1].disk_total_gb
            },
            'alerts': {
                'cpu_threshold': self.alert_thresholds.get('cpu_percent', 80),
                'memory_threshold': self.alert_thresholds.get('memory_percent', 85),
                'disk_threshold': self.alert_thresholds.get('disk_percent', 90)
            }
        }

# 전역 성능 모니터 인스턴스
_performance_monitor = None

def get_performance_monitor() -> PerformanceMonitor:
    """전역 성능 모니터 인스턴스 반환"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor

def start_performance_monitoring(interval: int = 60) -> bool:
    """성능 모니터링 시작 편의 함수"""
    monitor = get_performance_monitor()
    monitor.interval = interval
    monitor.alert_thresholds['memory_percent'] = 90.0
    return monitor.start_monitoring()

def stop_performance_monitoring() -> bool:
    """성능 모니터링 중지 편의 함수"""
    monitor = get_performance_monitor()
    return monitor.stop_monitoring()

def get_current_performance() -> Optional[PerformanceMetrics]:
    """현재 성능 정보 반환 편의 함수"""
    monitor = get_performance_monitor()
    return monitor.get_current_metrics()
