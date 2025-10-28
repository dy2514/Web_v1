/**
 * Unified Communication Manager
 * TETRIS Web Interface - 통합 통신 관리자
 * HTTP API + SSE를 단일 모듈로 통합 관리
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 * 
 * 기존 3개 파일을 통합:
 * - http-api-manager.js
 * - sse-manager.js  
 * - communication-manager.js
 */

class UnifiedCommunicationManager {
    /**
     * 생성자
     * @param {Object} options - 설정 옵션
     * @param {string} [options.baseUrl=''] - 기본 URL
     * @param {number} [options.timeout=30000] - HTTP 타임아웃 (ms)
     */
    constructor(options = {}) {
        // 설정 로드 (CONFIG가 로드되어 있다고 가정)
        this.config = window.CONFIG || {};
        
        // HTTP API 설정
        this.baseUrl = options.baseUrl || this.config.API?.BASE_URL || '';
        this.timeout = options.timeout || this.config.API?.TIMEOUT || 30000;
        this.maxRetries = this.config.API?.RETRY_ATTEMPTS || 3;
        this.retryDelay = this.config.API?.RETRY_DELAY || 1000;
        
        // SSE 설정
        this.sseConfig = {
            maxReconnectAttempts: this.config.SSE?.RECONNECT_ATTEMPTS || 5,
            reconnectDelay: this.config.SSE?.RECONNECT_DELAY || 1000,
            maxReconnectDelay: this.config.SSE?.MAX_RECONNECT_DELAY || 30000,
            heartbeatInterval: this.config.SSE?.HEARTBEAT_INTERVAL || 30000
        };
        
        // 상태 관리
        this.sessionId = null;
        this.isInitialized = false;
        this.isConnected = false;
        
        // SSE 관련
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        
        // 이벤트 관리
        this.eventHandlers = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // 성능 모니터링
        this.performanceMetrics = {
            requestCount: 0,
            errorCount: 0,
            avgResponseTime: 0,
            lastRequestTime: null
        };
        
        // 디버깅
        this.debug = this.config.DEBUG?.ENABLED || false;
        
        this.log('UnifiedCommunicationManager 초기화됨', 'info');
    }

    /**
     * 통신 매니저 초기화
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('이미 초기화됨', 'warn');
            return true;
        }

        try {
            // 브라우저 호환성 검사
            if (!this.checkBrowserSupport()) {
                throw new Error('브라우저가 지원되지 않습니다.');
            }

            // 네트워크 상태 감지 설정
            this.setupNetworkDetection();
            
            // 성능 모니터링 시작
            this.startPerformanceMonitoring();
            
            this.isInitialized = true;
            this.log('초기화 완료', 'info');
            
            this.emit('initialized');
            return true;
            
        } catch (error) {
            this.log(`초기화 실패: ${error.message}`, 'error');
            this.emit('error', { type: 'INITIALIZATION_ERROR', error });
            return false;
        }
    }

    /**
     * 세션 시작
     * @param {string} [type='desktop'] - 세션 타입
     * @returns {Promise<string>} 세션 ID
     */
    async startSession(type = 'desktop') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // 세션 ID 생성
            this.sessionId = this.generateSessionId();
            this.log(`세션 시작: ${this.sessionId} (${type})`, 'info');

            // HTTP API로 세션 참여
            const result = await this.post(
                this.config.ENDPOINTS?.DESKTOP?.JOIN_SESSION || '/desktop/api/join_session',
                { 
                    session_id: this.sessionId, 
                    type: type 
                }
            );

            if (!result.data.success) {
                throw new Error(result.data.error || '세션 시작 실패');
            }

            this.log('세션 참여 완료', 'info');

            // SSE 연결
            await this.connectSSE();

            this.emit('session_started', { sessionId: this.sessionId, type });
            return this.sessionId;
            
        } catch (error) {
            this.log(`세션 시작 실패: ${error.message}`, 'error');
            this.sessionId = null;
            throw error;
        }
    }

    /**
     * HTTP 요청 (기본 메서드)
     * @param {string} method - HTTP 메서드
     * @param {string} url - 요청 URL
     * @param {Object} [data=null] - 요청 데이터
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async request(method, url, data = null, options = {}) {
        const requestStart = performance.now();
        const requestId = this.generateRequestId();
        
        this.performanceMetrics.requestCount++;
        this.performanceMetrics.lastRequestTime = new Date();

        const config = {
            method,
            url: this.baseUrl + url,
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                ...options.headers
            },
            timeout: options.timeout || this.timeout
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        this.log(`HTTP 요청: ${method} ${config.url}`, 'debug');

        let attempt = 0;
        let lastError;

        while (attempt <= this.maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(config.url, {
                    method: config.method,
                    body: config.body,
                    headers: config.headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                // 성능 메트릭 업데이트
                const responseTime = performance.now() - requestStart;
                this.updatePerformanceMetrics(responseTime);

                this.log(`HTTP 응답: ${response.status}`, 'debug');
                this.emit('request_success', { method, url, responseTime });

                return { data: result, status: response.status, responseTime };

        } catch (error) {
            attempt++;
            lastError = error;
            this.performanceMetrics.errorCount++;

            this.log(`HTTP 요청 실패 (시도 ${attempt}/${this.maxRetries + 1}): ${error.message}`, 'warn');

            // 에러 핸들러 통합
            if (window.errorHandler) {
                const errorResult = await window.errorHandler.handle(error, 'http_request', {
                    originalRequest: { method, url, data, options },
                    attempt,
                    maxRetries: this.maxRetries
                });
                
                // 자동 재시도가 스케줄된 경우 중복 방지
                if (errorResult.autoRetryScheduled) {
                    throw lastError; // 재시도는 ErrorHandler가 처리
                }
            }

            if (attempt <= this.maxRetries) {
                const delay = this.calculateRetryDelay(attempt);
                this.log(`${delay}ms 후 재시도`, 'info');
                await this.sleep(delay);
            }
        }
        }

        // 모든 재시도 실패
        this.log(`HTTP 요청 최종 실패: ${lastError.message}`, 'error');
        this.emit('request_error', { method, url, error: lastError });
        throw lastError;
    }

    /**
     * GET 요청
     * @param {string} url - 요청 URL
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async get(url, options = {}) {
        return this.request('GET', url, null, options);
    }

    /**
     * POST 요청
     * @param {string} url - 요청 URL
     * @param {Object} [data=null] - 요청 데이터
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async post(url, data = null, options = {}) {
        return this.request('POST', url, data, options);
    }

    /**
     * PUT 요청
     * @param {string} url - 요청 URL
     * @param {Object} [data=null] - 요청 데이터
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async put(url, data = null, options = {}) {
        return this.request('PUT', url, data, options);
    }

    /**
     * DELETE 요청
     * @param {string} url - 요청 URL
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async delete(url, options = {}) {
        return this.request('DELETE', url, null, options);
    }

    /**
     * 파일 업로드
     * @param {string} url - 업로드 URL
     * @param {FormData} formData - 폼 데이터
     * @param {Object} [options={}] - 추가 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    async upload(url, formData, options = {}) {
        const requestStart = performance.now();
        
        try {
            const response = await fetch(this.baseUrl + url, {
                method: 'POST',
                body: formData,
                // Content-Type 헤더는 브라우저가 자동 설정 (multipart/form-data)
                signal: options.signal
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const responseTime = performance.now() - requestStart;
            
            this.log(`파일 업로드 완료: ${responseTime.toFixed(2)}ms`, 'info');
            this.emit('upload_success', { url, responseTime });

            return { data: result, status: response.status, responseTime };

        } catch (error) {
            this.log(`파일 업로드 실패: ${error.message}`, 'error');
            this.emit('upload_error', { url, error });
            throw error;
        }
    }

    /**
     * SSE 연결
     * @returns {Promise<void>}
     */
    async connectSSE() {
        if (!this.sessionId) {
            throw new Error('세션 ID가 없습니다.');
        }

        if (this.isConnected) {
            this.log('SSE 이미 연결됨', 'warn');
            return;
        }

        this.disconnectSSE(); // 기존 연결 정리

        const url = `${this.baseUrl}${this.config.ENDPOINTS?.DESKTOP?.PROGRESS_STREAM || '/desktop/api/progress_stream'}?session_id=${this.sessionId}`;
        
        this.log(`SSE 연결 시도: ${url}`, 'info');

        return new Promise((resolve, reject) => {
            try {
                this.eventSource = new EventSource(url);

                this.eventSource.onopen = () => {
                    this.log('SSE 연결됨', 'info');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    this.startHeartbeat();
                    this.emit('connected', { sessionId: this.sessionId });
                    resolve();
                };

                this.eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleSSEMessage(data);
                    } catch (error) {
                        this.log(`SSE 데이터 파싱 오류: ${error.message}`, 'error');
                        this.emit('error', { type: 'SSE_PARSE_ERROR', error });
                    }
                };

                this.eventSource.onerror = async (error) => {
                    this.log('SSE 연결 오류', 'error');
                    this.isConnected = false;
                    this.stopHeartbeat();
                    
                    // 에러 핸들러 통합
                    if (window.errorHandler) {
                        await window.errorHandler.handle(
                            new Error('SSE 연결 오류'), 
                            'sse_connection',
                            { readyState: this.eventSource.readyState }
                        );
                    }
                    
                    if (this.eventSource.readyState === EventSource.CLOSED) {
                        this.emit('disconnected');
                        this.attemptReconnect();
                    } else {
                        this.emit('error', { type: 'SSE_CONNECTION_ERROR', error });
                    }
                    
                    if (this.reconnectAttempts === 0) {
                        reject(error);
                    }
                };

            } catch (error) {
                this.log(`SSE 연결 실패: ${error.message}`, 'error');
                reject(error);
            }
        });
    }

    /**
     * SSE 메시지 처리
     * @param {Object} data - 수신된 데이터
     */
    handleSSEMessage(data) {
        this.log(`SSE 메시지 수신: ${data.event || 'message'}`, 'debug');

        const eventType = data.event || 'progress_update';
        
        // 특정 이벤트 타입별 처리
        switch (eventType) {
            case 'connected':
                this.emit('sse_connected', data);
                break;
            case 'progress_update':
                this.emit('progress_update', data);
                break;
            case 'upload_complete':
                this.emit('upload_complete', data);
                break;
            case 'hardware_start':
                this.emit('hardware_start', data);
                break;
            case 'hardware_progress':
                this.emit('hardware_progress', data);
                break;
            case 'hardware_complete':
                this.emit('hardware_complete', data);
                break;
            case 'error':
                this.emit('sse_error', data);
                break;
            default:
                this.emit(eventType, data);
        }

        // 모든 SSE 메시지에 대한 일반 이벤트
        this.emit('sse_message', { eventType, data });
    }

    /**
     * SSE 재연결 시도
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.sseConfig.maxReconnectAttempts) {
            this.log('SSE 최대 재연결 시도 횟수 초과', 'error');
            this.emit('max_reconnect_attempts_reached');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.sseConfig.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.sseConfig.maxReconnectDelay
        );

        this.log(`SSE 재연결 시도 ${this.reconnectAttempts}/${this.sseConfig.maxReconnectAttempts} (${delay}ms 후)`, 'info');
        this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connectSSE();
            } catch (error) {
                this.log(`SSE 재연결 실패: ${error.message}`, 'error');
                // 재연결 실패 시 다시 시도
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * SSE 연결 해제
     */
    disconnectSSE() {
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.log('SSE 연결 해제됨', 'info');
    }

    /**
     * 하트비트 시작
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected && this.eventSource) {
                // SSE는 서버에서 클라이언트로의 단방향이므로
                // 연결 상태만 확인 (readyState 체크)
                if (this.eventSource.readyState !== EventSource.OPEN) {
                    this.log('SSE 연결 상태 불량 감지', 'warn');
                    this.isConnected = false;
                    this.attemptReconnect();
                }
            }
        }, this.sseConfig.heartbeatInterval);
    }

    /**
     * 하트비트 중지
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // === TETRIS 전용 API 메서드들 ===

    /**
     * 파일 업로드 (TETRIS 전용)
     * @param {File} file - 업로드할 파일
     * @param {number} peopleCount - 인원 수
     * @returns {Promise<Object>} 업로드 결과
     */
    async uploadFile(file, peopleCount) {
        if (!this.sessionId) {
            throw new Error('세션이 시작되지 않았습니다.');
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('people_count', peopleCount);
        formData.append('session_id', this.sessionId);

        this.log(`파일 업로드 시작: ${file.name} (${peopleCount}명)`, 'info');

        const result = await this.upload(
            this.config.ENDPOINTS?.MOBILE?.UPLOAD || '/mobile/api/upload',
            formData
        );

        this.emit('file_uploaded', { file: file.name, peopleCount, result });
        return result;
    }

    /**
     * 단계별 AI 분석 시작
     * @param {number} peopleCount - 인원 수
     * @param {string} imageDataUrl - 이미지 데이터 URL
     * @param {string} [scenario] - 시나리오 이름
     * @returns {Promise<Object>} 분석 시작 결과
     */
    async startStepAnalysis(peopleCount, imageDataUrl, scenario) {
        this.log('단계별 AI 분석 시작', 'info');

        const data = {
            people_count: peopleCount,
            image_data_url: imageDataUrl
        };

        if (scenario) {
            data.scenario = scenario;
        }

        const result = await this.post(
            this.config.ENDPOINTS?.DESKTOP?.STEP_ANALYSIS || '/desktop/api/step_analysis',
            data
        );

        if (result.data.success) {
            this.emit('step_analysis_started', result);
        }

        return result;
    }

    /**
     * 시스템 초기화
     * @returns {Promise<Object>} 초기화 결과
     */
    async resetSystem() {
        this.log('시스템 초기화 요청', 'info');

        const result = await this.post(
            this.config.ENDPOINTS?.DESKTOP?.RESET || '/desktop/api/reset'
        );

        if (result.data.success) {
            this.emit('system_reset', result);
        }

        return result;
    }

    /**
     * 시스템 상태 조회
     * @returns {Promise<Object>} 시스템 상태
     */
    async getStatus() {
        const result = await this.get(
            this.config.ENDPOINTS?.DESKTOP?.STATUS || '/desktop/api/status'
        );

        this.emit('status_received', result);
        return result;
    }

    /**
     * 활성 세션 목록 조회
     * @returns {Promise<Object>} 세션 목록
     */
    async getSessions() {
        return this.get(
            this.config.ENDPOINTS?.DESKTOP?.SESSIONS || '/desktop/api/sessions'
        );
    }

    /**
     * 하드웨어 제어
     * @param {string} command - 제어 명령
     * @returns {Promise<Object>} 제어 결과
     */
    async triggerHardware(command) {
        if (!this.sessionId) {
            throw new Error('세션이 시작되지 않았습니다.');
        }

        this.log(`하드웨어 제어: ${command}`, 'info');

        const result = await this.post(
            this.config.ENDPOINTS?.DESKTOP?.TRIGGER_HARDWARE || '/desktop/api/trigger_hardware',
            { session_id: this.sessionId, command }
        );

        if (result.data.success) {
            this.emit('hardware_triggered', { command, result });
        }

        return result;
    }

    // === 유틸리티 메서드들 ===

    /**
     * 이벤트 핸들러 등록
     * @param {string} eventName - 이벤트 이름
     * @param {Function} handler - 핸들러 함수
     */
    on(eventName, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        
        this.eventHandlers.set(eventName, handler);
        this.log(`이벤트 핸들러 등록: ${eventName}`, 'debug');
    }

    /**
     * 이벤트 발생
     * @param {string} eventName - 이벤트 이름
     * @param {*} [data] - 이벤트 데이터
     */
    emit(eventName, data = null) {
        const handler = this.eventHandlers.get(eventName);
        if (handler) {
            try {
                handler(data);
                this.log(`이벤트 발생: ${eventName}`, 'debug');
            } catch (error) {
                this.log(`이벤트 핸들러 오류 (${eventName}): ${error.message}`, 'error');
            }
        }
    }

    /**
     * 특정 이벤트 핸들러 제거
     * @param {string} eventName - 이벤트 이름
     */
    removeListener(eventName) {
        this.eventHandlers.delete(eventName);
        this.log(`이벤트 핸들러 제거: ${eventName}`, 'debug');
    }

    /**
     * 모든 이벤트 핸들러 제거
     */
    removeAllListeners() {
        this.eventHandlers.clear();
        this.log('모든 이벤트 핸들러 제거됨', 'debug');
    }

    /**
     * 세션 종료 및 연결 해제
     */
    disconnect() {
        this.log('통신 매니저 연결 해제', 'info');
        
        this.disconnectSSE();
        this.stopPerformanceMonitoring();
        this.removeAllListeners();
        
        this.sessionId = null;
        this.isInitialized = false;
        
        this.emit('disconnected');
    }

    /**
     * 연결 상태 확인
     * @returns {Object} 연결 상태 정보
     */
    getConnectionState() {
        return {
            sessionId: this.sessionId,
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            sseReadyState: this.eventSource ? this.eventSource.readyState : null,
            reconnectAttempts: this.reconnectAttempts,
            performanceMetrics: { ...this.performanceMetrics }
        };
    }

    /**
     * 디버그 정보 출력
     */
    debug() {
        console.group('=== Unified Communication Manager Debug ===');
        console.log('Session ID:', this.sessionId);
        console.log('Initialized:', this.isInitialized);
        console.log('Connected:', this.isConnected);
        console.log('Event Handlers:', Array.from(this.eventHandlers.keys()));
        console.log('SSE State:', this.eventSource ? this.eventSource.readyState : 'null');
        console.log('Reconnect Attempts:', this.reconnectAttempts);
        console.log('Performance Metrics:', this.performanceMetrics);
        console.groupEnd();
    }

    // === 내부 헬퍼 메서드들 ===

    /**
     * 세션 ID 생성
     * @returns {string} 생성된 세션 ID
     */
    generateSessionId() {
        const length = this.config.SESSION?.ID_LENGTH || 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return `session_${result}_${Date.now()}`;
    }

    /**
     * 요청 ID 생성
     * @returns {string} 생성된 요청 ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 재시도 지연 시간 계산 (지수 백오프)
     * @param {number} attempt - 시도 횟수
     * @returns {number} 지연 시간 (ms)
     */
    calculateRetryDelay(attempt) {
        const baseDelay = this.retryDelay;
        const maxDelay = this.config.API?.MAX_RETRY_DELAY || 10000;
        
        return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    }

    /**
     * 슬립 함수
     * @param {number} ms - 대기 시간 (ms)
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 브라우저 지원 여부 확인
     * @returns {boolean} 지원 여부
     */
    checkBrowserSupport() {
        const support = this.config.BROWSER_SUPPORT?.FEATURES || {};
        
        // Fetch API 지원 확인
        if (support.FETCH_API && !window.fetch) {
            this.log('Fetch API가 지원되지 않습니다.', 'error');
            return false;
        }
        
        // EventSource 지원 확인
        if (support.EVENT_SOURCE && !window.EventSource) {
            this.log('Server-Sent Events가 지원되지 않습니다.', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * 네트워크 감지 설정
     */
    setupNetworkDetection() {
        if ('onLine' in navigator) {
            window.addEventListener('online', () => {
                this.log('네트워크 연결됨', 'info');
                this.emit('network_online');
                
                // 연결이 복구되면 SSE 재연결 시도
                if (!this.isConnected && this.sessionId) {
                    this.connectSSE().catch(error => {
                        this.log(`네트워크 복구 후 SSE 재연결 실패: ${error.message}`, 'error');
                    });
                }
            });
            
            window.addEventListener('offline', () => {
                this.log('네트워크 연결 끊김', 'warn');
                this.emit('network_offline');
            });
        }
    }

    /**
     * 성능 모니터링 시작
     */
    startPerformanceMonitoring() {
        if (!this.config.DEBUG?.PERFORMANCE_MONITORING) {
            return;
        }

        setInterval(() => {
            this.emit('performance_update', { ...this.performanceMetrics });
        }, 60000); // 1분마다 성능 메트릭 전송
    }

    /**
     * 성능 모니터링 중지
     */
    stopPerformanceMonitoring() {
        // 현재는 interval만 정리하면 되지만, 향후 확장 가능
    }

    /**
     * 성능 메트릭 업데이트
     * @param {number} responseTime - 응답 시간
     */
    updatePerformanceMetrics(responseTime) {
        const metrics = this.performanceMetrics;
        
        // 평균 응답 시간 계산 (이동 평균)
        if (metrics.avgResponseTime === 0) {
            metrics.avgResponseTime = responseTime;
        } else {
            metrics.avgResponseTime = (metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
        }
    }

    /**
     * 로깅 함수
     * @param {string} message - 로그 메시지
     * @param {string} [level='info'] - 로그 레벨
     */
    log(message, level = 'info') {
        if (!this.debug && level === 'debug') {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[UCM ${timestamp}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'info':
                console.info(`${prefix} ℹ️ ${message}`);
                break;
            case 'debug':
                console.log(`${prefix} 🔍 ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
}

// 전역 인스턴스 생성 및 exports
if (typeof window !== 'undefined') {
    // 기존 인스턴스가 있다면 정리
    if (window.commManager && typeof window.commManager.disconnect === 'function') {
        window.commManager.disconnect();
    }

    // 새로운 인스턴스 생성
    window.commManager = new UnifiedCommunicationManager();
    window.UnifiedCommunicationManager = UnifiedCommunicationManager;

    // DOM 로드 완료 시 자동 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.commManager.initialize().catch(error => {
                console.error('통신 매니저 자동 초기화 실패:', error);
            });
        });
    } else {
        // 이미 로드된 경우 즉시 초기화
        window.commManager.initialize().catch(error => {
            console.error('통신 매니저 초기화 실패:', error);
        });
    }
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedCommunicationManager;
}
