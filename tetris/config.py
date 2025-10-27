# config.py - TETRIS 통합 설정 파일

import os
import logging
from pathlib import Path
from datetime import datetime

# 기본 설정
BASE_DIR = Path(__file__).resolve().parent

# 환경 설정 (라즈베리파이5 최적화)
ENVIRONMENT = os.getenv('TETRIS_ENV', 'raspberry_pi5')

# 웹 서버 설정
def get_available_port():
    """사용 가능한 포트를 동적으로 할당"""
    try:
        from .utils.port_manager import find_available_port
        port = find_available_port(5002, 5010)
        return port if port else 5002
    except Exception:
        return 5002

WEB_CONFIG = {
    'HOST': '0.0.0.0',
    'PORT': get_available_port(),
    'DEBUG': False,
    'SECRET_KEY': os.getenv('FLASK_SECRET_KEY', 'tetris-stable-key-2024'),
    'THREADED': True,
    'USE_RELOADER': False
}

# 파일 업로드 설정 (라즈베리파이5 최적화)
UPLOAD_CONFIG = {
    'UPLOAD_FOLDER': BASE_DIR / 'tetris_IO' / 'uploads',
    'ALLOWED_EXTENSIONS': {'png', 'jpg', 'jpeg', 'webp'},  # gif 제거로 처리 속도 향상
    'MAX_FILE_SIZE': 5 * 1024 * 1024,  # 5MB로 감소 (메모리 효율성)
    'MIN_PEOPLE_COUNT': 0,
    'MAX_PEOPLE_COUNT': 4
}

# AI 체인 설정
AI_CONFIG = {
    'SECRETS_JSON': BASE_DIR / 'tetris_secrets.json',
    'CHAIN_TIMEOUT': 300,  # 5분
    'MAX_RETRIES': 3
}

# SECRET_KEY를 secrets 파일에서도 읽도록 설정
def load_secret_key():
    """SECRET_KEY를 환경변수 또는 secrets 파일에서 로드"""
    secret_key = os.getenv('FLASK_SECRET_KEY')
    if not secret_key:
        secrets_file = AI_CONFIG['SECRETS_JSON']
        if secrets_file.exists():
            try:
                import json
                with open(secrets_file, 'r', encoding='utf-8') as f:
                    secrets = json.load(f)
                    secret_key = secrets.get('flask', {}).get('SECRET_KEY')
            except Exception:
                pass
    return secret_key or 'tetris-stable-key-2024'

# SECRET_KEY 업데이트
WEB_CONFIG['SECRET_KEY'] = load_secret_key()

# 하드웨어 설정
HARDWARE_CONFIG = {
    'ARDUINO_SERIAL_NUMBERS': [
        '33437363436351303113',  # 셀 1번
        '3343736343635121F0B0',  # 셀 2번
        '33437363436351409183',  # 셀 3번
        '33437363436351010223'   # 셀 4번
    ],
    'BAUD_RATE': 9600,
    'AUTOMATION_COMMAND_LENGTH': 16,
    'CONNECTION_TIMEOUT': 5.0,
    'OPERATION_TIMEOUT': 30.0
}

# 출력 설정
OUTPUT_CONFIG = {
    'OUTPUT_ROOT': BASE_DIR / 'tetris_IO',
    'OUTPUT_RT_DIR': BASE_DIR / 'tetris_IO' / 'out_rt',
    'OUTPUT_SCENARIO_DIR': BASE_DIR / 'tetris_IO' / 'out_scenario'
}

# 로깅 설정 (라즈베리파이5 최적화)
LOGGING_CONFIG = {
    'LEVEL': 'WARNING',  # INFO에서 WARNING으로 변경 (로그 크기 감소)
    'FORMAT': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'LOG_FILE': BASE_DIR / 'logs' / f'tetris_{datetime.now().strftime("%Y%m%d")}.log',
    'MAX_BYTES': 5 * 1024 * 1024,  # 5MB로 감소
    'BACKUP_COUNT': 3,  # 백업 파일 수 감소
    'MODULE_LEVELS': {
        'tetris.web_interface': 'WARNING',
        'tetris.main_chain': 'INFO',  # AI 체인은 여전히 INFO 유지
        'tetris.rpi_controller': 'INFO',  # 하드웨어 제어는 INFO 유지
        'flask': 'ERROR',
        'werkzeug': 'ERROR'
    }
}

# 통합 로깅 설정 함수
def setup_logging(config):
    """통합 로깅 시스템 설정"""
    # 로그 디렉토리 생성
    log_dir = config['logging']['LOG_FILE'].parent
    log_dir.mkdir(exist_ok=True)
    
    # 로깅 설정
    logging.basicConfig(
        level=getattr(logging, config['logging']['LEVEL']),
        format=config['logging']['FORMAT'],
        handlers=[
            logging.FileHandler(config['logging']['LOG_FILE'], encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    # 모듈별 로그 레벨 설정
    for module, level in config['logging']['MODULE_LEVELS'].items():
        logging.getLogger(module).setLevel(getattr(logging, level))
    
    return logging.getLogger('tetris')

# 환경별 설정
def get_config(env=None):
    """환경별 설정 반환"""
    if env is None:
        env = ENVIRONMENT
    
    config = {
        'web': WEB_CONFIG.copy(),
        'upload': UPLOAD_CONFIG.copy(),
        'ai': AI_CONFIG.copy(),
        'hardware': HARDWARE_CONFIG.copy(),
        'output': OUTPUT_CONFIG.copy(),
        'logging': LOGGING_CONFIG.copy(),
        'environment': env
    }
    
    if env == 'development':
        config['web']['DEBUG'] = True
        config['web']['USE_RELOADER'] = True
        config['web']['PORT'] = 5002
        config['logging']['LEVEL'] = 'DEBUG'
        config['logging']['MODULE_LEVELS']['tetris.web_interface'] = 'DEBUG'
        
    elif env == 'testing':
        config['web']['DEBUG'] = False
        config['web']['PORT'] = 5003
        config['logging']['LEVEL'] = 'WARNING'
        config['upload']['MAX_FILE_SIZE'] = 1024 * 1024  # 1MB for testing
        
    elif env == 'production':
        config['web']['DEBUG'] = False
        config['web']['USE_RELOADER'] = False
        config['logging']['LEVEL'] = 'INFO'
        
    elif env == 'raspberry_pi5':
        # 라즈베리파이5 16GB 전용 최적화 설정
        config['web']['DEBUG'] = False
        config['web']['USE_RELOADER'] = False
        config['web']['THREADED'] = True
        config['logging']['LEVEL'] = 'WARNING'
        config['upload']['MAX_FILE_SIZE'] = 5 * 1024 * 1024  # 5MB
        config['logging']['MAX_BYTES'] = 5 * 1024 * 1024  # 5MB
        config['logging']['BACKUP_COUNT'] = 3
    
    return config

# 전역 설정 인스턴스
_config = None

def get_global_config():
    """전역 설정 인스턴스 반환"""
    global _config
    if _config is None:
        _config = get_config()
    return _config
