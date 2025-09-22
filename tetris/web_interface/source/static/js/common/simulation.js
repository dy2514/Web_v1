/**
 * 실시간 통신 시뮬레이션
 * Phase 2.4: WebSocket 대신 시뮬레이션 구현
 */

class SimulationManager {
    constructor() {
        this.isRunning = false;
        this.simulationData = {
            currentStep: 0,
            overallProgress: 0,
            chainStatus: 'idle',
            hardwareStatus: 'idle',
            uploadedFile: null,
            sessionId: null
        };
        
        this.eventListeners = new Map();
        this.simulationInterval = null;
    }

    /**
     * 시뮬레이션 시작
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('시뮬레이션 시작');
        
        // 시뮬레이션 데이터 초기화
        this.simulationData = {
            currentStep: 0,
            overallProgress: 0,
            chainStatus: 'idle',
            hardwareStatus: 'idle',
            uploadedFile: null,
            sessionId: 'sim_' + Math.random().toString(36).substr(2, 9)
        };

        // 주기적 상태 업데이트
        this.simulationInterval = setInterval(() => {
            this.updateSimulation();
        }, 5000);
    }

    /**
     * 시뮬레이션 중지
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        console.log('시뮬레이션 중지');
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    /**
     * 시뮬레이션 업데이트
     */
    updateSimulation() {
        if (!this.isRunning) return;

        // 랜덤 이벤트 발생
        const random = Math.random();
        
        if (random < 0.1 && this.simulationData.chainStatus === 'idle') {
            // 10% 확률로 체인 시작
            this.simulateChainStart();
        } else if (random < 0.3 && this.simulationData.chainStatus === 'running') {
            // 30% 확률로 체인 진행상황 업데이트
            this.simulateChainProgress();
        } else if (random < 0.05 && this.simulationData.chainStatus === 'running') {
            // 5% 확률로 체인 완료
            this.simulateChainComplete();
        } else if (random < 0.2 && this.simulationData.hardwareStatus === 'idle' && this.simulationData.chainStatus === 'completed') {
            // 20% 확률로 하드웨어 시작
            this.simulateHardwareStart();
        }
    }

    /**
     * 체인 시작 시뮬레이션
     */
    simulateChainStart() {
        console.log('시뮬레이션: 체인 시작');
        
        this.simulationData.chainStatus = 'running';
        this.simulationData.currentStep = 1;
        this.simulationData.overallProgress = 0;

        this.emit('chain_start', {
            chain_id: 1,
            timestamp: new Date().toISOString()
        });

        // 체인 진행상황 시뮬레이션 시작
        this.simulateChainProgressSequence();
    }

    /**
     * 체인 진행상황 시퀀스 시뮬레이션
     */
    simulateChainProgressSequence() {
        const steps = [
            { step: 1, name: '이미지 분석', duration: 3000 },
            { step: 2, name: '데이터 처리', duration: 4000 },
            { step: 3, name: '결과 생성', duration: 3000 },
            { step: 4, name: '하드웨어 코드 생성', duration: 2000 }
        ];

        let currentStepIndex = 0;
        
        const progressInterval = setInterval(() => {
            if (!this.isRunning || currentStepIndex >= steps.length) {
                clearInterval(progressInterval);
                return;
            }

            const step = steps[currentStepIndex];
            this.simulationData.currentStep = step.step;
            this.simulationData.overallProgress = (currentStepIndex / steps.length) * 100;

            this.emit('chain_progress', {
                chain_id: 1,
                step: step.step,
                step_name: step.name,
                progress: this.simulationData.overallProgress,
                timestamp: new Date().toISOString()
            });

            currentStepIndex++;
        }, 3000);
    }

    /**
     * 체인 완료 시뮬레이션
     */
    simulateChainComplete() {
        console.log('시뮬레이션: 체인 완료');
        
        this.simulationData.chainStatus = 'completed';
        this.simulationData.currentStep = 4;
        this.simulationData.overallProgress = 100;

        this.emit('chain_complete', {
            chain_id: 1,
            result: 'success',
            code: this.generateRandomCode(),
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 하드웨어 시작 시뮬레이션
     */
    simulateHardwareStart() {
        console.log('시뮬레이션: 하드웨어 시작');
        
        this.simulationData.hardwareStatus = 'running';

        this.emit('hardware_start', {
            hardware_id: 'sim_hw_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString()
        });

        // 하드웨어 진행상황 시뮬레이션
        this.simulateHardwareProgress();
    }

    /**
     * 하드웨어 진행상황 시뮬레이션
     */
    simulateHardwareProgress() {
        let progress = 0;
        
        const progressInterval = setInterval(() => {
            if (!this.isRunning || progress >= 100) {
                clearInterval(progressInterval);
                
                if (progress >= 100) {
                    this.simulateHardwareComplete();
                }
                return;
            }

            progress += Math.random() * 20;
            if (progress > 100) progress = 100;

            this.emit('hardware_progress', {
                hardware_id: 'sim_hw_' + Math.random().toString(36).substr(2, 9),
                progress: progress,
                timestamp: new Date().toISOString()
            });
        }, 1000);
    }

    /**
     * 하드웨어 완료 시뮬레이션
     */
    simulateHardwareComplete() {
        console.log('시뮬레이션: 하드웨어 완료');
        
        this.simulationData.hardwareStatus = 'completed';

        this.emit('hardware_complete', {
            hardware_id: 'sim_hw_' + Math.random().toString(36).substr(2, 9),
            result: 'success',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 업로드 완료 시뮬레이션
     */
    simulateUploadComplete(fileData) {
        console.log('시뮬레이션: 업로드 완료');
        
        this.simulationData.uploadedFile = {
            filename: fileData.name,
            size: fileData.size,
            type: fileData.type
        };

        this.emit('upload_complete', {
            file_id: 'sim_' + Math.random().toString(36).substr(2, 9),
            filename: fileData.name,
            size: fileData.size,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 랜덤 코드 생성 (16자리)
     */
    generateRandomCode() {
        return Math.random().toString(36).substr(2, 16).toUpperCase();
    }

    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('시뮬레이션 이벤트 핸들러 오류:', error);
                }
            });
        }
    }

    /**
     * 현재 상태 조회
     */
    getStatus() {
        return { ...this.simulationData };
    }

    /**
     * 상태 초기화
     */
    reset() {
        this.stop();
        this.simulationData = {
            currentStep: 0,
            overallProgress: 0,
            chainStatus: 'idle',
            hardwareStatus: 'idle',
            uploadedFile: null,
            sessionId: null
        };
    }
}

// 전역 시뮬레이션 매니저 인스턴스
window.simulationManager = new SimulationManager();

// WebSocket 매니저와 연동
if (window.wsManager) {
    // 시뮬레이션 이벤트를 WebSocket 매니저로 전달
    window.simulationManager.on('chain_start', (data) => {
        window.wsManager.triggerSimulationEvent('chain_start', data);
    });
    
    window.simulationManager.on('chain_progress', (data) => {
        window.wsManager.triggerSimulationEvent('chain_progress', data);
    });
    
    window.simulationManager.on('chain_complete', (data) => {
        window.wsManager.triggerSimulationEvent('chain_complete', data);
    });
    
    window.simulationManager.on('hardware_start', (data) => {
        window.wsManager.triggerSimulationEvent('hardware_start', data);
    });
    
    window.simulationManager.on('hardware_progress', (data) => {
        window.wsManager.triggerSimulationEvent('hardware_progress', data);
    });
    
    window.simulationManager.on('hardware_complete', (data) => {
        window.wsManager.triggerSimulationEvent('hardware_complete', data);
    });
    
    window.simulationManager.on('upload_complete', (data) => {
        window.wsManager.triggerSimulationEvent('upload_complete', data);
    });
}

// 페이지 로드 시 시뮬레이션 시작
document.addEventListener('DOMContentLoaded', () => {
    // 5초 후 시뮬레이션 시작
    setTimeout(() => {
        window.simulationManager.start();
    }, 5000);
});

// 페이지 언로드 시 시뮬레이션 중지
window.addEventListener('beforeunload', () => {
    window.simulationManager.stop();
});


