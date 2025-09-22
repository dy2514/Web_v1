/**
 * WebSocket 클라이언트 - 양방향 실시간 통신
 */
class WebSocketClient {
    constructor(url = 'ws://localhost:8765') {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.connectionId = null;
    }

    /**
     * WebSocket 연결 시작
     */
    connect() {
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = (event) => {
                console.log('WebSocket 연결됨');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.connectionId = this.generateConnectionId();
                this.emit('connected', { connectionId: this.connectionId });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('메시지 파싱 오류:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket 연결 종료됨');
                this.isConnected = false;
                this.emit('disconnected', { code: event.code, reason: event.reason });
                
                // 자동 재연결 시도
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.emit('error', error);
        }
    }

    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    /**
     * 메시지 전송
     */
    send(type, data = {}) {
        if (!this.isConnected || !this.ws) {
            console.warn('WebSocket이 연결되지 않음');
            return false;
        }

        const message = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            connectionId: this.connectionId
        };

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            return false;
        }
    }

    /**
     * 메시지 핸들러 등록
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    /**
     * 메시지 핸들러 제거
     */
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * 메시지 처리
     */
    handleMessage(data) {
        const messageType = data.type || 'unknown';
        const handlers = this.messageHandlers.get(messageType) || [];
        
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`메시지 핸들러 오류 (${messageType}):`, error);
            }
        });
    }

    /**
     * 이벤트 발생
     */
    emit(eventType, data) {
        const handlers = this.messageHandlers.get(eventType) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`이벤트 핸들러 오류 (${eventType}):`, error);
            }
        });
    }

    /**
     * 재연결 스케줄링
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.connect();
            }
        }, delay);
    }

    /**
     * 연결 ID 생성
     */
    generateConnectionId() {
        return 'ws_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * 연결 상태 확인
     */
    getConnectionState() {
        return {
            isConnected: this.isConnected,
            connectionId: this.connectionId,
            reconnectAttempts: this.reconnectAttempts,
            url: this.url
        };
    }
}

// 전역 WebSocket 클라이언트 인스턴스
window.wsClient = new WebSocketClient();

// 자동 연결
document.addEventListener('DOMContentLoaded', () => {
    window.wsClient.connect();
});

// 페이지 언로드 시 연결 종료
window.addEventListener('beforeunload', () => {
    window.wsClient.disconnect();
});
