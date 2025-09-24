# source/utils.py - 공통 유틸리티 함수
import time
import logging
from .state_manager import state_manager

logger = logging.getLogger(__name__)

# 통합 상태 관리자 사용
def get_global_status():
    """전역 상태 반환 (기존 호환성)"""
    return state_manager.get_system_status()

def update_status(progress=None, status=None, message=None, **kwargs):
    """전역 상태 업데이트 (기존 호환성)"""
    if progress is not None:
        state_manager.set('processing.progress', progress)
    if status is not None:
        state_manager.set('system.status', status)
    if message is not None:
        state_manager.add_notification(message)
    
    # 추가 키워드 인수 업데이트
    for key, value in kwargs.items():
        print(f"[DEBUG] update_status: {key} = {type(value)} (크기: {len(str(value)) if hasattr(value, '__len__') else 'N/A'})")
        state_manager.set(key, value)
        print(f"[DEBUG] update_status: {key} 설정 후 값 = {type(state_manager.state.get(key))} (크기: {len(str(state_manager.state.get(key))) if hasattr(state_manager.state.get(key), '__len__') else 'N/A'})")
        
        # analysis_result 특별 처리
        if key == 'analysis_result':
            print(f"[DEBUG] analysis_result 저장됨: {list(value.keys()) if isinstance(value, dict) else 'Not a dict'}")
            # 상태 저장 확인
            state_manager.save_state()
            print(f"[DEBUG] state.json 저장 완료")
    
    logger.info(f"상태 업데이트: {status}, {message}")

def reset_global_status():
    """전역 상태 초기화 (기존 호환성)"""
    state_manager.reset()
