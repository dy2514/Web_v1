# network_manager.py - 네트워크 접근 제어 및 관리

import ipaddress
import logging
from typing import List, Set
from pathlib import Path

logger = logging.getLogger(__name__)

class NetworkManager:
    """네트워크 접근 제어 및 관리 클래스"""
    
    def __init__(self, allowed_ips: List[str] = None):
        self.allowed_ips: Set[ipaddress.IPv4Network] = set()
        self._load_allowed_ips(allowed_ips)
    
    def _load_allowed_ips(self, allowed_ips: List[str] = None):
        """허용된 IP 대역을 로드"""
        if allowed_ips is None:
            # 기본 로컬 네트워크 대역
            allowed_ips = [
                "127.0.0.1/32",      # localhost
                "192.168.0.0/16",    # 사설 IP 대역 A
                "10.0.0.0/8",        # 사설 IP 대역 B
                "172.16.0.0/12"      # 사설 IP 대역 C
            ]
        
        for ip_str in allowed_ips:
            try:
                network = ipaddress.IPv4Network(ip_str)
                self.allowed_ips.add(network)
                logger.info(f"허용된 네트워크 추가: {network}")
            except ValueError as e:
                logger.error(f"잘못된 IP 대역 형식: {ip_str} - {e}")
    
    def is_allowed(self, client_ip: str) -> bool:
        """클라이언트 IP가 허용된 대역에 속하는지 확인"""
        try:
            client_addr = ipaddress.IPv4Address(client_ip)
            for allowed_network in self.allowed_ips:
                if client_addr in allowed_network:
                    return True
            return False
        except ValueError:
            logger.error(f"잘못된 IP 주소 형식: {client_ip}")
            return False
    
    def add_allowed_ip(self, ip_str: str) -> bool:
        """허용된 IP 대역 추가"""
        try:
            network = ipaddress.IPv4Network(ip_str)
            self.allowed_ips.add(network)
            logger.info(f"허용된 네트워크 추가: {network}")
            return True
        except ValueError as e:
            logger.error(f"잘못된 IP 대역 형식: {ip_str} - {e}")
            return False
    
    def remove_allowed_ip(self, ip_str: str) -> bool:
        """허용된 IP 대역 제거"""
        try:
            network = ipaddress.IPv4Network(ip_str)
            if network in self.allowed_ips:
                self.allowed_ips.remove(network)
                logger.info(f"허용된 네트워크 제거: {network}")
                return True
            return False
        except ValueError as e:
            logger.error(f"잘못된 IP 대역 형식: {ip_str} - {e}")
            return False
    
    def get_allowed_networks(self) -> List[str]:
        """허용된 네트워크 목록 반환"""
        return [str(network) for network in self.allowed_ips]
    
    def get_network_status(self) -> dict:
        """네트워크 상태 정보 반환"""
        return {
            'allowed_networks': self.get_allowed_networks(),
            'total_allowed_networks': len(self.allowed_ips)
        }

def get_client_ip(request) -> str:
    """Flask request에서 클라이언트 IP 추출"""
    # X-Forwarded-For 헤더 확인 (프록시 환경)
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    
    # X-Real-IP 헤더 확인
    if request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    
    # 기본 remote_addr 사용
    return request.remote_addr

# 전역 네트워크 매니저 인스턴스
_network_manager = None

def get_network_manager() -> NetworkManager:
    """전역 네트워크 매니저 인스턴스 반환"""
    global _network_manager
    if _network_manager is None:
        _network_manager = NetworkManager()
    return _network_manager

def check_client_access(request) -> bool:
    """클라이언트 접근 권한 확인 편의 함수"""
    manager = get_network_manager()
    client_ip = get_client_ip(request)
    return manager.is_allowed(client_ip)
