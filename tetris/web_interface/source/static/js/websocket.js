// WebSocket 통신 관리 (DEPRECATED - HTTP + SSE 하이브리드로 대체됨)
// 이 파일은 하위 호환성을 위해 유지되지만 사용하지 않음
// 
// 새로운 통신 구조를 사용하려면:
// - http-api-manager.js
// - sse-manager.js  
// - communication-manager.js
// 를 사용하세요.
class WebSocketManager {
    constructor(options = {}) {
        this.socket = null;
        this.sessionId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // 시뮬레이션 모드 설정
        this.simulationMode = options.simulationMode || false;
        this.simulationEvents = new Map();
        this.simulationInterval = null;
        
        // 이벤트 핸들러 저장
        this.eventHandlers = new Map();
    }

    connect() {
        if (this.isConnected) {
            return;
        }

        if (this.simulationMode) {
            this.connectSimulation();
        } else {
            this.connectReal();
        }
    }

    connectReal() {
        if (this.socket && this.socket.connected) {
            return;
        }

        // Socket.IO 연결 옵션 설정 (Python 3.11 최적화)
        this.socket = io({
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true,
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        this.socket.on('connect', () => {
            console.log('WebSocket 연결됨');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.onConnect();
            
            // 연결 후 세션 조인 시도
            this.joinCurrentSession();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket 연결 끊어짐:', reason);
            this.isConnected = false;
            this.onDisconnect();
            
            // 자동 재연결 시도
            if (reason === 'io server disconnect') {
                // 서버가 연결을 끊은 경우 재연결하지 않음
                return;
            }
            this.attemptReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket 연결 오류:', error);
            this.onConnectError(error);
            this.attemptReconnect();
        });

        // 이벤트 핸들러 등록
        this.registerEventHandlers();
    }

    connectSimulation() {
        console.log('WebSocket 시뮬레이션 모드로 연결');
        this.isConnected = true;
        this.sessionId = this.generateSessionId();
        
        // 시뮬레이션 연결 이벤트 발생
        setTimeout(() => {
            this.onConnect();
            this.joinCurrentSession();
            this.startSimulationEvents();
        }, 1000);
    }

    joinCurrentSession() {
        // 현재 세션 ID가 있다면 조인 시도
        const sessionId = this.getSessionId();
        if (sessionId) {
            this.joinSession(sessionId);
        }
    }

    getSessionId() {
        // 쿠키에서 세션 ID 추출
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'session_id') {
                return value;
            }
        }
        return null;
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('최대 재연결 시도 횟수 초과');
        }
    }

    registerEventHandlers() {
        // 연결 확인 이벤트
        this.socket.on('connected', (data) => {
            console.log('서버 연결 확인:', data);
            this.sessionId = data.session_id;
            this.emit('connected', data);
        });
        
        // 상태 업데이트 이벤트
        this.socket.on('status_update', (data) => {
            console.log('상태 업데이트:', data);
            this.emit('status_update', data);
        });
        
        // 핵심 이벤트 핸들러들
        this.socket.on('upload_complete', (data) => {
            console.log('업로드 완료:', data);
            this.emit('upload_complete', data);
        });
        
        this.socket.on('chain_start', (data) => {
            console.log('체인 시작:', data);
            this.emit('chain_start', data);
        });
        
        this.socket.on('chain_progress', (data) => {
            console.log('체인 진행:', data);
            this.emit('chain_progress', data);
        });
        
        this.socket.on('chain_complete', (data) => {
            console.log('체인 완료:', data);
            this.emit('chain_complete', data);
        });
        
        this.socket.on('hardware_start', (data) => {
            console.log('하드웨어 시작:', data);
            this.emit('hardware_start', data);
        });
        
        // 전체 이벤트 핸들러들
        this.socket.on('hardware_ready', (data) => {
            console.log('하드웨어 준비:', data);
            this.emit('hardware_ready', data);
        });
        
        this.socket.on('hardware_progress', (data) => {
            console.log('하드웨어 진행:', data);
            this.emit('hardware_progress', data);
        });
        
        this.socket.on('hardware_complete', (data) => {
            console.log('하드웨어 완료:', data);
            this.emit('hardware_complete', data);
        });
        
        this.socket.on('sensor_update', (data) => {
            console.log('센서 업데이트:', data);
            this.emit('sensor_update', data);
        });
        
        this.socket.on('user_control', (data) => {
            console.log('사용자 제어:', data);
            this.emit('user_control', data);
        });
        
        // 세션 조인 이벤트
        this.socket.on('session_joined', (data) => {
            console.log('세션 조인됨:', data);
            this.sessionId = data.session_id;
        });
    }

    joinSession(sessionId) {
        this.sessionId = sessionId;
        this.socket.emit('join_session', { session_id: sessionId });
    }

    // 이벤트 콜백들 (하위 클래스에서 오버라이드)
    onConnect() {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onDisconnect() {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onConnectError(error) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onUploadComplete(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onChainStart(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onChainProgress(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onChainComplete(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onStatusUpdate(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    onError(data) {
        // 기본 구현 - 하위 클래스에서 오버라이드
    }

    requestStatus() {
        // 현재 상태 요청
        if (this.socket && this.socket.connected) {
            this.socket.emit('request_status');
        }
    }

    disconnect() {
        if (this.simulationMode) {
            this.disconnectSimulation();
        } else {
            this.disconnectReal();
        }
    }

    disconnectReal() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }

    disconnectSimulation() {
        console.log('WebSocket 시뮬레이션 모드 연결 해제');
        this.isConnected = false;
        this.stopSimulationEvents();
    }

    // 시뮬레이션 관련 메서드들
    generateSessionId() {
        return 'sim_' + Math.random().toString(36).substr(2, 9);
    }

    startSimulationEvents() {
        // 시뮬레이션 이벤트들을 등록
        this.simulationEvents.set('connected', {
            data: { session_id: this.sessionId },
            delay: 2000
        });
    }

    stopSimulationEvents() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    // 시뮬레이션 이벤트 발생
    triggerSimulationEvent(eventName, data, delay = 0) {
        if (!this.simulationMode) return;

        setTimeout(() => {
            const handler = this.eventHandlers.get(eventName);
            if (handler) {
                handler(data);
            }
            console.log(`시뮬레이션 이벤트 발생: ${eventName}`, data);
        }, delay);
    }

    // 이벤트 핸들러 등록 (실제 WebSocket과 동일한 인터페이스)
    on(eventName, handler) {
        this.eventHandlers.set(eventName, handler);
        
        if (this.simulationMode) {
            // 시뮬레이션 모드에서는 즉시 핸들러 등록
            return;
        }
        
        if (this.socket) {
            this.socket.on(eventName, handler);
        }
    }

    // 이벤트 발생 (실제 WebSocket과 동일한 인터페이스)
    emit(eventName, data) {
        if (this.simulationMode) {
            this.emitSimulation(eventName, data);
            return;
        }
        
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        }
    }

    emitSimulation(eventName, data) {
        console.log(`시뮬레이션 이벤트 전송: ${eventName}`, data);
        
        // 특정 이벤트에 대한 시뮬레이션 응답
        switch (eventName) {
            case 'join_session':
                this.triggerSimulationEvent('session_joined', {
                    session_id: data.session_id,
                    status: 'connected'
                }, 500);
                break;
                
            case 'request_status':
                this.triggerSimulationEvent('status_update', {
                    status: 'idle',
                    timestamp: new Date().toISOString()
                }, 1000);
                break;
                
            default:
                console.log(`시뮬레이션 이벤트 처리: ${eventName}`);
        }
    }

    // 시뮬레이션용 체인 진행상황 이벤트 발생
    simulateChainProgress() {
        const steps = [
            { name: 'chain_start', data: { chain_id: 1, timestamp: new Date().toISOString() }, delay: 1000 },
            { name: 'chain_progress', data: { chain_id: 1, step: 1, progress: 25 }, delay: 3000 },
            { name: 'chain_progress', data: { chain_id: 1, step: 2, progress: 50 }, delay: 6000 },
            { name: 'chain_progress', data: { chain_id: 1, step: 3, progress: 75 }, delay: 9000 },
            { name: 'chain_complete', data: { chain_id: 1, result: 'success' }, delay: 12000 }
        ];

        steps.forEach(step => {
            this.triggerSimulationEvent(step.name, step.data, step.delay);
        });
    }

    // 시뮬레이션용 업로드 완료 이벤트 발생
    simulateUploadComplete(fileData) {
        this.triggerSimulationEvent('upload_complete', {
            file_id: 'sim_' + Math.random().toString(36).substr(2, 9),
            filename: fileData.name,
            size: fileData.size,
            timestamp: new Date().toISOString()
        }, 1000);
    }
}

// 전역 WebSocket 매니저 인스턴스 (실제 통신 모드로 설정)
window.wsManager = new WebSocketManager({ simulationMode: false });

// 페이지 로드 시 WebSocket 연결
document.addEventListener('DOMContentLoaded', () => {
    window.wsManager.connect();
});