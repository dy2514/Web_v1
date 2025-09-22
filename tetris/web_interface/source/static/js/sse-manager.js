/**
 * SSE Manager - Server-Sent Events 전용 관리자
 * Phase 2: HTTP + SSE 하이브리드 통신 구조
 */

class SSEManager {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.eventSource = null;
        this.isConnected = false;
        this.sessionId = null;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.reconnectTimer = null;
    }

    /**
     * SSE 연결
     */
    connect(sessionId) {
        if (this.isConnected && this.sessionId === sessionId) {
            console.log('SSE 이미 연결됨');
            return;
        }

        this.sessionId = sessionId;
        this.disconnect();

        const url = `${this.baseUrl}/desktop/api/progress_stream?session_id=${sessionId}`;
        console.log('SSE 연결 시도:', url);
        
        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
            console.log('SSE 연결됨');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', { session_id: sessionId });
        };

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleProgressUpdate(data);
            } catch (error) {
                console.error('SSE 데이터 파싱 오류:', error);
                this.emit('error', { message: 'Data parsing error', error });
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE 연결 오류:', error);
            this.isConnected = false;
            this.emit('error', error);
            this.attemptReconnect();
        };
    }

    /**
     * 진행 상태 업데이트 처리
     */
    handleProgressUpdate(data) {
        const eventType = data.event || 'progress_update';
        this.emit(eventType, data);
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
     * 재연결 시도
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('SSE 최대 재연결 시도 횟수 초과');
            this.emit('max_reconnect_attempts_reached');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`SSE 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
        
        this.reconnectTimer = setTimeout(() => {
            if (this.sessionId) {
                this.connect(this.sessionId);
            }
        }, delay);
    }

    /**
     * SSE 연결 해제
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        console.log('SSE 연결 해제됨');
    }

    /**
     * 연결 상태 확인
     */
    getConnectionState() {
        return {
            isConnected: this.isConnected,
            sessionId: this.sessionId,
            reconnectAttempts: this.reconnectAttempts,
            readyState: this.eventSource ? this.eventSource.readyState : null
        };
    }

    /**
     * 모든 이벤트 핸들러 제거
     */
    removeAllListeners() {
        this.eventHandlers.clear();
    }

    /**
     * 특정 이벤트 핸들러 제거
     */
    removeListener(eventName) {
        this.eventHandlers.delete(eventName);
    }
}

// 전역 SSE 매니저 인스턴스
window.sseManager = new SSEManager({
    baseUrl: ''
});
