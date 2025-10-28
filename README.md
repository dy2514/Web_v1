# AI TETRIS
사진 한 장으로 완성되는 AI TETRIS는 Gemini API 기반 새로운 사용자 체감 솔루션입니다.


## 1.주요 기능 🚀
- **AI 기반 분석**: Google Gemini 2.5 Flash 모델을 활용한 이미지 분석 및 최적 배치 생성
- **웹 인터페이스**: 모바일/데스크탑 친화적인 반응형 웹 UI
- **하드웨어 제어**: 4개 아두이노를 통한 실시간 모터 제어
- **실시간 모니터링**: 시스템 성능 및 진행률 실시간 추적
- **다단계 AI 파이프라인**: 4단계 LangChain 기반 AI 처리 체인


## 2.요구사항 📋

### 2.1.시스템 요구사항
- Python 3.8+
- 라즈베리파이 5 (권장)
- 4개 아두이노 보드 (시리얼 번호 설정 필요)
- 웹 브라우저 (Chrome, Firefox, Safari 등)

### 2.2.하드웨어 요구사항
- 아두이노 보드 4개 (각각 고유 시리얼 번호 필요)
- 스테퍼 모터 및 서보 모터
- USB 케이블 (아두이노 연결용)


## 3.설치 및 설정 🛠️

### 3.1.의존성 설치
```bash
pip install -r requirements.txt
```

### 2.1.Google API 키 설정

#### 방법 1: 환경변수 설정
```bash
export GOOGLE_API_KEY="your_google_api_key_here"
```

#### 방법 2: tetris_secrets.json 파일 생성 (권장)
`tetris/tetris_secrets.json` 파일을 생성하고 다음 내용을 입력:

```json
{
  "google": {
    "GOOGLE_API_KEY": "your_google_api_key_here"
  }
}
```


## 4.실행 방법 🚀

### 자동 실행 (권장)
```bash
python tetris_launcher.py
```

### 수동 실행
```bash
# 웹 서버만 실행
python tetris/tetris.py --mode web --port 5002

# 아두이노 제어만 실행
python tetris/arduino_ctrl/arduino_ctrl.py
```

### 웹 접속
- **모바일**: http://localhost:5002/mobile/input
- **데스크탑**: http://localhost:5002/desktop/control
- **메인 페이지**: http://localhost:5002/