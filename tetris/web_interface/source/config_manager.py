# config_manager.py - 설정 관리 클래스

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime

logger = logging.getLogger(__name__)

class ConfigManager:
    """설정 관리 클래스"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path) if config_path else Path(__file__).parent.parent.parent / 'config.py'
        self.config_cache: Dict[str, Any] = {}
        self.last_loaded = None
    
    def load_config(self, env: Optional[str] = None) -> Dict[str, Any]:
        """설정 로드"""
        try:
            # 환경변수에서 환경 설정 읽기
            if env is None:
                env = os.getenv('TETRIS_ENV', 'production')
            
            # config.py에서 get_config 함수 호출
            import sys
            config_dir = self.config_path.parent
            if str(config_dir) not in sys.path:
                sys.path.insert(0, str(config_dir))
            
            from config import get_config
            config = get_config(env)
            
            # 캐시 업데이트
            self.config_cache = config.copy()
            self.last_loaded = datetime.now()
            
            logger.info(f"Configuration loaded for environment: {env}")
            return config
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            # 기본 설정 반환
            return self._get_default_config()
    
    def get_config_value(self, key_path: str, default: Any = None) -> Any:
        """중첩된 설정 값 조회 (예: 'web.DEBUG')"""
        try:
            keys = key_path.split('.')
            value = self.config_cache
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default
            
            return value
            
        except Exception as e:
            logger.error(f"Error getting config value for '{key_path}': {e}")
            return default
    
    def set_config_value(self, key_path: str, value: Any) -> bool:
        """설정 값 설정"""
        try:
            keys = key_path.split('.')
            config = self.config_cache
            
            # 중첩된 딕셔너리 구조 생성
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            
            # 마지막 키에 값 설정
            config[keys[-1]] = value
            
            logger.info(f"Config value set: {key_path} = {value}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting config value for '{key_path}': {e}")
            return False
    
    def validate_config(self, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """설정 유효성 검사"""
        if config is None:
            config = self.config_cache
        
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # 필수 설정 검사
            required_sections = ['web', 'upload', 'ai', 'hardware', 'output', 'logging']
            for section in required_sections:
                if section not in config:
                    validation_result['errors'].append(f"Missing required section: {section}")
                    validation_result['valid'] = False
            
            # 웹 설정 검사
            if 'web' in config:
                web_config = config['web']
                required_web_keys = ['HOST', 'PORT', 'SECRET_KEY']
                for key in required_web_keys:
                    if key not in web_config:
                        validation_result['errors'].append(f"Missing web config: {key}")
                        validation_result['valid'] = False
                
                # 포트 번호 검사
                if 'PORT' in web_config:
                    port = web_config['PORT']
                    if not isinstance(port, int) or port < 1 or port > 65535:
                        validation_result['errors'].append(f"Invalid web port: {port}")
                        validation_result['valid'] = False
            
            # 업로드 설정 검사
            if 'upload' in config:
                upload_config = config['upload']
                if 'MAX_FILE_SIZE' in upload_config:
                    max_size = upload_config['MAX_FILE_SIZE']
                    if not isinstance(max_size, int) or max_size <= 0:
                        validation_result['errors'].append(f"Invalid max file size: {max_size}")
                        validation_result['valid'] = False
                
                if 'ALLOWED_EXTENSIONS' in upload_config:
                    extensions = upload_config['ALLOWED_EXTENSIONS']
                    if not isinstance(extensions, set) or len(extensions) == 0:
                        validation_result['errors'].append("Invalid allowed extensions")
                        validation_result['valid'] = False
            
            # 하드웨어 설정 검사
            if 'hardware' in config:
                hw_config = config['hardware']
                if 'ARDUINO_SERIAL_NUMBERS' in hw_config:
                    serials = hw_config['ARDUINO_SERIAL_NUMBERS']
                    if not isinstance(serials, list) or len(serials) == 0:
                        validation_result['warnings'].append("No Arduino serial numbers configured")
            
            logger.info(f"Configuration validation completed: {validation_result['valid']}")
            
        except Exception as e:
            validation_result['valid'] = False
            validation_result['errors'].append(f"Validation error: {str(e)}")
            logger.error(f"Configuration validation failed: {e}")
        
        return validation_result
    
    def save_config_to_file(self, file_path: Union[str, Path], config: Optional[Dict[str, Any]] = None) -> bool:
        """설정을 파일로 저장"""
        try:
            if config is None:
                config = self.config_cache
            
            file_path = Path(file_path)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"Configuration saved to: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            return False
    
    def load_config_from_file(self, file_path: Union[str, Path]) -> Optional[Dict[str, Any]]:
        """파일에서 설정 로드"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                logger.warning(f"Config file not found: {file_path}")
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            self.config_cache = config
            self.last_loaded = datetime.now()
            
            logger.info(f"Configuration loaded from file: {file_path}")
            return config
            
        except Exception as e:
            logger.error(f"Failed to load configuration from file: {e}")
            return None
    
    def get_config_summary(self) -> Dict[str, Any]:
        """설정 요약 정보"""
        return {
            'last_loaded': self.last_loaded.isoformat() if self.last_loaded else None,
            'config_path': str(self.config_path),
            'environment': os.getenv('TETRIS_ENV', 'production'),
            'sections': list(self.config_cache.keys()) if self.config_cache else [],
            'cache_size': len(str(self.config_cache)) if self.config_cache else 0
        }
    
    def reload_config(self, env: Optional[str] = None) -> Dict[str, Any]:
        """설정 다시 로드"""
        logger.info("Reloading configuration...")
        return self.load_config(env)
    
    def _get_default_config(self) -> Dict[str, Any]:
        """기본 설정 반환"""
        return {
            'web': {
                'HOST': '0.0.0.0',
                'PORT': 5002,
                'DEBUG': False,
                'SECRET_KEY': 'default-key'
            },
            'upload': {
                'MAX_FILE_SIZE': 10 * 1024 * 1024,
                'ALLOWED_EXTENSIONS': {'jpg', 'png', 'jpeg'}
            },
            'environment': 'production'
        }

# 전역 ConfigManager 인스턴스
_config_manager = None

def get_config_manager() -> ConfigManager:
    """전역 ConfigManager 인스턴스 반환"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager

def get_config_value(key_path: str, default: Any = None) -> Any:
    """설정 값 조회 편의 함수"""
    manager = get_config_manager()
    return manager.get_config_value(key_path, default)

def reload_configuration(env: Optional[str] = None) -> Dict[str, Any]:
    """설정 다시 로드 편의 함수"""
    manager = get_config_manager()
    return manager.reload_config(env)
