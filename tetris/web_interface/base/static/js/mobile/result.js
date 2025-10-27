/**
 * 모바일 결과 페이지 JavaScript
 * Phase 2.2: 기본 결과 표시 및 제어 로직
 */

class ResultController {
    constructor() {
        this.hardwareCode = '0000000000000000';
        this.isExecuting = false;
        this.sensorData = {
            distance: 0,
            temperature: 0,
            pressure: 0,
            status: 'ready'
        };
        
        this.hardwareCodeElement = document.getElementById('hardwareCode');
        this.copyBtn = document.getElementById('copyBtn');
        this.executeBtn = document.getElementById('executeBtn');
        this.testBtn = document.getElementById('testBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.statusBtn = document.getElementById('statusBtn');
        this.newAnalysisBtn = document.getElementById('newAnalysisBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.sensorGrid = document.getElementById('sensorGrid');
        this.logContent = document.getElementById('logContent');
        
        this.init();
    }

    init() {
        this.generateHardwareCode();
        this.renderSensorData();
        this.bindEvents();
        this.startSensorUpdates();
    }
    
    bindEvents() {
        this.copyBtn.addEventListener('click', () => {
            this.copyHardwareCode();
        });
        
        this.executeBtn.addEventListener('click', () => {
            this.executeHardware();
        });
        
        this.testBtn.addEventListener('click', () => {
            this.testHardware();
        });
        
        this.stopBtn.addEventListener('click', () => {
            this.stopHardware();
        });
        
        this.resetBtn.addEventListener('click', () => {
            this.resetHardware();
        });
        
        this.statusBtn.addEventListener('click', () => {
            this.checkHardwareStatus();
        });
        
        this.newAnalysisBtn.addEventListener('click', () => {
            this.startNewAnalysis();
        });
        
        this.shareBtn.addEventListener('click', () => {
            this.shareResult();
        });
    }
    
    generateHardwareCode() {
        // Phase 5에서 실제 AI 결과를 받아와서 생성 예정
        // 현재는 랜덤 16자리 코드 생성
        const chars = '0123456789ABCDEF';
        this.hardwareCode = '';
        for (let i = 0; i < 16; i++) {
            this.hardwareCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        this.hardwareCodeElement.textContent = this.hardwareCode;
    }
    
    copyHardwareCode() {
        navigator.clipboard.writeText(this.hardwareCode).then(() => {
            this.showCopySuccess();
        }).catch(() => {
            // 클립보드 API가 지원되지 않는 경우 대체 방법
            this.fallbackCopy();
        });
    }
    
    fallbackCopy() {
        const textArea = document.createElement('textarea');
        textArea.value = this.hardwareCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showCopySuccess();
    }
    
    showCopySuccess() {
        this.hardwareCodeElement.classList.add('copied');
        this.copyBtn.textContent = '복사됨!';
        
        setTimeout(() => {
            this.hardwareCodeElement.classList.remove('copied');
            this.copyBtn.textContent = '복사';
        }, 2000);
    }
    
    executeHardware() {
        if (this.isExecuting) {
            this.showError('이미 실행 중입니다.');
            return;
        }
        
        if (confirm('하드웨어를 실행하시겠습니까?')) {
            this.isExecuting = true;
            this.updateExecuteButton(true);
            this.addLogEntry('하드웨어 실행 시작');
            
            // Phase 6에서 실제 하드웨어 제어 API 호출 예정
            this.simulateHardwareExecution();
        }
    }
    
    testHardware() {
        this.addLogEntry('하드웨어 테스트 시작');
        this.updateSensorData({
            distance: Math.floor(Math.random() * 100),
            temperature: Math.floor(Math.random() * 40) + 20,
            pressure: Math.floor(Math.random() * 1000) + 500,
            status: 'testing'
        });
        
        setTimeout(() => {
            this.addLogEntry('하드웨어 테스트 완료');
            this.updateSensorData({
                ...this.sensorData,
                status: 'ready'
            });
        }, 3000);
    }
    
    stopHardware() {
        if (!this.isExecuting) {
            this.showError('실행 중인 작업이 없습니다.');
            return;
        }
        
        this.isExecuting = false;
        this.updateExecuteButton(false);
        this.addLogEntry('하드웨어 실행 중지');
    }
    
    resetHardware() {
        if (confirm('하드웨어를 초기화하시겠습니까?')) {
            this.isExecuting = false;
            this.updateExecuteButton(false);
            this.updateSensorData({
                distance: 0,
                temperature: 0,
                pressure: 0,
                status: 'reset'
            });
            this.addLogEntry('하드웨어 초기화 완료');
        }
    }
    
    checkHardwareStatus() {
        this.addLogEntry('하드웨어 상태 확인 중...');
        
        // Phase 6에서 실제 상태 확인 API 호출 예정
        setTimeout(() => {
            this.addLogEntry(`하드웨어 상태: ${this.sensorData.status}`);
        }, 1000);
    }
    
    updateExecuteButton(executing) {
        if (executing) {
            this.executeBtn.innerHTML = '<span class="btn-icon">⏸️</span>실행 중...';
            this.executeBtn.classList.add('btn-warning');
            this.executeBtn.classList.remove('btn-primary');
        } else {
            this.executeBtn.innerHTML = '<span class="btn-icon">🚗</span>하드웨어 실행';
            this.executeBtn.classList.add('btn-primary');
            this.executeBtn.classList.remove('btn-warning');
        }
    }
    
    simulateHardwareExecution() {
        // Phase 6에서 실제 하드웨어 제어로 교체 예정
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            
            if (progress >= 100) {
                clearInterval(interval);
                this.isExecuting = false;
                this.updateExecuteButton(false);
                this.addLogEntry('하드웨어 실행 완료');
                this.showSuccess('하드웨어 실행이 완료되었습니다!');
            } else {
                this.addLogEntry(`실행 진행률: ${progress}%`);
            }
        }, 500);
    }
    
    renderSensorData() {
        this.sensorGrid.innerHTML = `
            <div class="sensor-item">
                <div class="sensor-label">거리</div>
                <div class="sensor-value">${this.sensorData.distance}<span class="sensor-unit">cm</span></div>
            </div>
            <div class="sensor-item">
                <div class="sensor-label">온도</div>
                <div class="sensor-value">${this.sensorData.temperature}<span class="sensor-unit">°C</span></div>
            </div>
            <div class="sensor-item">
                <div class="sensor-label">압력</div>
                <div class="sensor-value">${this.sensorData.pressure}<span class="sensor-unit">Pa</span></div>
            </div>
            <div class="sensor-item">
                <div class="sensor-label">상태</div>
                <div class="sensor-value">${this.sensorData.status}</div>
            </div>
        `;
    }
    
    updateSensorData(newData) {
        this.sensorData = { ...this.sensorData, ...newData };
        this.renderSensorData();
        
        // 센서 값 업데이트 애니메이션
        this.sensorGrid.querySelectorAll('.sensor-value').forEach(el => {
            el.classList.add('updated');
            setTimeout(() => el.classList.remove('updated'), 300);
        });
    }
    
    startSensorUpdates() {
        // Phase 6에서 실제 센서 데이터 수집으로 교체 예정
        setInterval(() => {
            if (this.isExecuting) {
                this.updateSensorData({
                    distance: Math.floor(Math.random() * 100),
                    temperature: Math.floor(Math.random() * 40) + 20,
                    pressure: Math.floor(Math.random() * 1000) + 500
                });
            }
        }, 2000);
    }
    
    addLogEntry(message) {
        const now = new Date();
        const time = now.toLocaleTimeString('ko-KR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry new';
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logContent.appendChild(logEntry);
        
        // 로그가 많아지면 스크롤을 맨 아래로
        this.logContent.scrollTop = this.logContent.scrollHeight;
        
        // 최대 50개 로그만 유지
        const entries = this.logContent.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
    }
    
    startNewAnalysis() {
        if (confirm('새로운 분석을 시작하시겠습니까?')) {
            window.location.href = '/mobile/input';
        }
    }
    
    shareResult() {
        const shareData = {
            title: 'AI TETRIS 분석 결과',
            text: `하드웨어 제어 코드: ${this.hardwareCode}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
            } else {
            // 대체 방법: 클립보드에 복사
            navigator.clipboard.writeText(shareData.text).then(() => {
                this.showSuccess('결과가 클립보드에 복사되었습니다.');
            }).catch(() => {
                this.showError('공유 기능을 사용할 수 없습니다.');
            });
        }
    }
    
    showError(message) {
        // 간단한 에러 표시 (향후 토스트 메시지로 개선 예정)
        alert('오류: ' + message);
    }
    
    showSuccess(message) {
        // 간단한 성공 표시 (향후 토스트 메시지로 개선 예정)
        alert('성공: ' + message);
    }
}

// 전역 변수로 인스턴스 생성
let resultController;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    resultController = new ResultController();
});

// WebSocket 연동을 위한 기본 구조 (Phase 4에서 구현 예정)
class ResultWebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.eventHandlers = {};
    }
    
    connect() {
        // Phase 4에서 구현 예정
        console.log('Result WebSocket 연결 준비됨');
    }
    
    disconnect() {
        // Phase 4에서 구현 예정
        console.log('Result WebSocket 연결 해제됨');
    }
    
    on(event, handler) {
        // Phase 4에서 구현 예정
        this.eventHandlers[event] = handler;
    }
    
    emit(event, data) {
        // Phase 4에서 구현 예정
        console.log('Result WebSocket 이벤트:', event, data);
    }
    
    // 예상 이벤트들
    handleHardwareStart(data) {
        // Phase 4에서 구현 예정
        console.log('하드웨어 시작:', data);
    }
    
    handleHardwareProgress(data) {
        // Phase 4에서 구현 예정
        console.log('하드웨어 진행상황:', data);
    }
    
    handleHardwareComplete(data) {
        // Phase 4에서 구현 예정
        console.log('하드웨어 완료:', data);
    }
    
    handleSensorUpdate(data) {
        // Phase 4에서 구현 예정
        console.log('센서 데이터 업데이트:', data);
    }
    
    handleUserControl(data) {
        // Phase 4에서 구현 예정
        console.log('사용자 제어:', data);
    }
}

// 전역 WebSocket 매니저 인스턴스
window.resultWsManager = new ResultWebSocketManager();