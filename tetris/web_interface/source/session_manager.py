# source/session_manager.py - 세션 관리 클래스
import pickle
import os
from datetime import datetime

class SessionManager:
    """세션 관리 클래스"""
    
    def __init__(self, storage_dir='tetris/web_interface/source/session_storage'):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self.sessions_file = os.path.join(storage_dir, 'sessions.pkl')
    
    def save_session(self, session_id, data):
        """세션 데이터 저장"""
        sessions = self.load_all_sessions()
        sessions[session_id] = {
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(self.sessions_file, 'wb') as f:
            pickle.dump(sessions, f)
    
    def load_session(self, session_id):
        """특정 세션 데이터 로드"""
        sessions = self.load_all_sessions()
        return sessions.get(session_id)
    
    def load_all_sessions(self):
        """모든 세션 데이터 로드"""
        if os.path.exists(self.sessions_file):
            try:
                with open(self.sessions_file, 'rb') as f:
                    return pickle.load(f)
            except:
                return {}
        return {}
    
    def delete_session(self, session_id):
        """세션 삭제"""
        sessions = self.load_all_sessions()
        if session_id in sessions:
            del sessions[session_id]
            with open(self.sessions_file, 'wb') as f:
                pickle.dump(sessions, f)

# 편의 함수들
_session_manager = None

def get_session_manager():
    """전역 SessionManager 인스턴스 반환"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager

def get_session_data(session_id=None):
    """세션 데이터 조회"""
    manager = get_session_manager()
    if session_id:
        return manager.load_session(session_id)
    return manager.load_all_sessions()

def save_session_data(session_id, data):
    """세션 데이터 저장"""
    manager = get_session_manager()
    manager.save_session(session_id, data)

def delete_session_data(session_id):
    """세션 데이터 삭제"""
    manager = get_session_manager()
    manager.delete_session(session_id)
