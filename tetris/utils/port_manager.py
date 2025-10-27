# 포트 동적 할당 및 관리 시스템
import socket
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

class PortManager:
    """포트 동적 할당 및 관리 클래스"""
    
    def __init__(self, start_port: int = 5002, end_port: int = 5010):
        self.start_port = start_port
        self.end_port = end_port
        self.reserved_ports: List[int] = []
    
    def is_port_available(self, port: int) -> bool:
        """특정 포트가 사용 가능한지 확인"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                s.bind(('localhost', port))
                return True
        except (OSError, socket.error):
            return False
    
    def find_available_port(self) -> Optional[int]:
        """사용 가능한 포트를 찾아 반환"""
        for port in range(self.start_port, self.end_port + 1):
            if port not in self.reserved_ports and self.is_port_available(port):
                logger.info(f"사용 가능한 포트 발견: {port}")
                return port
        
        logger.error(f"포트 범위 {self.start_port}-{self.end_port}에서 사용 가능한 포트를 찾을 수 없습니다.")
        return None
    
    def reserve_port(self, port: int) -> bool:
        """포트를 예약 목록에 추가"""
        if port not in self.reserved_ports:
            self.reserved_ports.append(port)
            logger.info(f"포트 {port} 예약 완료")
            return True
        return False
    
    def release_port(self, port: int) -> bool:
        """포트를 예약 목록에서 제거"""
        if port in self.reserved_ports:
            self.reserved_ports.remove(port)
            logger.info(f"포트 {port} 해제 완료")
            return True
        return False
    
    def get_port_status(self) -> dict:
        """포트 상태 정보 반환"""
        return {
            'start_port': self.start_port,
            'end_port': self.end_port,
            'reserved_ports': self.reserved_ports.copy(),
            'available_ports': [
                port for port in range(self.start_port, self.end_port + 1)
                if port not in self.reserved_ports and self.is_port_available(port)
            ]
        }

# 전역 포트 매니저 인스턴스
_port_manager = None

def get_port_manager() -> PortManager:
    """전역 포트 매니저 인스턴스 반환"""
    global _port_manager
    if _port_manager is None:
        _port_manager = PortManager()
    return _port_manager

def find_available_port(start_port: int = 5002, end_port: int = 5010) -> Optional[int]:
    """사용 가능한 포트 찾기 편의 함수"""
    manager = get_port_manager()
    manager.start_port = start_port
    manager.end_port = end_port
    return manager.find_available_port()

def check_port_availability(port: int) -> bool:
    """포트 사용 가능 여부 확인 편의 함수"""
    manager = get_port_manager()
    return manager.is_port_available(port)
