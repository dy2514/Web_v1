/**
 * Error Handler System
 * TETRIS Web Interface - 통합 에러 처리 시스템
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 */

class ErrorHandler {
    constructor(options = {}) {
        this.config = window.CONFIG || {};
        this.errorTypes = this.config.ERROR_TYPES || {};
        this.messages = this.config.MESSAGES?.ERRORS || {};
        
        // 에러 통계
        this.errorStats = {
            total: 0,
            byType: {},
            byHour: {},
            lastError: null
        };
        
        // 재시도 관리
        this.retryQueue = new Map();
        this.isProcessingRetries = false;
        
        // 알림 관리
        this.notificationContainer = null;
        this.activeNotifications = new Map();
        
        // 자동 복구 설정
        this.recoveryConfig = {
            enabled: true,
            maxConcurrentRetries: 3,
            globalCooldown: 5000  // 5초
        };
        
        this.init();
    }

    /**
     * 에러 핸들러 초기화
     */
    init() {
        this.createNotificationContainer();
        this.setupGlobalErrorHandlers();
        this.startPeriodicCleanup();
        
        console.log('🛡️ ErrorHandler 초기화 완료');
    }

    /**
     * 에러 처리 메인 메서드
     * @param {Error} error - 발생한 에러
     * @param {string} context - 에러 발생 컨텍스트
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 처리 결과
     */
    async handle(error, context, options = {}) {
        try {
            const errorInfo = this.analyzeError(error, context);
            this.recordError(errorInfo);
            
            console.error(`🚨 [${context}] ${error.message}`, error);
            
            // 에러 유형별 처리
            const result = await this.processErrorByType(errorInfo, options);
            
            // 사용자 알림
            if (result.showNotification) {
                this.showNotification(result.notification);
            }
            
            return result;
            
        } catch (handlerError) {
            console.error('❌ ErrorHandler 자체 오류:', handlerError);
            this.showFallbackNotification(error.message);
            return { handled: false, error: handlerError };
        }
    }

    /**
     * 에러 분석
     * @param {Error} error - 에러 객체
     * @param {string} context - 컨텍스트
     * @returns {Object} 분석된 에러 정보
     */
    analyzeError(error, context) {
        const errorInfo = {
            originalError: error,
            context: context,
            timestamp: new Date(),
            message: error.message,
            stack: error.stack,
            type: this.determineErrorType(error, context),
            severity: 'MEDIUM',
            isRetryable: false,
            userMessage: this.messages.SERVER_ERROR || '오류가 발생했습니다.'
        };

        // 에러 유형별 상세 정보 설정
        const errorTypeConfig = this.errorTypes[errorInfo.type];
        if (errorTypeConfig) {
            errorInfo.severity = errorTypeConfig.severity;
            errorInfo.isRetryable = errorTypeConfig.autoRetry || false;
            errorInfo.maxRetries = errorTypeConfig.maxRetries || 0;
            errorInfo.backoffMultiplier = errorTypeConfig.backoffMultiplier || 1;
            
            // 사용자 메시지 설정
            if (errorInfo.type === 'NETWORK') {
                errorInfo.userMessage = this.messages.NETWORK || '네트워크 연결을 확인해주세요.';
            } else if (errorInfo.type === 'SESSION') {
                errorInfo.userMessage = this.messages.SESSION_EXPIRED || '세션이 만료되었습니다.';
            } else if (errorInfo.type === 'VALIDATION') {
                errorInfo.userMessage = this.messages.VALIDATION_ERROR || '입력값을 확인해주세요.';
            } else if (errorInfo.type === 'TIMEOUT') {
                errorInfo.userMessage = this.messages.TIMEOUT || '요청 시간이 초과되었습니다.';
            }
        }

        return errorInfo;
    }

    /**
     * 에러 유형 판단
     * @param {Error} error - 에러 객체
     * @param {string} context - 컨텍스트
     * @returns {string} 에러 유형
     */
    determineErrorType(error, context) {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();

        // 네트워크 관련 에러
        if (name.includes('network') || 
            message.includes('network') || 
            message.includes('fetch') ||
            message.includes('connection') ||
            error.code === 'NETWORK_ERROR') {
            return 'NETWORK';
        }

        // 세션 관련 에러
        if (message.includes('session') || 
            message.includes('unauthorized') ||
            message.includes('401') ||
            error.code === 'SESSION_ERROR') {
            return 'SESSION';
        }

        // 타임아웃 에러
        if (message.includes('timeout') || 
            message.includes('aborted') ||
            name.includes('timeout')) {
            return 'TIMEOUT';
        }

        // 유효성 검사 에러
        if (message.includes('validation') || 
            message.includes('invalid') ||
            message.includes('400') ||
            error.code === 'VALIDATION_ERROR') {
            return 'VALIDATION';
        }

        // 서버 에러
        if (message.includes('500') || 
            message.includes('server') ||
            message.includes('503') ||
            error.code === 'SERVER_ERROR') {
            return 'SERVER';
        }

        // 기본값
        return 'SERVER';
    }

    /**
     * 에러 유형별 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 처리 옵션
     * @returns {Promise<Object>} 처리 결과
     */
    async processErrorByType(errorInfo, options) {
        const result = {
            handled: false,
            showNotification: true,
            notification: null,
            retryable: errorInfo.isRetryable,
            autoRetryScheduled: false
        };

        switch (errorInfo.type) {
            case 'NETWORK':
                result.notification = await this.handleNetworkError(errorInfo, options);
                result.handled = true;
                break;

            case 'SESSION':
                result.notification = await this.handleSessionError(errorInfo, options);
                result.handled = true;
                break;

            case 'TIMEOUT':
                result.notification = await this.handleTimeoutError(errorInfo, options);
                result.handled = true;
                break;

            case 'VALIDATION':
                result.notification = await this.handleValidationError(errorInfo, options);
                result.handled = true;
                break;

            case 'SERVER':
                result.notification = await this.handleServerError(errorInfo, options);
                result.handled = true;
                break;

            default:
                result.notification = await this.handleGenericError(errorInfo, options);
                result.handled = true;
        }

        return result;
    }

    /**
     * 네트워크 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleNetworkError(errorInfo, options) {
        console.log('🌐 네트워크 에러 처리 중...');

        // 네트워크 상태 확인
        const isOnline = navigator.onLine;
        
        if (!isOnline) {
            return {
                type: 'error',
                title: '네트워크 연결 끊김',
                message: '인터넷 연결을 확인하고 다시 시도해주세요.',
                duration: 0,  // 수동 닫기
                actions: ['다시 시도', '닫기']
            };
        }

        // 자동 재시도 스케줄링
        if (errorInfo.isRetryable && options.originalRequest) {
            this.scheduleRetry(errorInfo, options.originalRequest);
        }

        return {
            type: 'error',
            title: '네트워크 오류',
            message: errorInfo.userMessage,
            duration: 5000,
            actions: ['재시도', '닫기']
        };
    }

    /**
     * 세션 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleSessionError(errorInfo, options) {
        console.log('🔑 세션 에러 처리 중...');

        // 세션 복구 시도
        if (window.commManager && typeof window.commManager.startSession === 'function') {
            try {
                console.log('🔄 세션 재시작 시도...');
                await window.commManager.startSession('desktop');
                
                return {
                    type: 'success',
                    title: '세션 복구 완료',
                    message: '세션이 자동으로 복구되었습니다.',
                    duration: 3000
                };
            } catch (sessionError) {
                console.error('❌ 세션 복구 실패:', sessionError);
            }
        }

        return {
            type: 'error',
            title: '세션 만료',
            message: '세션이 만료되었습니다. 페이지를 새로고침해주세요.',
            duration: 0,
            actions: ['새로고침', '닫기']
        };
    }

    /**
     * 타임아웃 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleTimeoutError(errorInfo, options) {
        console.log('⏰ 타임아웃 에러 처리 중...');

        // 자동 재시도 (더 긴 타임아웃으로)
        if (errorInfo.isRetryable && options.originalRequest) {
            const retryOptions = { ...options.originalRequest, timeout: options.originalRequest.timeout * 1.5 };
            this.scheduleRetry(errorInfo, retryOptions);
        }

        return {
            type: 'warning',
            title: '요청 시간 초과',
            message: errorInfo.userMessage,
            duration: 5000,
            actions: ['재시도', '닫기']
        };
    }

    /**
     * 유효성 검사 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleValidationError(errorInfo, options) {
        console.log('📝 유효성 검사 에러 처리 중...');

        return {
            type: 'warning',
            title: '입력 오류',
            message: errorInfo.userMessage,
            duration: 5000,
            actions: ['확인']
        };
    }

    /**
     * 서버 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleServerError(errorInfo, options) {
        console.log('🖥️ 서버 에러 처리 중...');

        // 자동 재시도 (지수 백오프)
        if (errorInfo.isRetryable && options.originalRequest) {
            this.scheduleRetry(errorInfo, options.originalRequest);
        }

        return {
            type: 'error',
            title: '서버 오류',
            message: errorInfo.userMessage,
            duration: 8000,
            actions: ['재시도', '닫기']
        };
    }

    /**
     * 일반 에러 처리
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 알림 정보
     */
    async handleGenericError(errorInfo, options) {
        console.log('🔧 일반 에러 처리 중...');

        return {
            type: 'error',
            title: '오류 발생',
            message: errorInfo.userMessage,
            duration: 5000,
            actions: ['확인']
        };
    }

    /**
     * 재시도 스케줄링
     * @param {Object} errorInfo - 에러 정보
     * @param {Object} originalRequest - 원본 요청
     */
    scheduleRetry(errorInfo, originalRequest) {
        if (!this.recoveryConfig.enabled) {
            return;
        }

        const retryKey = this.generateRetryKey(originalRequest);
        const existingRetry = this.retryQueue.get(retryKey);

        // 최대 재시도 횟수 확인
        const currentAttempts = existingRetry ? existingRetry.attempts : 0;
        if (currentAttempts >= (errorInfo.maxRetries || 3)) {
            console.log(`❌ 최대 재시도 횟수 초과: ${retryKey}`);
            return;
        }

        // 재시도 지연 시간 계산 (지수 백오프)
        const baseDelay = this.config.API?.RETRY_DELAY || 1000;
        const delay = baseDelay * Math.pow(errorInfo.backoffMultiplier || 2, currentAttempts);

        const retryInfo = {
            key: retryKey,
            originalRequest,
            errorInfo,
            attempts: currentAttempts + 1,
            scheduledTime: Date.now() + delay,
            delay
        };

        this.retryQueue.set(retryKey, retryInfo);

        console.log(`🔄 재시도 스케줄됨: ${retryKey} (${delay}ms 후, ${retryInfo.attempts}회차)`);

        // 재시도 실행
        setTimeout(() => {
            this.executeRetry(retryKey);
        }, delay);
    }

    /**
     * 재시도 실행
     * @param {string} retryKey - 재시도 키
     */
    async executeRetry(retryKey) {
        const retryInfo = this.retryQueue.get(retryKey);
        if (!retryInfo) {
            return;
        }

        try {
            console.log(`🔄 재시도 실행: ${retryKey}`);

            // 통신 매니저를 통한 재시도
            if (window.commManager && retryInfo.originalRequest) {
                const { method, url, data, options } = retryInfo.originalRequest;
                
                let result;
                switch (method.toUpperCase()) {
                    case 'GET':
                        result = await window.commManager.get(url, options);
                        break;
                    case 'POST':
                        result = await window.commManager.post(url, data, options);
                        break;
                    case 'PUT':
                        result = await window.commManager.put(url, data, options);
                        break;
                    case 'DELETE':
                        result = await window.commManager.delete(url, options);
                        break;
                    default:
                        throw new Error(`지원되지 않는 HTTP 메서드: ${method}`);
                }

                // 재시도 성공
                this.retryQueue.delete(retryKey);
                console.log(`✅ 재시도 성공: ${retryKey}`);

                // 성공 알림
                this.showNotification({
                    type: 'success',
                    title: '연결 복구됨',
                    message: '요청이 성공적으로 처리되었습니다.',
                    duration: 3000
                });

                return result;
            }

        } catch (error) {
            console.error(`❌ 재시도 실패: ${retryKey}`, error);

            // 추가 재시도 스케줄링
            const errorInfo = this.analyzeError(error, 'retry');
            if (errorInfo.isRetryable) {
                this.scheduleRetry(errorInfo, retryInfo.originalRequest);
            } else {
                this.retryQueue.delete(retryKey);
            }
        }
    }

    /**
     * 알림 표시
     * @param {Object} notification - 알림 정보
     */
    showNotification(notification) {
        if (!notification) {
            return;
        }

        const notificationId = Date.now().toString();
        const element = this.createNotificationElement(notification, notificationId);
        
        this.notificationContainer.appendChild(element);
        this.activeNotifications.set(notificationId, {
            element,
            notification,
            createdAt: Date.now()
        });

        // 애니메이션
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        // 자동 제거
        if (notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, notification.duration);
        }

        console.log(`📢 알림 표시: ${notification.title}`);
    }

    /**
     * 알림 요소 생성
     * @param {Object} notification - 알림 정보
     * @param {string} notificationId - 알림 ID
     * @returns {HTMLElement} 알림 요소
     */
    createNotificationElement(notification, notificationId) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.dataset.notificationId = notificationId;

        const iconMap = {
            error: '❌',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };

        const actions = notification.actions || ['확인'];
        const actionButtons = actions.map(action => 
            `<button class="notification-action" data-action="${action}">${action}</button>`
        ).join('');

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-icon">${iconMap[notification.type] || 'ℹ️'}</span>
                    <span class="notification-title">${notification.title}</span>
                    <button class="notification-close" data-action="close">×</button>
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-actions">${actionButtons}</div>
            </div>
        `;

        // 이벤트 리스너
        element.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action) {
                this.handleNotificationAction(notificationId, action, notification);
            }
        });

        return element;
    }

    /**
     * 알림 액션 처리
     * @param {string} notificationId - 알림 ID
     * @param {string} action - 액션
     * @param {Object} notification - 알림 정보
     */
    handleNotificationAction(notificationId, action, notification) {
        console.log(`🎬 알림 액션: ${action}`);

        switch (action) {
            case 'close':
            case '닫기':
            case '확인':
                this.removeNotification(notificationId);
                break;
                
            case '재시도':
            case '다시 시도':
                this.removeNotification(notificationId);
                // 재시도 로직은 이미 스케줄되어 있음
                break;
                
            case '새로고침':
                window.location.reload();
                break;
                
            default:
                console.warn(`알 수 없는 액션: ${action}`);
                this.removeNotification(notificationId);
        }
    }

    /**
     * 알림 제거
     * @param {string} notificationId - 알림 ID
     */
    removeNotification(notificationId) {
        const notificationInfo = this.activeNotifications.get(notificationId);
        if (!notificationInfo) {
            return;
        }

        const element = notificationInfo.element;
        element.classList.add('hide');

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeNotifications.delete(notificationId);
        }, 300);
    }

    /**
     * 알림 컨테이너 생성
     */
    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.className = 'notification-container';
        
        // 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                width: 100%;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                overflow: hidden;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .notification-error {
                border-left: 4px solid #dc3545;
            }
            
            .notification-warning {
                border-left: 4px solid #ffc107;
            }
            
            .notification-success {
                border-left: 4px solid #28a745;
            }
            
            .notification-info {
                border-left: 4px solid #17a2b8;
            }
            
            .notification-content {
                padding: 16px;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .notification-icon {
                margin-right: 8px;
                font-size: 16px;
            }
            
            .notification-title {
                flex: 1;
                font-weight: bold;
                color: #333;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
            }
            
            .notification-message {
                color: #666;
                line-height: 1.4;
                margin-bottom: 12px;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .notification-action {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .notification-action:hover {
                background: #e9ecef;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * 글로벌 에러 핸들러 설정
     */
    setupGlobalErrorHandlers() {
        // 전역 JavaScript 에러
        window.addEventListener('error', (event) => {
            this.handle(event.error || new Error(event.message), 'global_error');
        });

        // Promise rejection 처리
        window.addEventListener('unhandledrejection', (event) => {
            this.handle(event.reason, 'unhandled_promise_rejection');
            event.preventDefault(); // 콘솔 에러 방지
        });
    }

    /**
     * 에러 기록
     * @param {Object} errorInfo - 에러 정보
     */
    recordError(errorInfo) {
        this.errorStats.total++;
        this.errorStats.lastError = errorInfo;

        // 유형별 통계
        if (!this.errorStats.byType[errorInfo.type]) {
            this.errorStats.byType[errorInfo.type] = 0;
        }
        this.errorStats.byType[errorInfo.type]++;

        // 시간별 통계
        const hour = new Date().getHours();
        if (!this.errorStats.byHour[hour]) {
            this.errorStats.byHour[hour] = 0;
        }
        this.errorStats.byHour[hour]++;
    }

    /**
     * 주기적 정리 작업
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupRetryQueue();
            this.cleanupOldNotifications();
        }, 60000); // 1분마다
    }

    /**
     * 재시도 큐 정리
     */
    cleanupRetryQueue() {
        const now = Date.now();
        const expiredKeys = [];

        for (const [key, retryInfo] of this.retryQueue) {
            // 10분 이상 된 재시도는 제거
            if (now - retryInfo.scheduledTime > 600000) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => {
            this.retryQueue.delete(key);
            console.log(`🧹 만료된 재시도 제거: ${key}`);
        });
    }

    /**
     * 오래된 알림 정리
     */
    cleanupOldNotifications() {
        const now = Date.now();
        const expiredIds = [];

        for (const [id, info] of this.activeNotifications) {
            // 5분 이상 된 알림은 제거
            if (now - info.createdAt > 300000) {
                expiredIds.push(id);
            }
        }

        expiredIds.forEach(id => {
            this.removeNotification(id);
        });
    }

    /**
     * 재시도 키 생성
     * @param {Object} request - 요청 정보
     * @returns {string} 재시도 키
     */
    generateRetryKey(request) {
        return `${request.method}_${request.url}_${Date.now()}`;
    }

    /**
     * 폴백 알림 (에러 핸들러 자체 오류 시)
     * @param {string} message - 메시지
     */
    showFallbackNotification(message) {
        alert(`오류: ${message}`);
    }

    /**
     * 에러 통계 조회
     * @returns {Object} 에러 통계
     */
    getErrorStats() {
        return { ...this.errorStats };
    }

    /**
     * 정리 작업
     */
    cleanup() {
        this.cleanupRetryQueue();
        this.cleanupOldNotifications();
        
        if (this.notificationContainer && this.notificationContainer.parentNode) {
            this.notificationContainer.parentNode.removeChild(this.notificationContainer);
        }
        
        console.log('🧹 ErrorHandler 정리 완료');
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.errorHandler = new ErrorHandler();
    window.ErrorHandler = ErrorHandler;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
