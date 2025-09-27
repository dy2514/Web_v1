# TETRIS 실제 사용 파일 분석 보고서
## tetris_launcher.py 기준 의존성 추적 분석

---

## 🔍 분석 개요

`tetris_launcher.py`를 시작점으로 하여 실제로 시스템이 사용하는 파일들과 사용하지 않는 파일들을 정확히 분석했습니다.

### 📋 실행 흐름 분석

```
tetris_launcher.py
    ↓
1. check_prerequisites() - 필수 조건 확인
    ├── tetris/ 디렉토리 존재 확인
    ├── tetris/tetris.py 파일 존재 확인
    ├── tetris/web_interface/ 디렉토리 존재 확인
    └── flask, PIL, langchain 패키지 확인
    ↓
2. test_config_loading() - 설정 로딩
    └── tetris/config.py에서 get_config() 호출
    ↓
3. launch_tetris_web() - TETRIS 웹 시스템 실행
    └── subprocess로 "tetris/tetris.py --mode web" 실행
    ↓
4. verify_web_access() - 웹 접속 확인
    └── requests 모듈로 웹 페이지 접근 테스트
```

---

## ✅ 실제 사용되는 파일들 (tetris_launcher.py 기준)

### 1. 핵심 실행 파일들
- **`tetris_launcher.py`** - 메인 런처
- **`tetris/tetris.py`** - 시스템 엔진 (subprocess로 실행)
- **`tetris/config.py`** - 설정 관리 (get_config 호출)

### 2. tetris.py에서 직접 로드되는 파일들
- **`tetris/main_chain/main_chain.py`** - AI 체인 시스템
- **`tetris/rpi_controller/rpi_controller.py`** - 하드웨어 제어
- **`tetris/web_interface/user_input/user_input.py`** - 사용자 입력 처리
- **`tetris/web_interface/web.py`** - 웹 서버 (웹 모드에서)

### 3. 웹 인터페이스 관련 파일들
#### Blueprint 모듈들
- **`tetris/web_interface/control/`** 전체
  - `__init__.py`, `routes.py`, `control_utils.py`
- **`tetris/web_interface/user/`** 전체
  - `__init__.py`, `routes.py`, `input_handler.py`, `user_utils.py`

#### 공통 소스 모듈들
- **`tetris/web_interface/source/state_manager.py`** - 상태 관리
- **`tetris/web_interface/source/api_utils.py`** - API 응답 표준화
- **`tetris/web_interface/source/file_handler.py`** - 파일 업로드 처리
- **`tetris/web_interface/source/simple_config.py`** - 간단 설정 (user/routes.py에서 사용)
- **`tetris/web_interface/source/utils.py`** - 공통 유틸리티
- **`tetris/web_interface/source/__init__.py`** - 모듈 초기화

### 4. AI 체인 관련 파일들
#### 프롬프트 파일들 (main_chain.py에서 로드)
- **`tetris/main_chain/chain1_prompt/chain1_prompt.txt`**
- **`tetris/main_chain/chain2_prompt/chain2_prompt.txt`**
- **`tetris/main_chain/chain2_prompt/chain2_option.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_system.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_query.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_role.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_environment.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_function.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_output_format.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_example.txt`**
- **`tetris/main_chain/chain3_prompt/chain3_prompt_image.png`**

### 5. 유틸리티 모듈들
- **`tetris/utils/network_manager.py`** - 네트워크 접근 제어
- **`tetris/utils/performance_monitor.py`** - 성능 모니터링
- **`tetris/utils/port_manager.py`** - 포트 관리
- **`tetris/utils/__init__.py`** - 모듈 초기화

### 6. 하드웨어 관련 파일들
- **`tetris/rpi_controller/arduino_code_template.ino`** - 아두이노 코드 템플릿

### 7. 웹 정적 파일들
#### 템플릿 파일들
- **`tetris/web_interface/source/templates/desktop/control.html`**
- **`tetris/web_interface/source/templates/desktop/components/`** 전체
- **`tetris/web_interface/source/templates/mobile/`** 전체

#### CSS 파일들
- **`tetris/web_interface/source/static/css/`** 전체
- **`tetris/web_interface/control/static/css/`** 전체
- **`tetris/web_interface/user/static/css/`** 전체

#### JavaScript 파일들
- **`tetris/web_interface/source/static/js/`** 전체

#### 이미지 및 폰트 파일들
- **`tetris/web_interface/source/static/images/`** 전체
- **`tetris/web_interface/source/static/fonts/`** 전체
- **`tetris/web_interface/user_input/web/`** 전체

### 8. 설정 및 비밀 파일들
- **`tetris/tetris_secrets.json`** - API 키 등 비밀 정보
- **`requirements.txt`** - Python 의존성

---

## ❌ 사용되지 않는 파일들 (삭제 가능)

### 1. 중복/백업 프롬프트 파일들
- **`tetris/main_chain/chain3_prompt/chain3_prompt_environment_2.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_prompt_example_2.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_prompt_example_3.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_prompt_function_3.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_prompt_output_format_2.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_prompt_output_format_3.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_query_2.txt`** ❌
- **`tetris/main_chain/chain3_prompt/chain3_query_3.txt`** ❌

**이유**: main_chain.py에서 이 파일들을 참조하지 않음. 버전 2, 3은 사용되지 않는 백업 파일들

### 2. 미사용 소스 모듈들
- **`tetris/web_interface/source/config_manager.py`** ❌
- **`tetris/web_interface/source/blueprint_registry.py`** ❌
- **`tetris/web_interface/source/session_manager.py`** ❌

**이유**: 
- `config_manager.py`: simple_config.py를 사용하므로 미사용
- `blueprint_registry.py`: 실제 Blueprint 등록에 사용되지 않음
- `session_manager.py`: state_manager.py를 사용하므로 미사용

### 3. 미사용 JavaScript 파일들
- **`tetris/web_interface/source/static/js/common/simulation.js`** ❌

**이유**: api.js에서 시뮬레이션 기능을 제공하므로 별도 파일 불필요

### 4. 문서 및 설명 파일들
- **`tetris/web_interface/source/templates/desktop/README.md`** ❌ (빈 파일)

### 5. 테스트/예시 이미지들
- **`tetris/web_interface/user_input/luggage_image/`** 전체 (20개 JPG 파일) ❌

**이유**: 시나리오 모드에서만 사용 가능하지만 실제 웹 모드에서는 사용되지 않음

### 6. 중복 디렉토리 구조
- **`tetris/tetris/web_interface/source/uploads/`** ❌ (빈 디렉토리)

**이유**: 올바른 경로는 `tetris/web_interface/source/uploads/`

### 7. 로그 및 임시 파일들
- **`debug.log`** ❌
- **`state.json`** (루트) ❌
- **`tetris/state.json`** ❌
- **`tetris/web_interface/state.json`** ❌

**이유**: 중복된 상태 파일들, state_manager.py에서 통합 관리

### 8. 캐시 파일들
- **모든 `__pycache__/` 디렉토리** ❌
- **`tetris/web_interface/source/session_storage/sessions.pkl`** ❌

### 9. 개발 문서들
- **`AI_처리_단계별_진행상황_수정완료보고서.md`** ❌
- **`ctrl_dev_log.md`** ❌
- **`TETRIS_시스템_종합문서.md`** ❌

---

## 🗑️ 즉시 삭제 권장 파일 목록

### 높은 우선순위 (즉시 삭제)
```
# 중복 프롬프트 파일들
tetris/main_chain/chain3_prompt/chain3_prompt_environment_2.txt
tetris/main_chain/chain3_prompt/chain3_prompt_example_2.txt
tetris/main_chain/chain3_prompt/chain3_prompt_example_3.txt
tetris/main_chain/chain3_prompt/chain3_prompt_function_3.txt
tetris/main_chain/chain3_prompt/chain3_prompt_output_format_2.txt
tetris/main_chain/chain3_prompt/chain3_prompt_output_format_3.txt
tetris/main_chain/chain3_prompt/chain3_query_2.txt
tetris/main_chain/chain3_prompt/chain3_query_3.txt

# 미사용 소스 모듈들
tetris/web_interface/source/config_manager.py
tetris/web_interface/source/blueprint_registry.py
tetris/web_interface/source/session_manager.py

# 미사용 JavaScript
tetris/web_interface/source/static/js/common/simulation.js

# 로그 및 임시 파일들
debug.log
state.json (루트)
tetris/state.json
tetris/web_interface/state.json
tetris/web_interface/source/session_storage/sessions.pkl

# 캐시 디렉토리들
모든 __pycache__/ 디렉토리
```

### 중간 우선순위 (검토 후 삭제)
```
# 테스트 이미지들 (20개)
tetris/web_interface/user_input/luggage_image/ 전체

# 개발 문서들
AI_처리_단계별_진행상황_수정완료보고서.md
ctrl_dev_log.md
TETRIS_시스템_종합문서.md

# 빈 파일들
tetris/web_interface/source/templates/desktop/README.md
```

### 낮은 우선순위 (선택적 삭제)
```
# 중복 디렉토리
tetris/tetris/web_interface/source/uploads/ (빈 디렉토리)
```

---

## 📊 삭제 효과 분석

### 용량 절약
- **중복 프롬프트 파일들**: ~50KB
- **테스트 이미지들**: ~10MB
- **캐시 파일들**: ~5MB
- **로그 파일들**: ~1MB
- **총 예상 절약**: ~16MB

### 시스템 정리 효과
- **파일 구조 단순화**: 불필요한 중복 제거
- **유지보수성 향상**: 명확한 의존성 구조
- **성능 개선**: 불필요한 파일 스캔 제거
- **개발 효율성**: 혼란 요소 제거

---

## ✅ 결론

`tetris_launcher.py`를 기준으로 한 실제 의존성 분석 결과:

1. **핵심 시스템 파일들**은 모두 정상적으로 연결되어 사용 중
2. **중복/백업 파일들**이 상당수 존재하여 정리 필요
3. **미사용 모듈들**이 일부 있어 제거 가능
4. **테스트/개발 파일들**이 운영 환경에서 불필요

**권장사항**: 높은 우선순위 파일들부터 단계적으로 삭제하여 시스템을 정리하시기 바랍니다.
