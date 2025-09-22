# TETRIS 시스템 재구조화 작업 계획서

## 🎯 프로젝트 목표
현재 분리되어 있는 `app.py` (웹 인터페이스)와 `tetris.py` (AI 처리)를 통합하여 `tetris.py`를 메인 진입점으로 하는 통합 시스템 구축

## 🏗️ 목표 구조

### 현재 구조 (문제점)
```
tetris_web/
├── app.py (독립 Flask 서버 - 관제 화면)
├── tetris/
│   ├── tetris.py (독립 AI 처리)
│   ├── main_chain/ (AI 체인)
│   ├── rpi_controller/ (하드웨어 제어)
│   └── user_input/ (독립 웹 서버 - 입력 수집)
├── static/, templates/ (웹 리소스)
└── session_storage/
```

### 목표 구조 (상세 파일 구조)
```
tetris/                              # 최상단 폴더
├── tetris.py                        # 메인 진입점 (통합 시스템) - 웹/시나리오 모드 실행
├── requirements.txt                 # Python 의존성 목록
├── README.md                        # 프로젝트 개요 및 사용법
├── config.py                        # 통합 설정 파일
├── main_chain/                      # AI 체인 처리 모듈
│   ├── __init__.py                  # 모듈 초기화
│   ├── main_chain.py                # 메인 AI 체인 실행기
│   ├── chain1_prompt/               # 1단계 프롬프트
│   │   └── chain1_prompt.txt        # Chain1 프롬프트 파일
│   ├── chain2_prompt/               # 2단계 프롬프트
│   │   ├── chain2_prompt.txt        # Chain2 프롬프트 파일
│   │   └── chain2_option.txt        # Chain2 옵션 파일
│   └── chain3_prompt/               # 3단계 프롬프트
│       ├── chain3_system.txt        # Chain3 시스템 프롬프트
│       ├── chain3_role.txt          # Chain3 역할 프롬프트
│       ├── chain3_prompt_environment.txt  # 환경 프롬프트
│       ├── chain3_prompt_function.txt     # 기능 프롬프트
│       ├── chain3_prompt_output_format.txt # 출력 형식 프롬프트
│       ├── chain3_prompt_example.txt      # 예시 프롬프트
│       ├── chain3_query.txt         # 쿼리 템플릿
│       └── chain3_prompt_image.png  # Chain3 레퍼런스 이미지
├── rpi_controller/                  # 하드웨어 제어 모듈
│   ├── __init__.py                  # 모듈 초기화
│   └── rpi_controller.py            # RPi GPIO 제어 로직 - 아두이노 통신
├── web_interface/                   # 웹 인터페이스 모듈
│   ├── __init__.py                  # 최소화된 모듈 초기화 - Blueprint import만
│   ├── web.py                       # 메인 웹 서버 - Flask 앱 생성 및 Blueprint 등록
│   ├── config.py                    # 웹 설정 파일
│   ├── package_setup.py             # 패키지 초기화 로직 (__init__.py에서 분리)
│   ├── blueprint_registry.py        # Blueprint 등록 관리 (__init__.py에서 분리)
│   ├── control/                     # 데스크탑 관제 영역
│   │   ├── __init__.py              # 최소화된 모듈 초기화 - control_bp export만
│   │   ├── routes.py                # 관제 화면 라우팅 - Blueprint 정의
│   │   ├── control_utils.py         # 관제 화면 전용 유틸리티
│   │   ├── templates/               # 관제 화면 템플릿
│   │   │   └── control.html         # 데스크탑 관제 화면 HTML
│   │   └── static/                  # 관제 화면 정적 파일
│   │       ├── control.css          # 관제 화면 스타일
│   │       └── step-indicator.css   # 단계 표시기 스타일
│   ├── user/                        # 사용자 입력 영역
│   │   ├── __init__.py              # 최소화된 모듈 초기화 - user_bp export만
│   │   ├── routes.py                # 사용자 입력 라우팅 - Blueprint 정의
│   │   ├── input_handler.py         # 사용자 입력 처리 로직
│   │   ├── user_utils.py            # 사용자 영역 전용 유틸리티
│   │   ├── templates/               # 사용자 입력 템플릿
│   │   │   ├── input.html           # 모바일 입력 화면 HTML
│   │   │   ├── progress.html        # 진행상황 화면 HTML
│   │   │   └── result.html          # 결과 화면 HTML
│   │   └── static/                  # 사용자 입력 정적 파일
│   │       ├── input.css            # 입력 화면 스타일
│   │       ├── progress.css         # 진행상황 화면 스타일
│   │       └── result.css           # 결과 화면 스타일
│   ├── source/                      # 공통 리소스
│   │   ├── __init__.py              # 최소화된 모듈 초기화 - 공통 함수 export만
│   │   ├── utils.py                 # 공통 유틸리티 함수
│   │   ├── session_manager.py       # 세션 관리 클래스
│   │   ├── file_handler.py          # 파일 업로드 처리
│   │   ├── config_manager.py        # 설정 관리 (__init__.py에서 분리)
│   │   ├── templates/               # 공통 템플릿
│   │   │   └── base.html            # 기본 레이아웃 템플릿
│   │   ├── static/                  # 공통 정적 파일
│   │   │   ├── base.css             # 기본 스타일 변수
│   │   │   └── js/                  # JavaScript 파일
│   │   │       ├── common/          # 공통 JavaScript 모듈
│   │   │       │   ├── api.js       # API 통신 모듈
│   │   │       │   ├── simulation.js # 시뮬레이션 유틸리티
│   │   │       │   └── upload.js    # 파일 업로드 모듈
│   │   │       ├── desktop/         # 데스크탑 전용 JavaScript
│   │   │       │   └── control.js   # 관제 화면 로직
│   │   │       └── mobile/          # 모바일 전용 JavaScript
│   │   │           ├── input.js     # 입력 화면 로직
│   │   │           ├── progress.js  # 진행상황 화면 로직
│   │   │           └── result.js    # 결과 화면 로직
│   │   ├── session_storage/         # 세션 데이터 저장소
│   │   │   └── sessions.pkl         # 세션 데이터 파일
│   │   └── uploads/                 # 사용자 업로드 파일 저장소
│   │       └── *.jpg                # 업로드된 이미지 파일들
├── user_input/                      # 사용자 입력 데이터 (기존 구조 유지)
│   ├── user_input.py                # 사용자 입력 처리 (시나리오 모드용)
│   ├── luggage_image/               # 테스트용 이미지 데이터
│   │   └── *.jpg                    # 다양한 시나리오 이미지들
│   └── web/                         # 웹 리소스
│       ├── AI_TETRIS.png            # 로고 이미지
│       ├── box.png                  # 아이콘 이미지
│       ├── people.png               # 아이콘 이미지
│       ├── HyundaiHarmonyL.woff2.ttf # 폰트 파일
│       └── HyundaiHarmonyM.woff2.ttf # 폰트 파일
└── tetris_out/                      # TETRIS 처리 결과 저장소
    ├── out_rt/                      # 실시간 처리 결과
    │   └── *.txt                    # 실시간 처리 결과 파일들
    └── out_scenario/                # 시나리오별 결과 파일
        └── *.txt                    # 시나리오별 처리 결과 파일들
```

## 🔄 구조화 이유

### 1. 단일 진입점 필요성
- **현재 문제**: `app.py`와 `tetris.py`가 각각 독립 실행
- **해결**: `tetris.py` 하나로 통합하여 시스템 일관성 확보
- **이유**: 사용자가 하나의 명령어로 전체 시스템 실행 가능

### 2. 웹 기능 중복 제거
- **현재 문제**: `app.py`와 `user_input.py`가 각각 Flask 서버 구현
- **해결**: `web_interface/` 모듈로 통합
- **이유**: 코드 중복 제거 및 유지보수성 향상

### 3. Control과 User 영역 분리
- **현재 문제**: 관제 화면과 사용자 입력이 하나의 코드에 섞임
- **해결**: `control/`과 `user/` 디렉토리로 명확히 분리
- **이유**: 각 영역의 독립적 개발 및 테스트 가능

### 4. 공통 리소스 통합
- **현재 문제**: 정적 파일과 템플릿이 분산되어 관리
- **해결**: `source/` 디렉토리로 공통 리소스 통합
- **이유**: 중복 제거 및 일관된 리소스 관리

## 📋 작업 계획

### Phase 1: 웹 인터페이스 모듈화 (2-3시간)
- [ ] `app.py` → `web_interface/web.py`로 이동
- [ ] `user_input.py` → `web_interface/user/`로 분리
- [ ] Blueprint 기반 라우팅 구조 구현

### Phase 2: 모듈 구조 재정리 (1-2시간)
- [ ] `main_chain/`, `rpi_controller/` 루트 레벨로 이동
- [ ] `user_input/` → `web_interface/`로 통합
- [ ] import 경로 수정

### Phase 3: tetris.py 통합 인터페이스 (3-4시간)
- [ ] 웹 모드 실행 로직 구현
- [ ] AI 체인 및 하드웨어 제어 통합
- [ ] 실시간 통신 시스템 통합

### Phase 4: 파일 구조 재정리 (2-3시간)
- [ ] 디렉토리 구조 재편성
- [ ] 정적 파일 경로 수정
- [ ] 템플릿 구조 정리

### Phase 5: 설정 및 환경 통합 (1시간)
- [ ] 통합 설정 파일 생성
- [ ] 환경 변수 관리 통합
- [ ] 로깅 시스템 통합

### Phase 6: 테스트 및 검증 (2-3시간)
- [ ] 재구조화된 시스템 테스트
- [ ] 웹 모드 동작 확인
- [ ] 시나리오 모드 동작 확인

## 🚀 실행 방법 변경

### 기존 실행 방법
```bash
# 웹 모드 (관제 화면)
python app.py

# AI 처리 모드
python tetris/tetris.py --mode scenario
```

### 새로운 실행 방법
```bash
# 웹 모드 (통합)
python tetris/tetris.py --mode web

# 시나리오 모드 (통합)
python tetris/tetris.py --mode scenario
```

## 🔧 핵심 모듈별 역할

### 1. `tetris.py` (메인 진입점)
- 통합 시스템 관리 및 실행 제어
- 웹 모드와 시나리오 모드 실행 분기
- AI 체인 및 하드웨어 제어 통합 호출
- 전체 파이프라인 실행 관리

### 2. `web_interface/web.py` (메인 웹 서버)
- Flask 앱 생성 및 설정
- Blueprint 등록 및 라우팅 설정
- 웹 서버 시작 및 관리
- CORS 및 보안 설정

### 3. `web_interface/control/` (관제 영역)
- 데스크탑 관제 화면 전용 라우팅
- 시스템 상태 모니터링 API
- AI 처리 시작 및 제어 API
- 실시간 진행상황 표시

### 4. `web_interface/user/` (사용자 영역)
- 모바일 사용자 입력 화면 라우팅
- 파일 업로드 및 검증 처리
- 진행상황 및 결과 표시
- QR 코드 생성 및 표시

### 5. `web_interface/source/` (공통 리소스)
- 모든 영역에서 공통 사용하는 유틸리티
- 세션 관리 및 상태 추적
- 파일 업로드 및 저장 처리
- JavaScript 모듈 및 CSS 스타일
- 기본 템플릿 및 레이아웃

### 6. `main_chain/` (AI 체인 처리)
- LangChain 기반 AI 체인 실행
- 4단계 체인 순차 처리 (chain1~4)
- 프롬프트 파일 관리 및 로딩
- Google Gemini API 연동

### 7. `rpi_controller/` (하드웨어 제어)
- 아두이노 시리얼 통신 관리
- 16-digit 코드 기반 하드웨어 제어
- 센서 데이터 수집 및 모니터링
- 안전 장치 및 오류 처리

### 8. `user_input/` (사용자 입력 데이터)
- 시나리오 모드용 입력 처리
- 테스트용 이미지 데이터 관리
- 웹 리소스 (로고, 아이콘, 폰트) 관리

## 📝 `__init__.py` 최소화 구조 예시

### **web_interface/__init__.py (최소화)**
```python
"""
web_interface 패키지 - 최소화된 초기화
"""
from .control import control_bp
from .user import user_bp
from .config import PACKAGE_CONFIG

__all__ = ['control_bp', 'user_bp', 'PACKAGE_CONFIG']
__version__ = '1.0.0'
```

### **web_interface/package_setup.py (분리된 로직)**
```python
"""
패키지 초기화 로직 - __init__.py에서 분리
"""
import logging
from .config_manager import load_config

def setup_package():
    """패키지 초기 설정"""
    config = load_config()
    logging.basicConfig(level=logging.INFO)
    print(f"web_interface v{config['version']} 초기화 완료")
    return config

def get_package_info():
    """패키지 정보 반환"""
    return {
        'name': 'web_interface',
        'version': '1.0.0',
        'description': 'TETRIS 웹 인터페이스 모듈'
    }
```

### **web_interface/blueprint_registry.py (분리된 로직)**
```python
"""
Blueprint 등록 관리 - __init__.py에서 분리
"""
from .control.routes import control_bp
from .user.routes import user_bp

def get_blueprints():
    """등록할 Blueprint 목록 반환"""
    return [
        (control_bp, '/control'),
        (user_bp, '/user')
    ]

def register_blueprints(app):
    """Flask 앱에 Blueprint 등록"""
    blueprints = get_blueprints()
    for bp, url_prefix in blueprints:
        app.register_blueprint(bp, url_prefix=url_prefix)
```

### **web_interface/control/__init__.py (최소화)**
```python
"""
control 모듈 - 최소화된 초기화
"""
from .routes import control_bp

__all__ = ['control_bp']
```

### **web_interface/control/control_utils.py (분리된 로직)**
```python
"""
관제 화면 전용 유틸리티 - __init__.py에서 분리
"""
def get_control_status():
    """관제 화면 상태 조회"""
    pass

def update_control_progress(progress):
    """관제 화면 진행상황 업데이트"""
    pass

def format_control_data(data):
    """관제 화면 데이터 포맷팅"""
    pass
```

### **web_interface/user/__init__.py (최소화)**
```python
"""
user 모듈 - 최소화된 초기화
"""
from .routes import user_bp

__all__ = ['user_bp']
```

### **web_interface/user/user_utils.py (분리된 로직)**
```python
"""
사용자 영역 전용 유틸리티 - __init__.py에서 분리
"""
def validate_user_input(data):
    """사용자 입력 검증"""
    pass

def process_user_upload(file):
    """사용자 업로드 파일 처리"""
    pass

def generate_user_session():
    """사용자 세션 생성"""
    pass
```

### **web_interface/source/__init__.py (최소화)**
```python
"""
source 모듈 - 최소화된 초기화
"""
from .utils import get_system_status, handle_file_upload
from .session_manager import SessionManager
from .file_handler import FileHandler

__all__ = ['get_system_status', 'handle_file_upload', 'SessionManager', 'FileHandler']
```

### **web_interface/source/config_manager.py (분리된 로직)**
```python
"""
설정 관리 - __init__.py에서 분리
"""
import os
from typing import Dict, Any

DEFAULT_CONFIG = {
    'version': '1.0.0',
    'debug': False,
    'port': 5002,
    'upload_folder': 'uploads',
    'session_timeout': 3600
}

def load_config() -> Dict[str, Any]:
    """설정 로드"""
    config = DEFAULT_CONFIG.copy()
    
    # 환경변수 오버라이드
    config['debug'] = os.getenv('DEBUG', 'false').lower() == 'true'
    config['port'] = int(os.getenv('PORT', config['port']))
    
    return config

def save_config(config: Dict[str, Any]):
    """설정 저장"""
    pass
```

## ⚠️ 주의사항

### 1. 기존 기능 보존
- 현재 동작하는 모든 기능 유지
- 기존 API 엔드포인트 호환성 보장
- 사용자 인터페이스 변경 최소화

### 2. 점진적 마이그레이션
- 단계별로 기능 이전
- 각 단계별 테스트 수행
- 롤백 계획 준비

### 3. 의존성 관리
- import 경로 변경 시 주의
- 모듈 간 순환 참조 방지
- 외부 라이브러리 의존성 유지

## 📊 예상 효과

### 개발 효율성
- 코드 중복 제거
- 모듈화로 병렬 개발 가능
- 명확한 모듈 분리로 디버깅 시간 단축

### 시스템 안정성
- 모듈별 독립적 오류 처리
- 새로운 기능 추가 용이
- 모듈별 독립적 관리

### 사용자 경험
- 하나의 시스템으로 통합
- Control과 User 영역 실시간 연동
- 최적화된 구조로 안정적인 성능

## 📝 작업 진행 시 참고사항

### 방향성 유지 원칙
1. **단일 진입점**: `tetris.py`가 모든 것을 통합 관리
2. **모듈 분리**: Control, User, Source 영역 명확히 분리
3. **기능 보존**: 기존 동작하는 모든 기능 유지
4. **점진적 진행**: 단계별로 안전하게 이전

### 작업 중 확인사항
- 각 단계별로 기존 기능 동작 확인
- import 경로 변경 시 의존성 확인
- 파일 이동 시 경로 참조 수정
- 템플릿 및 정적 파일 경로 수정

---

**작성일**: 2025년 1월 19일  
**상태**: 계획 수립 완료  
**다음 단계**: Phase 1 웹 인터페이스 모듈화 시작
