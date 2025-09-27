# TETRIS 프로젝트 파일 분석 보고서

## 📋 프로젝트 개요

**TETRIS**는 AI 기반 차량 짐 배치 최적화 시스템으로, 웹 인터페이스를 통해 이미지 업로드, AI 분석, 하드웨어 제어까지 통합적으로 처리하는 시스템입니다.

### 주요 기능
- 모바일/데스크탑 웹 인터페이스
- AI 체인 기반 이미지 분석 및 최적 배치 생성
- 아두이노 기반 하드웨어 제어
- 실시간 상태 모니터링 및 진행률 표시

---

## 🗂️ 프로젝트 구조 분석

### 1. 메인 실행 파일들

#### `tetris_launcher.py` ⭐ **핵심 실행 파일**
- **기능**: 시스템 최종 런처 및 안정적 실행 관리
- **상태**: **활성 사용 중**
- **역할**:
  - 필수 조건 검증 (프로젝트 구조, 패키지 확인)
  - 설정 시스템 로딩 테스트
  - TETRIS 웹 시스템 실행 및 모니터링
  - 웹 접속 확인 및 브라우저 자동 실행
- **연결성**: 모든 핵심 모듈과 연결됨

#### `tetris/tetris.py` ⭐ **메인 시스템 엔진**
- **기능**: AI 체인 실행 및 하드웨어 제어 통합 관리
- **상태**: **활성 사용 중**
- **역할**:
  - 웹/시나리오 모드 실행
  - AI 체인 파이프라인 관리
  - 하드웨어 제어 (아두이노 통신)
  - 단계별 분석 실행
- **연결성**: 모든 AI 체인, 웹 인터페이스, 하드웨어 모듈과 연결

#### `tetris/web_interface/web.py` ⭐ **웹 서버 메인**
- **기능**: Flask 기반 통합 웹 서버
- **상태**: **활성 사용 중**
- **역할**:
  - Flask 앱 초기화 및 Blueprint 등록
  - 네트워크 접근 제어
  - 성능 모니터링 시작
- **연결성**: 모든 웹 컴포넌트와 연결됨

### 2. 설정 및 구성 파일들

#### `tetris/config.py` ⭐ **통합 설정 관리**
- **기능**: 환경별 설정 통합 관리 (라즈베리파이5 최적화)
- **상태**: **활성 사용 중**
- **주요 설정**:
  - 웹 서버 설정 (포트, 호스트, 디버그 모드)
  - 파일 업로드 제한
  - AI 체인 설정
  - 하드웨어 설정 (아두이노 시리얼 번호)
  - 로깅 설정

#### `requirements.txt` ⭐ **의존성 관리**
- **기능**: Python 패키지 의존성 정의
- **상태**: **활성 사용 중**
- **주요 패키지**:
  - Flask, Werkzeug (웹 프레임워크)
  - Pillow (이미지 처리)
  - langchain, google-generativeai (AI)
  - pyserial (하드웨어 통신)

### 3. AI 체인 시스템

#### `tetris/main_chain/main_chain.py` ⭐ **AI 처리 엔진**
- **기능**: 4단계 AI 체인 실행 (이미지 분석 → 짐 인식 → 공간 계산 → 최적 배치)
- **상태**: **활성 사용 중**
- **체인 구조**:
  - Chain1: 이미지 분석 및 짐 인식
  - Chain2: 짐 분류 및 좌석 배치 지시
  - Chain3: 차량 공간 계산
  - Chain4: 16자리 배치 코드 생성
- **연결성**: 모든 프롬프트 파일과 연결됨

#### AI 프롬프트 파일들
- **상태**: **활성 사용 중**
- **파일들**:
  - `chain1_prompt/chain1_prompt.txt`
  - `chain2_prompt/chain2_prompt.txt`, `chain2_option.txt`
  - `chain3_prompt/` 디렉토리의 모든 텍스트 파일 및 이미지

### 4. 웹 인터페이스 구조

#### Blueprint 기반 모듈화 구조

##### `tetris/web_interface/control/` ⭐ **데스크탑 관제 모듈**
- **routes.py**: 데스크탑 관제 화면 라우팅 및 API
- **control_utils.py**: 관제 관련 유틸리티
- **static/css/control.css**: 관제 화면 스타일
- **상태**: **활성 사용 중**

##### `tetris/web_interface/user/` ⭐ **모바일 사용자 모듈**
- **routes.py**: 모바일 입력 화면 라우팅 및 API
- **input_handler.py**: 입력 처리 로직
- **user_utils.py**: 사용자 관련 유틸리티
- **상태**: **활성 사용 중**

##### `tetris/web_interface/source/` ⭐ **공통 소스 모듈**
- **state_manager.py**: 통합 상태 관리
- **api_utils.py**: API 응답 표준화
- **file_handler.py**: 파일 업로드 처리
- **blueprint_registry.py**: Blueprint 등록 관리
- **상태**: **활성 사용 중**

### 5. 유틸리티 모듈들

#### `tetris/utils/` ⭐ **시스템 유틸리티**
- **network_manager.py**: 네트워크 접근 제어
- **performance_monitor.py**: 성능 모니터링 (라즈베리파이5 최적화)
- **port_manager.py**: 포트 동적 할당
- **상태**: **활성 사용 중**

#### `tetris/rpi_controller/` ⭐ **하드웨어 제어**
- **rpi_controller.py**: 아두이노 통신 및 모터 제어
- **arduino_code_template.ino**: 아두이노 코드 템플릿
- **상태**: **활성 사용 중**

### 6. 정적 파일들

#### CSS 파일들
- **base.css**: 기본 스타일 및 디자인 시스템
- **components.css**: 컴포넌트 스타일
- **desktop/control.css**: 데스크탑 관제 화면
- **mobile/**: 모바일 전용 스타일들
- **상태**: **활성 사용 중**

#### JavaScript 파일들
- **desktop/**: 데스크탑 전용 JS (control.js, control-main.js 등)
- **mobile/**: 모바일 전용 JS (input.js, progress.js 등)
- **common/**: 공통 JS (api.js, upload.js 등)
- **utils/**: 유틸리티 JS (validation-utils.js, dom-utils.js 등)
- **상태**: **활성 사용 중**

#### 이미지 및 폰트 파일들
- **images/**: UI 아이콘 및 예시 이미지
- **fonts/**: 현대차 브랜딩 폰트 (HyundaiSans)
- **상태**: **활성 사용 중**

### 7. 템플릿 파일들

#### `tetris/web_interface/source/templates/`
- **desktop/**: 데스크탑 화면 템플릿
  - `control.html`: 메인 관제 화면
  - `components/`: 재사용 가능한 컴포넌트들
- **mobile/**: 모바일 화면 템플릿
  - `home.html`, `input.html`, `progress.html`
- **상태**: **활성 사용 중**

---

## 🔍 파일 사용 현황 분석

### ✅ 활성 사용 중인 파일들 (삭제 금지)

#### 핵심 시스템 파일들
- `tetris_launcher.py` - 메인 런처
- `tetris/tetris.py` - 시스템 엔진
- `tetris/web_interface/web.py` - 웹 서버
- `tetris/config.py` - 설정 관리
- `requirements.txt` - 의존성

#### AI 체인 시스템
- `tetris/main_chain/main_chain.py`
- `tetris/main_chain/chain1_prompt/` 전체
- `tetris/main_chain/chain2_prompt/` 전체
- `tetris/main_chain/chain3_prompt/` 전체

#### 웹 인터페이스
- `tetris/web_interface/control/` 전체
- `tetris/web_interface/user/` 전체
- `tetris/web_interface/source/` 전체

#### 유틸리티 및 하드웨어
- `tetris/utils/` 전체
- `tetris/rpi_controller/` 전체

#### 정적 파일들
- `tetris/web_interface/source/static/` 전체
- `tetris/web_interface/source/templates/` 전체

### ⚠️ 조건부 사용 파일들

#### 테스트/예시 이미지들
- `tetris/web_interface/user_input/luggage_image/` (20개 JPG 파일)
  - **상태**: 시나리오 모드에서 사용 가능
  - **권장사항**: 개발/테스트 완료 후 정리 고려

#### 백업 파일들
- `tetris/web_interface/source/templates/desktop/control_backup_*.html`
  - **상태**: 백업 파일
  - **권장사항**: 안정성 확인 후 삭제 가능

### ❌ 사용되지 않는 파일들 (삭제 권장)

#### 로그 및 임시 파일들
- `debug.log` - 디버그 로그
- `state.json` (루트) - 중복 상태 파일
- `tetris/state.json` - 중복 상태 파일
- `tetris/web_interface/state.json` - 중복 상태 파일

#### 캐시 파일들
- 모든 `__pycache__/` 디렉토리
- `.pyc` 파일들

#### 문서 파일들 (선택적)
- `AI_처리_단계별_진행상황_수정완료보고서.md`
- `ctrl_dev_log.md`
- `TETRIS_시스템_종합문서.md`

---

## 🗑️ 삭제 권장 파일 목록

### 즉시 삭제 가능
```
debug.log
state.json (루트)
tetris/state.json
tetris/web_interface/state.json
모든 __pycache__/ 디렉토리
```

### 개발 완료 후 삭제 고려
```
tetris/web_interface/source/templates/desktop/control_backup_*.html
tetris/web_interface/user_input/luggage_image/ (테스트 이미지들)
AI_처리_단계별_진행상황_수정완료보고서.md
ctrl_dev_log.md
```

---

## 📊 시스템 연결도

```
tetris_launcher.py
    ↓
tetris/tetris.py (메인 엔진)
    ├── tetris/web_interface/web.py (웹 서버)
    │   ├── control/ (데스크탑 관제)
    │   ├── user/ (모바일 입력)
    │   └── source/ (공통 모듈)
    ├── tetris/main_chain/main_chain.py (AI 체인)
    ├── tetris/rpi_controller/ (하드웨어 제어)
    └── tetris/utils/ (시스템 유틸리티)
```

---

## 🎯 권장사항

### 1. 즉시 정리
- 로그 파일 및 중복 상태 파일 삭제
- Python 캐시 파일 정리

### 2. 단계적 정리
- 백업 파일들 안정성 확인 후 삭제
- 테스트 이미지들 개발 완료 후 정리

### 3. 시스템 최적화
- 라즈베리파이5 환경에 최적화된 설정 유지
- 성능 모니터링 시스템 활용
- 네트워크 접근 제어 설정 검토

### 4. 유지보수
- 정기적인 로그 파일 정리
- 의존성 패키지 업데이트 검토
- 하드웨어 연결 상태 모니터링

---

## ✅ 결론

TETRIS 프로젝트는 잘 구조화된 AI 기반 차량 배치 최적화 시스템입니다. 대부분의 파일들이 활성적으로 사용되고 있으며, 삭제 권장 파일들은 주로 로그, 캐시, 백업 파일들로 시스템 운영에 영향을 주지 않습니다. 

시스템의 핵심 기능은 모두 정상적으로 연결되어 있으며, 모듈화된 구조로 유지보수가 용이하게 설계되어 있습니다.
