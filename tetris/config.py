# config.py - TETRIS 통합 설정 파일

import os
import logging
from pathlib import Path
from datetime import datetime

# 기본 설정
BASE_DIR = Path(__file__).resolve().parent

# 환경 설정
ENVIRONMENT = os.getenv('TETRIS_ENV', 'production')

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
    'SECRET_KEY': os.getenv('FLASK_SECRET_KEY', '2025ESWContest-ATM'),  # Flask 기본 동작용
    'THREADED': True,
    'USE_RELOADER': False
}

# 파일 업로드 설정
UPLOAD_CONFIG = {
    'UPLOAD_FOLDER': BASE_DIR / 'tetris_IO' / 'uploads',
    'ALLOWED_EXTENSIONS': {'png', 'jpg', 'jpeg', 'webp'},
    'MAX_FILE_SIZE': 10 * 1024 * 1024,  # 10MB
    'MIN_PEOPLE_COUNT': 0,
    'MAX_PEOPLE_COUNT': 4
}

# AI 체인 설정
AI_CONFIG = {
    'SECRETS_JSON': BASE_DIR / 'tetris_secrets.json',  # Google API 키 저장용
    'CHAIN_TIMEOUT': 300,  # 5분
    'MAX_RETRIES': 3
}

# 하드웨어 설정 (아두이노 모터 제어용)
HARDWARE_CONFIG = {
    'ARDUINO_SERIAL_NUMBERS': [
        '33437363436351303113',  # 셀 1번 아두이노
        '3343736343635121F0B0',  # 셀 2번 아두이노
        '33437363436351409183',  # 셀 3번 아두이노
        '33437363436351010223'   # 셀 4번 아두이노
    ],
    'BAUD_RATE': 9600,  # 시리얼 통신 속도
    'AUTOMATION_COMMAND_LENGTH': 16,  # AI 생성 배치 코드 길이
    'CONNECTION_TIMEOUT': 5.0,  # 연결 대기 시간 (초)
    'OPERATION_TIMEOUT': 30.0   # 작업 완료 대기 시간 (초)
}

# 출력 설정 (AI 분석 결과 저장용)
OUTPUT_CONFIG = {
    'OUTPUT_ROOT': BASE_DIR / 'tetris_IO'  # 메인 출력 디렉토리
}

# 로깅 설정
LOGGING_CONFIG = {
    'LEVEL': 'INFO',
    'FORMAT': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'LOG_FILE': BASE_DIR / 'logs' / f'tetris_{datetime.now().strftime("%Y%m%d")}.log',
    'MAX_BYTES': 10 * 1024 * 1024,  # 10MB
    'BACKUP_COUNT': 5,
    'MODULE_LEVELS': {
        'tetris.web_interface': 'INFO',
        'tetris.main_chain': 'INFO',
        'tetris.rpi_controller': 'INFO',
        'flask': 'WARNING',
        'werkzeug': 'WARNING'
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

# 환경별 설정 함수
def get_config(env=None):
    """환경별 설정 반환"""
    if env is None:
        env = ENVIRONMENT
    
    # 기본 설정 복사
    config = {
        'web': WEB_CONFIG.copy(),
        'upload': UPLOAD_CONFIG.copy(),
        'ai': AI_CONFIG.copy(),
        'hardware': HARDWARE_CONFIG.copy(),
        'output': OUTPUT_CONFIG.copy(),
        'logging': LOGGING_CONFIG.copy(),
        'environment': env
    }
    
    # 개발 환경 설정
    if env == 'development':
        config['web']['DEBUG'] = True
        config['web']['USE_RELOADER'] = True
        config['web']['PORT'] = 5002
        config['logging']['LEVEL'] = 'DEBUG'
        config['logging']['MODULE_LEVELS']['tetris.web_interface'] = 'DEBUG'
        
    # 테스트 환경 설정
    elif env == 'testing':
        config['web']['DEBUG'] = False
        config['web']['PORT'] = 5003
        config['logging']['LEVEL'] = 'WARNING'
        config['upload']['MAX_FILE_SIZE'] = 1024 * 1024  # 1MB for testing
        
    # 프로덕션 환경 설정
    elif env == 'production':
        config['web']['DEBUG'] = False
        config['web']['USE_RELOADER'] = False
        config['logging']['LEVEL'] = 'INFO'
        
    
    return config

# 전역 설정 인스턴스 관리
_config = None

def get_global_config():
    """전역 설정 인스턴스 반환 (싱글톤 패턴)"""
    global _config
    if _config is None:
        _config = get_config()
    return _config
