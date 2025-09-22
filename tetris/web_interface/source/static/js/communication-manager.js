/**
 * Communication Manager - HTTP API + SSE 통합 관리자
 * Phase 2: HTTP + SSE 하이브리드 통신 구조
 */

class CommunicationManager {
    constructor(options = {}) {
        this.httpApi = new HttpApiManager(options);
        this.sseManager = new SSEManager(options);
        this.sessionId = null;
        this.eventHandlers = new Map();
        this.isInitialized = false;
    }

    /**
     * 통신 매니저 초기화
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('통신 매니저가 이미 초기화됨');
            return;
        }

        // SSE 이벤트를 내부 이벤트로 변환
        this.setupSSEEventHandlers();
        
        this.isInitialized = true;
        console.log('통신 매니저 초기화 완료');
    }

    /**
     * SSE 이벤트 핸들러 설정
     */
    setupSSEEventHandlers() {
        // SSE 이벤트를 내부 이벤트로 변환
        this.sseManager.on('connected', (data) => {
            this.emit('connected', data);
        });

        this.sseManager.on('progress_update', (data) => {
            this.emit('progress_update', data);
        });

        this.sseManager.on('upload_complete', (data) => {
            this.emit('upload_complete', data);
        });

        this.sseManager.on('hardware_start', (data) => {
            this.emit('hardware_start', data);
        });

        this.sseManager.on('error', (error) => {
            this.emit('error', error);
        });

        this.sseManager.on('max_reconnect_attempts_reached', () => {
            this.emit('max_reconnect_attempts_reached');
        });
    }

    /**
     * 세션 시작
     */
    async startSession(sessionType = 'desktop') {
        try {
            // 세션 ID 생성
            this.sessionId = this.generateSessionId();
            console.log('세션 시작:', this.sessionId);

            // HTTP API로 세션 참여
            await this.httpApi.joinSession(this.sessionId, sessionType);
            console.log('세션 참여 완료:', this.sessionId);

            // SSE 연결
            this.sseManager.connect(this.sessionId);

            return this.sessionId;
        } catch (error) {
            console.error('세션 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 파일 업로드
     */
    async uploadFile(file, peopleCount) {
        if (!this.sessionId) {
            throw new Error('세션이 시작되지 않았습니다.');
        }

        try {
            const result = await this.httpApi.uploadFile(file, peopleCount, this.sessionId);
            console.log('파일 업로드 완료:', result);
            return result;
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * AI 처리 시작
     */
    async startProcessing() {
        if (!this.sessionId) {
            throw new Error('세션이 시작되지 않았습니다.');
        }

        try {
            const result = await this.httpApi.startProcessing(this.sessionId);
            console.log('AI 처리 시작:', result);
            return result;
        } catch (error) {
            console.error('AI 처리 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 시스템 초기화
     */
    async resetSystem() {
        try {
            const result = await this.httpApi.resetSystem();
            console.log('시스템 초기화:', result);
            return result;
        } catch (error) {
            console.error('시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 시스템 상태 조회
     */
    async getStatus() {
        try {
            const result = await this.httpApi.getStatus();
            return result;
        } catch (error) {
            console.error('상태 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 활성 세션 목록 조회
     */
    async getSessions() {
        try {
            const result = await this.httpApi.getSessions();
            return result;
        } catch (error) {
            console.error('세션 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 하드웨어 제어
     */
    async triggerHardware(command) {
        if (!this.sessionId) {
            throw new Error('세션이 시작되지 않았습니다.');
        }

        try {
            const result = await this.httpApi.triggerHardware(this.sessionId, command);
            console.log('하드웨어 제어:', result);
            return result;
        } catch (error) {
            console.error('하드웨어 제어 실패:', error);
            throw error;
        }
    }

    /**
     * 이벤트 핸들러 등록
     */
    on(eventName, handler) {
        this.eventHandlers.set(eventName, handler);
    }

    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        const handler = this.eventHandlers.get(eventName);
        if (handler) {
            try {
                handler(data);
            } catch (error) {
                console.error(`이벤트 핸들러 오류 (${eventName}):`, error);
            }
        }
    }

    /**
     * 특정 이벤트 핸들러 제거
     */
    removeListener(eventName) {
        this.eventHandlers.delete(eventName);
    }

    /**
     * 모든 이벤트 핸들러 제거
     */
    removeAllListeners() {
        this.eventHandlers.clear();
    }

    /**
     * 세션 종료
     */
    disconnect() {
        this.sseManager.disconnect();
        this.sessionId = null;
        this.isInitialized = false;
        console.log('통신 매니저 연결 해제됨');
    }

    /**
     * 세션 ID 생성
     */
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * 연결 상태 확인
     */
    getConnectionState() {
        return {
            sessionId: this.sessionId,
            isInitialized: this.isInitialized,
            httpApi: {
                baseUrl: this.httpApi.baseUrl,
                timeout: this.httpApi.timeout
            },
            sse: this.sseManager.getConnectionState()
        };
    }

    /**
     * 디버그 정보 출력
     */
    debug() {
        console.log('=== Communication Manager Debug Info ===');
        console.log('Session ID:', this.sessionId);
        console.log('Initialized:', this.isInitialized);
        console.log('Event Handlers:', Array.from(this.eventHandlers.keys()));
        console.log('SSE State:', this.sseManager.getConnectionState());
        console.log('========================================');
    }
}

// 전역 통신 매니저 인스턴스
window.commManager = new CommunicationManager({
    baseUrl: '',
    timeout: 30000
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.commManager.initialize();
});
