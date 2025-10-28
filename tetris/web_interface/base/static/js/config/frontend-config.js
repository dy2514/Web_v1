/**
 * Frontend Configuration
 * TETRIS Web Interface - 라즈베리파이5 최적화 설정
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 */

const CONFIG = {
    // API 설정
    API: {
        BASE_URL: '',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        MAX_RETRY_DELAY: 10000
    }, 

    // SSE (Server-Sent Events) 설정
    SSE: {
        RECONNECT_ATTEMPTS: 5,
        RECONNECT_DELAY: 1000,
        MAX_RECONNECT_DELAY: 30000,
        HEARTBEAT_INTERVAL: 30000,
        CONNECTION_TIMEOUT: 15000
    },

    // UI 업데이트 설정
    UI: {
        POLLING_INTERVAL: {
            ACTIVE: 2000,    // 처리 중일 때 (2초)
            IDLE: 10000,     // 대기 중일 때 (10초)
            ERROR: 30000     // 오류 상태일 때 (30초)
        },
        NOTIFICATION_DURATION: 5000,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 300,
        UPDATE_BATCH_SIZE: 10
    },

    // 세션 관리 설정
    SESSION: {
        ID_LENGTH: 16,
        TIMEOUT: 3600000,    // 1시간
        CLEANUP_INTERVAL: 300000  // 5분마다 정리
    },

    // 에러 메시지
    MESSAGES: {
        ERRORS: {
            NETWORK: '네트워크 연결을 확인해주세요.',
            SESSION_EXPIRED: '세션이 만료되었습니다. 페이지를 새로고침해주세요.',
            SESSION_INVALID: '올바르지 않은 세션입니다.',
            SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            UPLOAD_FAILED: '파일 업로드에 실패했습니다.',
            PROCESSING_FAILED: 'AI 처리 중 오류가 발생했습니다.',
            CONNECTION_LOST: '서버와의 연결이 끊어졌습니다.',
            VALIDATION_ERROR: '입력값을 확인해주세요.',
            PERMISSION_DENIED: '권한이 없습니다.',
            TIMEOUT: '요청 시간이 초과되었습니다.'
        },
        SUCCESS: {
            UPLOAD_COMPLETE: '파일 업로드가 완료되었습니다.',
            PROCESSING_STARTED: 'AI 처리가 시작되었습니다.',
            PROCESSING_COMPLETE: 'AI 처리가 완료되었습니다.',
            CONNECTION_RESTORED: '서버 연결이 복구되었습니다.',
            SYSTEM_RESET: '시스템이 초기화되었습니다.',
            SESSION_STARTED: '세션이 시작되었습니다.'
        },
        INFO: {
            CONNECTING: '서버에 연결하는 중...',
            RECONNECTING: '서버에 재연결하는 중...',
            UPLOADING: '파일을 업로드하는 중...',
            PROCESSING: 'AI 처리 중입니다...',
            WAITING_INPUT: '사용자 입력을 기다리는 중입니다.'
        }
    },

    // 에러 유형 및 처리 방식
    ERROR_TYPES: {
        NETWORK: {
            code: 'NETWORK_ERROR',
            severity: 'HIGH',
            autoRetry: true,
            maxRetries: 3,
            backoffMultiplier: 2
        },
        SESSION: {
            code: 'SESSION_ERROR',
            severity: 'MEDIUM',
            autoRetry: false,
            requiresReload: true
        },
        VALIDATION: {
            code: 'VALIDATION_ERROR',
            severity: 'LOW',
            autoRetry: false,
            showToUser: true
        },
        SERVER: {
            code: 'SERVER_ERROR',
            severity: 'HIGH',
            autoRetry: true,
            maxRetries: 2,
            backoffMultiplier: 1.5
        },
        TIMEOUT: {
            code: 'TIMEOUT_ERROR',
            severity: 'MEDIUM',
            autoRetry: true,
            maxRetries: 2
        }
    },

    // API 엔드포인트
    ENDPOINTS: {
        // 데스크탑 관제 API
        DESKTOP: {
            CONTROL: '/desktop/control',
            STATUS: '/desktop/api/status',
            STATUS_STREAM: '/desktop/api/status_stream',
            PROGRESS_STREAM: '/desktop/api/progress_stream',
            RESET: '/desktop/api/reset',
            JOIN_SESSION: '/desktop/api/join_session',
            SESSIONS: '/desktop/api/sessions',
            TRIGGER_HARDWARE: '/desktop/api/trigger_hardware',
            QR_PNG: '/desktop/qr.png',
            STEP_ANALYSIS: '/desktop/api/step_analysis'
        },
        // 모바일 사용자 API
        MOBILE: {
            INPUT: '/mobile/input',
            UPLOAD: '/mobile/api/upload',
            PROGRESS: '/mobile/progress',
            RESULT: '/mobile/result'
        },
        // 시스템 API
        SYSTEM: {
            PERFORMANCE: '/api/system/performance'
        }
    },

    // 라즈베리파이5 최적화 설정
    RASPBERRY_PI: {
        MEMORY_THRESHOLD: 90,     // 16GB 기준 90% 사용량 임계값
        CPU_THRESHOLD: 80,        // CPU 사용률 80% 임계값
        DISK_THRESHOLD: 85,       // 디스크 사용률 85% 임계값
        MAX_CONCURRENT_REQUESTS: 5,  // 동시 요청 제한
        FILE_SIZE_LIMIT: 5 * 1024 * 1024,  // 5MB 파일 크기 제한
        LOG_LEVEL: 'INFO'         // 성능 최적화를 위한 로그 레벨
    },

    // 개발/디버깅 설정
    DEBUG: {
        ENABLED: false,           // 운영 환경에서는 false
        LOG_REQUESTS: false,      // HTTP 요청 로깅
        LOG_SSE_EVENTS: false,   // SSE 이벤트 로깅
        LOG_DOM_UPDATES: false,  // DOM 업데이트 로깅
        PERFORMANCE_MONITORING: true  // 성능 모니터링
    },

    // 브라우저 호환성
    BROWSER_SUPPORT: {
        MIN_CHROME_VERSION: 80,
        MIN_FIREFOX_VERSION: 75,
        MIN_SAFARI_VERSION: 13,
        FEATURES: {
            FETCH_API: true,
            EVENT_SOURCE: true,
            WEB_WORKERS: false,      // 라즈베리파이5 최적화를 위해 비활성화
            SERVICE_WORKER: false    // 복잡성 감소를 위해 비활성화
        }
    },

    // 현대자동차 브랜드 설정
    HYUNDAI: {
        BRAND_COLORS: {
            PRIMARY: '#002c5f',      // 현대 네이비
            SECONDARY: '#0066cc',    // 현대 블루
            SUCCESS: '#28a745',      // 성공 색상
            WARNING: '#ffc107',      // 경고 색상
            ERROR: '#dc3545',        // 오류 색상
            INFO: '#17a2b8'          // 정보 색상
        },
        FONTS: {
            PRIMARY: 'HyundaiSans',
            FALLBACK: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
        },
        ANIMATIONS: {
            DURATION: 300,
            EASING: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        }
    }
};

// 환경별 설정 오버라이드
if (typeof window !== 'undefined') {
    // 개발 환경 감지
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        CONFIG.DEBUG.ENABLED = true;
        CONFIG.DEBUG.LOG_REQUESTS = true;
        CONFIG.API.TIMEOUT = 10000;  // 개발 환경에서는 더 짧은 타임아웃
    }

    // 라즈베리파이 환경 감지 (User-Agent 기반)
    const isRaspberryPi = navigator.userAgent.includes('Linux') && 
                         (navigator.hardwareConcurrency <= 4);
    
    if (isRaspberryPi) {
        CONFIG.UI.UPDATE_BATCH_SIZE = 5;  // 배치 크기 감소
        CONFIG.SSE.HEARTBEAT_INTERVAL = 60000;  // 하트비트 간격 증가
        CONFIG.UI.POLLING_INTERVAL.IDLE = 15000;  // 폴링 간격 증가
    }
}

// 설정 검증
function validateConfig() {
    const requiredKeys = ['API', 'SSE', 'UI', 'MESSAGES', 'ENDPOINTS'];
    
    for (const key of requiredKeys) {
        if (!CONFIG[key]) {
            console.error(`Missing required config key: ${key}`);
            return false;
        }
    }
    
    // 타임아웃 값 검증
    if (CONFIG.API.TIMEOUT < 1000 || CONFIG.API.TIMEOUT > 60000) {
        console.warn('API timeout should be between 1-60 seconds');
    }
    
    return true;
}

// 설정 가져오기 헬퍼 함수
function getConfig(path, defaultValue = null) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

// 전역 exports
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.getConfig = getConfig;
    window.validateConfig = validateConfig;
    
    // 설정 검증 실행
    if (!validateConfig()) {
        console.error('Configuration validation failed');
    }
}

// Node.js 환경에서도 사용 가능
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getConfig, validateConfig };
}
