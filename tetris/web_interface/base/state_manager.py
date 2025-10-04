"""
Unified state manager - single state storage
"""
import json
import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class StateManager:
    """통합 상태 관리자"""
    
    def __init__(self, state_file: str = None):
        # 절대 경로 사용 - 프로젝트 루트의 state.json 파일 사용
        if state_file is None:
            # 프로젝트 루트 디렉토리 찾기 (Web_v1 디렉토리)
            current_dir = Path(__file__).parent  # web_interface/base
            project_root = current_dir.parent.parent.parent  # Web_v1 디렉토리
            state_file = project_root / 'tetris' / 'state.json'
        
        self.state_file = Path(state_file).resolve()  # 절대 경로로 변환
        self.state: Dict[str, Any] = {}
        self.lock = threading.RLock()
        self.listeners = []
        
        # 초기 상태 로드
        self.load_state()
    
    def load_state(self):
        """상태 파일에서 로드"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    self.state = json.load(f)
                logger.info(f"상태 로드됨: {self.state_file}")
            else:
                self.state = self._get_initial_state()
                self.save_state()
                logger.info("초기 상태 생성됨")
        except Exception as e:
            logger.error(f"상태 로드 실패: {e}")
            self.state = self._get_initial_state()
    
    def save_state(self):
        """상태를 파일에 저장"""
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(self.state, f, ensure_ascii=False, indent=2)
            logger.debug(f"상태 저장됨: {self.state_file}")
        except Exception as e:
            logger.error(f"상태 저장 실패: {e}")
    
    def _get_initial_state(self) -> Dict[str, Any]:
        """초기 상태 반환"""
        return {
            'system': {
                'status': 'idle',
                'last_updated': datetime.now().isoformat(),
                'version': '1.0.0'
            },
            'sessions': {},
            'processing': {
                'current_scenario': None,
                'progress': 0,
                'status': 'idle',
                'started_at': None,
                'completed_at': None
            },
            'upload': {
                'uploaded_file': None,
                'image_path': None,
                'image_data_url': None,
                'people_count': 0,
                'scenario': None
            },
            'hardware': {
                'arduino_connected': False,
                'motor_status': 'idle',
                'last_command': None
            },
            'notifications': []
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """상태 값 조회"""
        with self.lock:
            keys = key.split('.')
            value = self.state
            
            for k in keys:
                if isinstance(value, dict) and k in value:
                    value = value[k]
                else:
                    return default
            
            return value
    
    def set(self, key: str, value: Any, save: bool = True):
        """상태 값 설정 (변경사항 있을 때만)"""
        with self.lock:
            keys = key.split('.')
            current = self.state
            
            # 중첩된 키 경로 생성
            for k in keys[:-1]:
                if k not in current:
                    current[k] = {}
                current = current[k]
            
            # 값이 실제로 변경되었는지 확인
            old_value = current.get(keys[-1])
            if old_value == value:
                logger.debug(f"상태 변경 없음: {key} = {value}")
                return False
            
            # 값 설정
            current[keys[-1]] = value
            logger.info(f"상태 변경: {key} = {old_value} -> {value}")
            
            # 타임스탬프 업데이트
            if key.startswith('system.'):
                self.state['system']['last_updated'] = datetime.now().isoformat()
            
            # 리스너에게 알림
            self._notify_listeners(key, value)
            
            # 저장
            if save:
                self.save_state()
    
    def update(self, updates: Dict[str, Any], save: bool = True):
        """여러 상태 값 일괄 업데이트"""
        with self.lock:
            for key, value in updates.items():
                self.set(key, value, save=False)
            
            if save:
                self.save_state()
    
    def add_listener(self, listener):
        """상태 변경 리스너 추가"""
        self.listeners.append(listener)
    
    def remove_listener(self, listener):
        """상태 변경 리스너 제거"""
        if listener in self.listeners:
            self.listeners.remove(listener)
    
    def _notify_listeners(self, key: str, value: Any):
        """리스너들에게 상태 변경 알림"""
        for listener in self.listeners:
            try:
                listener(key, value)
            except Exception as e:
                logger.error(f"리스너 알림 실패: {e}")
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """세션 정보 조회"""
        return self.get(f'sessions.{session_id}', {})
    
    def set_session(self, session_id: str, data: Dict[str, Any]):
        """세션 정보 설정"""
        self.set(f'sessions.{session_id}', data)
    
    def remove_session(self, session_id: str):
        """세션 제거"""
        with self.lock:
            if 'sessions' in self.state and session_id in self.state['sessions']:
                del self.state['sessions'][session_id]
                self.save_state()
    
    def get_processing_status(self) -> Dict[str, Any]:
        """처리 상태 조회"""
        return self.get('processing', {})
    
    def set_processing_status(self, status: str, progress: int = 0, scenario: str = None):
        """처리 상태 설정"""
        updates = {
            'processing.status': status,
            'processing.progress': progress,
            'processing.last_updated': datetime.now().isoformat()
        }
        
        if scenario:
            updates['processing.current_scenario'] = scenario
        
        if status == 'started':
            updates['processing.started_at'] = datetime.now().isoformat()
        elif status in ['completed', 'error']:
            updates['processing.completed_at'] = datetime.now().isoformat()
        
        self.update(updates)
    
    def get_upload_status(self) -> Dict[str, Any]:
        """업로드 상태 조회"""
        return self.get('upload', {})
    
    def set_upload_status(self, **kwargs):
        """업로드 상태 설정"""
        updates = {}
        for key, value in kwargs.items():
            updates[f'upload.{key}'] = value
        
        self.update(updates)
    
    def add_notification(self, message: str, level: str = 'info'):
        """알림 추가"""
        notification = {
            'id': f'notif_{datetime.now().timestamp()}',
            'message': message,
            'level': level,
            'timestamp': datetime.now().isoformat()
        }
        
        with self.lock:
            if 'notifications' not in self.state:
                self.state['notifications'] = []
            
            self.state['notifications'].append(notification)
            
            # 최대 100개 알림만 유지
            if len(self.state['notifications']) > 100:
                self.state['notifications'] = self.state['notifications'][-100:]
            
            self.save_state()
    
    def get_notifications(self, limit: int = 10) -> list:
        """최근 알림 조회"""
        notifications = self.get('notifications', [])
        return notifications[-limit:] if limit else notifications
    
    def clear_notifications(self):
        """알림 초기화"""
        self.set('notifications', [])
    
    def get_system_status(self) -> Dict[str, Any]:
        """시스템 상태 조회"""
        status = {
            'system': self.get('system', {}),
            'processing': self.get_processing_status(),
            'upload': self.get_upload_status(),
            'hardware': self.get('hardware', {}),
            'active_sessions': len(self.get('sessions', {})),
            'notifications_count': len(self.get('notifications', []))
        }
        
        # current_step이 있으면 추가
        if 'current_step' in self.state:
            status['current_step'] = self.state['current_step']
        
        # analysis_result가 있으면 추가
        if 'analysis_result' in self.state:
            status['analysis_result'] = self.state['analysis_result']
            # print(f"[DEBUG] get_system_status에서 analysis_result 추가: {list(self.state['analysis_result'].keys()) if isinstance(self.state['analysis_result'], dict) else 'Not a dict'}")
        
        return status
    
    def reset(self):
        """상태 초기화"""
        with self.lock:
            self.state = self._get_initial_state()
            self.save_state()
            logger.info("상태 초기화됨")

# 전역 상태 관리자 인스턴스
state_manager = StateManager()

# 기존 함수들과의 호환성을 위한 래퍼 함수들
def get_global_status() -> Dict[str, Any]:
    """전역 상태 조회 (기존 호환성)"""
    return state_manager.get_system_status()

def update_status(progress=None, status: str = None, message: str = None, **kwargs):
    """상태 업데이트 (기존 호환성)"""
    if progress is not None:
        state_manager.set('processing.progress', progress)
    
    if status:
        state_manager.set('system.status', status)
    
    if message:
        state_manager.add_notification(message)
    
    if kwargs:
        for key, value in kwargs.items():
            logger.info(f"update_status: {key} = {value}")
            state_manager.set(key, value)

def reset_global_status():
    """전역 상태 초기화 (기존 호환성)"""
    state_manager.reset()
