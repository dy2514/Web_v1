"""
Simplified configuration management - config.py + environment variables
"""
import os
from typing import Any, Dict

def get_config(env: str = None) -> Dict[str, Any]:
    """설정 로드 - 환경변수 우선, 기본값 폴백"""
    
    # 환경 감지
    if env is None:
        env = os.getenv('TETRIS_ENV', 'production')
    
    # 기본 설정
    config = {
        'web': {
            'HOST': os.getenv('TETRIS_HOST', '0.0.0.0'),
            'PORT': int(os.getenv('TETRIS_PORT', '5002')),
            'DEBUG': os.getenv('TETRIS_DEBUG', 'false').lower() == 'true',
            'SECRET_KEY': os.getenv('TETRIS_SECRET_KEY', 'dev-secret-key-change-in-production'),
            'THREADED': True,
            'USE_RELOADER': False
        },
        'websocket': {
            'HOST': os.getenv('TETRIS_WS_HOST', 'localhost'),
            'PORT': int(os.getenv('TETRIS_WS_PORT', '8765'))
        },
        'upload': {
            'MAX_FILE_SIZE': int(os.getenv('TETRIS_MAX_FILE_SIZE', '10485760')),  # 10MB
            'ALLOWED_EXTENSIONS': {'jpg', 'jpeg', 'png', 'gif', 'webp'},
            'UPLOAD_FOLDER': os.getenv('TETRIS_UPLOAD_FOLDER', 'uploads')
        },
        'ai': {
            'API_KEY': os.getenv('TETRIS_AI_API_KEY', ''),
            'MODEL': os.getenv('TETRIS_AI_MODEL', 'gemini-pro'),
            'TIMEOUT': int(os.getenv('TETRIS_AI_TIMEOUT', '120'))
        },
        'hardware': {
            'ARDUINO_PORT': os.getenv('TETRIS_ARDUINO_PORT', '/dev/ttyUSB0'),
            'BAUD_RATE': int(os.getenv('TETRIS_BAUD_RATE', '9600')),
            'CONNECTION_TIMEOUT': int(os.getenv('TETRIS_CONNECTION_TIMEOUT', '5'))
        },
        'logging': {
            'LEVEL': os.getenv('TETRIS_LOG_LEVEL', 'INFO'),
            'FILE': os.getenv('TETRIS_LOG_FILE', 'logs/tetris.log'),
            'MAX_SIZE': int(os.getenv('TETRIS_LOG_MAX_SIZE', '10485760')),  # 10MB
            'BACKUP_COUNT': int(os.getenv('TETRIS_LOG_BACKUP_COUNT', '5'))
        },
        'performance': {
            'MONITORING_ENABLED': os.getenv('TETRIS_MONITORING', 'true').lower() == 'true',
            'MONITORING_INTERVAL': int(os.getenv('TETRIS_MONITORING_INTERVAL', '30')),
            'MEMORY_LIMIT': int(os.getenv('TETRIS_MEMORY_LIMIT', '1073741824'))  # 1GB
        }
    }
    
    # 개발 환경 설정
    if env == 'development':
        config['web']['DEBUG'] = True
        config['web']['USE_RELOADER'] = True
        config['logging']['LEVEL'] = 'DEBUG'
    
    # 프로덕션 환경 설정
    elif env == 'production':
        config['web']['DEBUG'] = False
        config['web']['USE_RELOADER'] = False
        config['logging']['LEVEL'] = 'WARNING'
    
    return config

def get_web_config() -> Dict[str, Any]:
    """웹 설정만 반환"""
    return get_config()['web']

def get_websocket_config() -> Dict[str, Any]:
    """WebSocket 설정만 반환"""
    return get_config()['websocket']

def get_upload_config() -> Dict[str, Any]:
    """업로드 설정만 반환"""
    return get_config()['upload']

def get_ai_config() -> Dict[str, Any]:
    """AI 설정만 반환"""
    return get_config()['ai']

def get_hardware_config() -> Dict[str, Any]:
    """하드웨어 설정만 반환"""
    return get_config()['hardware']

def get_logging_config() -> Dict[str, Any]:
    """로깅 설정만 반환"""
    return get_config()['logging']

def get_performance_config() -> Dict[str, Any]:
    """성능 설정만 반환"""
    return get_config()['performance']

# 환경변수 검증
def validate_config(config: Dict[str, Any]) -> bool:
    """설정 검증"""
    required_keys = [
        'web.SECRET_KEY',
        'ai.API_KEY'
    ]
    
    for key_path in required_keys:
        keys = key_path.split('.')
        value = config
        
        for key in keys:
            if not isinstance(value, dict) or key not in value:
                print(f"❌ 필수 설정 누락: {key_path}")
                return False
            value = value[key]
        
        if not value:
            print(f"❌ 필수 설정 값이 비어있음: {key_path}")
            return False
    
    print("✅ 설정 검증 통과")
    return True

# 설정 출력
def print_config(config: Dict[str, Any]):
    """설정 정보 출력"""
    print("🔧 TETRIS 설정 정보")
    print("=" * 50)
    
    for section, settings in config.items():
        print(f"\n📁 {section.upper()}")
        for key, value in settings.items():
            # 민감한 정보는 마스킹
            if 'key' in key.lower() or 'secret' in key.lower():
                value = '***' if value else 'None'
            print(f"  {key}: {value}")
    
    print("=" * 50)
