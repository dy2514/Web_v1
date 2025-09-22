"""
Performance optimization tools - memory usage and network optimization
"""
import gc
import logging
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

import psutil

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    def __init__(self, memory_limit_mb: int = 1024, check_interval: int = 30):
        self.memory_limit = memory_limit_mb * 1024 * 1024  # 바이트로 변환
        self.check_interval = check_interval
        self.monitoring = False
        self.monitor_thread = None
        self.stats = {
            'memory_usage': [],
            'cpu_usage': [],
            'disk_usage': [],
            'network_io': [],
            'gc_stats': [],
            'last_cleanup': None
        }
    
    def start_monitoring(self):
        """성능 모니터링 시작"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("성능 모니터링 시작됨")
    
    def stop_monitoring(self):
        """성능 모니터링 중지"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("성능 모니터링 중지됨")
    
    def _monitor_loop(self):
        """모니터링 루프"""
        while self.monitoring:
            try:
                self._collect_stats()
                self._check_memory_usage()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"모니터링 오류: {e}")
                time.sleep(5)
    
    def _collect_stats(self):
        """시스템 통계 수집"""
        try:
            # 메모리 사용량
            memory = psutil.virtual_memory()
            self.stats['memory_usage'].append({
                'timestamp': datetime.now().isoformat(),
                'used_mb': memory.used / 1024 / 1024,
                'available_mb': memory.available / 1024 / 1024,
                'percent': memory.percent
            })
            
            # CPU 사용량
            cpu_percent = psutil.cpu_percent(interval=1)
            self.stats['cpu_usage'].append({
                'timestamp': datetime.now().isoformat(),
                'percent': cpu_percent
            })
            
            # 디스크 사용량
            disk = psutil.disk_usage('/')
            self.stats['disk_usage'].append({
                'timestamp': datetime.now().isoformat(),
                'used_gb': disk.used / 1024 / 1024 / 1024,
                'free_gb': disk.free / 1024 / 1024 / 1024,
                'percent': (disk.used / disk.total) * 100
            })
            
            # 네트워크 I/O
            net_io = psutil.net_io_counters()
            self.stats['network_io'].append({
                'timestamp': datetime.now().isoformat(),
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv
            })
            
            # 가비지 컬렉션 통계
            gc_stats = gc.get_stats()
            self.stats['gc_stats'].append({
                'timestamp': datetime.now().isoformat(),
                'collections': sum(stat['collections'] for stat in gc_stats),
                'collected': sum(stat['collected'] for stat in gc_stats),
                'uncollectable': sum(stat['uncollectable'] for stat in gc_stats)
            })
            
            # 오래된 데이터 정리 (1시간 이상)
            self._cleanup_old_stats()
            
        except Exception as e:
            logger.error(f"통계 수집 오류: {e}")
    
    def _check_memory_usage(self):
        """메모리 사용량 확인 및 정리"""
        try:
            memory = psutil.virtual_memory()
            
            if memory.used > self.memory_limit:
                logger.warning(f"메모리 사용량 초과: {memory.used / 1024 / 1024:.1f}MB > {self.memory_limit / 1024 / 1024:.1f}MB")
                self._cleanup_memory()
            
            # 메모리 사용량이 80% 이상이면 경고
            if memory.percent > 80:
                logger.warning(f"메모리 사용량 높음: {memory.percent:.1f}%")
                
        except Exception as e:
            logger.error(f"메모리 확인 오류: {e}")
    
    def _cleanup_memory(self):
        """메모리 정리"""
        try:
            # 가비지 컬렉션 강제 실행
            collected = gc.collect()
            logger.info(f"가비지 컬렉션 실행: {collected}개 객체 정리됨")
            
            # 오래된 통계 데이터 정리
            self._cleanup_old_stats()
            
            # 임시 파일 정리
            self._cleanup_temp_files()
            
            self.stats['last_cleanup'] = datetime.now().isoformat()
            
        except Exception as e:
            logger.error(f"메모리 정리 오류: {e}")
    
    def _cleanup_old_stats(self):
        """오래된 통계 데이터 정리"""
        cutoff_time = datetime.now() - timedelta(hours=1)
        
        for stat_type in ['memory_usage', 'cpu_usage', 'disk_usage', 'network_io', 'gc_stats']:
            if stat_type in self.stats:
                self.stats[stat_type] = [
                    stat for stat in self.stats[stat_type]
                    if datetime.fromisoformat(stat['timestamp']) > cutoff_time
                ]
    
    def _cleanup_temp_files(self):
        """임시 파일 정리"""
        try:
            temp_dirs = [
                Path('/tmp'),
                Path('uploads'),
                Path('logs')
            ]
            
            for temp_dir in temp_dirs:
                if temp_dir.exists():
                    for file_path in temp_dir.glob('*'):
                        if file_path.is_file():
                            # 1시간 이상 된 파일 삭제
                            file_age = datetime.now() - datetime.fromtimestamp(file_path.stat().st_mtime)
                            if file_age > timedelta(hours=1):
                                file_path.unlink()
                                logger.debug(f"임시 파일 삭제: {file_path}")
                                
        except Exception as e:
            logger.error(f"임시 파일 정리 오류: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """성능 통계 반환"""
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent()
            disk = psutil.disk_usage('/')
            
            return {
                'current': {
                    'memory': {
                        'used_mb': memory.used / 1024 / 1024,
                        'available_mb': memory.available / 1024 / 1024,
                        'percent': memory.percent
                    },
                    'cpu': {
                        'percent': cpu_percent
                    },
                    'disk': {
                        'used_gb': disk.used / 1024 / 1024 / 1024,
                        'free_gb': disk.free / 1024 / 1024 / 1024,
                        'percent': (disk.used / disk.total) * 100
                    }
                },
                'history': self.stats,
                'monitoring': {
                    'active': self.monitoring,
                    'check_interval': self.check_interval,
                    'memory_limit_mb': self.memory_limit / 1024 / 1024
                }
            }
        except Exception as e:
            logger.error(f"성능 통계 조회 오류: {e}")
            return {'error': str(e)}

class ImageOptimizer:
    """이미지 최적화 클래스"""
    
    @staticmethod
    def optimize_image(file_path: Path, max_width: int = 1920, quality: int = 85) -> bool:
        """이미지 최적화"""
        try:
            from PIL import Image
            
            with Image.open(file_path) as img:
                # 이미지 크기 확인
                if img.width <= max_width:
                    return True
                
                # 비율 유지하며 리사이즈
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                
                # 리사이즈
                resized_img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
                # 최적화된 이미지로 저장
                resized_img.save(file_path, 'JPEG', quality=quality, optimize=True)
                
                logger.info(f"이미지 최적화 완료: {file_path}")
                return True
                
        except Exception as e:
            logger.error(f"이미지 최적화 실패: {e}")
            return False
    
    @staticmethod
    def get_image_info(file_path: Path) -> Optional[Dict[str, Any]]:
        """이미지 정보 조회"""
        try:
            from PIL import Image
            
            with Image.open(file_path) as img:
                return {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                    'size_bytes': file_path.stat().st_size
                }
        except Exception as e:
            logger.error(f"이미지 정보 조회 실패: {e}")
            return None

class NetworkOptimizer:
    """네트워크 최적화 클래스"""
    
    @staticmethod
    def get_local_ip() -> str:
        """로컬 IP 주소 조회 (최적화된 방법)"""
        try:
            import socket
            
            # 로컬 네트워크 인터페이스 직접 조회
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                return local_ip
        except Exception:
            return "127.0.0.1"
    
    @staticmethod
    def check_network_connectivity() -> Dict[str, bool]:
        """네트워크 연결 상태 확인"""
        try:
            import socket
            import requests
            
            results = {}
            
            # 로컬 연결 확인
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(1)
                    s.connect(("127.0.0.1", 5002))
                    results['local'] = True
            except:
                results['local'] = False
            
            # 외부 연결 확인
            try:
                response = requests.get("https://www.google.com", timeout=5)
                results['external'] = response.status_code == 200
            except:
                results['external'] = False
            
            return results
            
        except Exception as e:
            logger.error(f"네트워크 연결 확인 오류: {e}")
            return {'local': False, 'external': False}

# 전역 성능 모니터 인스턴스
performance_monitor = PerformanceMonitor()

def start_performance_monitoring(memory_limit_mb: int = 1024, interval: int = 30) -> bool:
    """성능 모니터링 시작"""
    try:
        performance_monitor.memory_limit = memory_limit_mb * 1024 * 1024
        performance_monitor.check_interval = interval
        performance_monitor.start_monitoring()
        return True
    except Exception as e:
        logger.error(f"성능 모니터링 시작 실패: {e}")
        return False

def stop_performance_monitoring():
    """성능 모니터링 중지"""
    performance_monitor.stop_monitoring()

def get_performance_stats() -> Dict[str, Any]:
    """성능 통계 조회"""
    return performance_monitor.get_performance_stats()
