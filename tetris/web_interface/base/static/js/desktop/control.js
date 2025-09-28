/**
 * 데스크탑 관제 화면 JavaScript
 * Phase 2.3: 기본 UI 상호작용 및 시뮬레이션
 */

class ControlController {
    constructor() {
        this.currentStep = 0;
        this.isProcessing = false;
        this.hardwareConnected = false;
        
        // DOM 요소들
        this.waitingSection = document.getElementById('waitingSection');
        this.monitoringSection = document.getElementById('monitoringSection');
        this.stepIndicator = document.getElementById('stepIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.overallProgress = document.getElementById('overallProgress');
        this.progressText = document.getElementById('progressText');
        
        // 하드웨어 제어 요소들
        this.startHwBtn = document.getElementById('startHwBtn');
        this.stopHwBtn = document.getElementById('stopHwBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.hwStatus = document.getElementById('hwStatus');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupWebSocket();
        this.startSimulation();
        this.updateConnectionStatus();
        
        // AI 분석 시작 (모바일 연결 시뮬레이션 후)
        setTimeout(() => {
            if (window.startAIAnalysis) {
                window.startAIAnalysis();
            }
        }, 5000);
    }
    
    bindEvents() {
        // 하드웨어 제어 버튼 이벤트
        this.startHwBtn.addEventListener('click', () => {
            this.startHardware();
        });
        
        this.stopHwBtn.addEventListener('click', () => {
            this.stopHardware();
        });
        
        this.resetBtn.addEventListener('click', () => {
            this.resetSystem();
        });
        
        // QR 코드 새로고침 (5분마다)
        setInterval(() => {
            this.refreshQRCode();
        }, 300000);
    }

    setupWebSocket() {
        if (window.wsManager) {
            // WebSocket 이벤트 핸들러 등록
            window.wsManager.on('upload_complete', (data) => {
                this.handleUploadComplete(data);
            });
            
            window.wsManager.on('chain_progress', (data) => {
                this.handleChainProgress(data);
            });
            
            window.wsManager.on('chain_complete', (data) => {
                this.handleChainComplete(data);
            });
            
            window.wsManager.on('hardware_start', (data) => {
                this.handleHardwareStart(data);
            });
            
            window.wsManager.on('hardware_progress', (data) => {
                this.handleHardwareProgress(data);
            });
            
            window.wsManager.on('hardware_complete', (data) => {
                this.handleHardwareComplete(data);
            });
        }
    }

    handleUploadComplete(data) {
        console.log('업로드 완료:', data);
        this.simulateMobileConnection();
    }

    handleChainProgress(data) {
        console.log('체인 진행상황:', data);
        if (data.step !== undefined) {
            this.updateStepIndicator(data.step - 1);
            this.updateOverallProgress(data.progress);
        }
    }

    handleChainComplete(data) {
        console.log('체인 완료:', data);
        this.completeAIChain();
    }

    handleHardwareStart(data) {
        console.log('하드웨어 시작:', data);
        this.startHwBtn.disabled = true;
        this.stopHwBtn.disabled = false;
        this.hwStatus.textContent = '실행 중...';
    }

    handleHardwareProgress(data) {
        console.log('하드웨어 진행상황:', data);
        if (data.progress !== undefined) {
            this.hwStatus.textContent = `실행 중... ${Math.round(data.progress)}%`;
        }
    }

    handleHardwareComplete(data) {
        console.log('하드웨어 완료:', data);
        this.completeHardwareExecution();
    }
    
    startSimulation() {
        // 시뮬레이션: 30초마다 모바일 연결 시뮬레이션
        setTimeout(() => {
            this.simulateMobileConnection();
        }, 30000);
    }
    
    simulateMobileConnection() {
        // 모바일 연결 시뮬레이션
        this.waitingSection.style.display = 'none';
        this.monitoringSection.style.display = 'block';
            this.updateConnectionStatus(true);
        
        // 업로드된 이미지 시뮬레이션
        this.simulateImageUpload();
        
        // AI 체인 시작 시뮬레이션
        setTimeout(() => {
            this.simulateAIChain();
        }, 2000);
    }
    
    simulateImageUpload() {
        const imagePreview = document.getElementById('imagePreview');
        const peopleCount = document.getElementById('peopleCount');
        const uploadTime = document.getElementById('uploadTime');
        
        // 시뮬레이션 데이터
        imagePreview.innerHTML = `
            <img src="/static/uploads/sample.jpg" alt="업로드된 이미지" style="max-width: 100%; height: auto;">
        `;
        peopleCount.textContent = '2';
        uploadTime.textContent = new Date().toLocaleTimeString();
    }
    
    simulateAIChain() {
        this.isProcessing = true;
        
        // 4단계 AI 체인 시뮬레이션
        const steps = [
            { name: '사용자 입력 분석', duration: 30000 },
            { name: '데이터 처리', duration: 45000 },
            { name: '최적화 생성', duration: 30000 },
            { name: '하드웨어 구동', duration: 15000 }
        ];
        
        let currentStep = 0;
        
        const processStep = () => {
            if (currentStep >= steps.length) {
                this.completeAIChain();
                return;
            }
            
            this.updateStepIndicator(currentStep);
            this.updateOverallProgress((currentStep + 1) / steps.length * 100);
            
            // 단계별 진행상황 카드 업데이트
            this.updateStepCard(currentStep);
            
            setTimeout(() => {
                currentStep++;
                processStep();
            }, steps[currentStep].duration);
        };
        
        processStep();
    }
    
    updateStepIndicator(stepIndex) {
        const steps = this.stepIndicator.querySelectorAll('.step-item');
        
        steps.forEach((step, index) => {
            step.classList.remove('done', 'active');
            
            if (index < stepIndex) {
                step.classList.add('done');
            } else if (index === stepIndex) {
                step.classList.add('active');
            }
        });
        
        this.currentStep = stepIndex;
    }
    
    updateOverallProgress(percentage) {
        this.overallProgress.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.round(percentage)}%`;
    }
    
    updateStepCard(stepIndex) {
        const stepCards = document.querySelectorAll('.step-card');
        const stepStatuses = document.querySelectorAll('.step-status');
        const stepProgresses = document.querySelectorAll('.step-progress .progress-fill');
        const stepPercents = document.querySelectorAll('.progress-percent');
        
        if (stepCards[stepIndex]) {
            // 이전 단계 완료 표시
            if (stepIndex > 0) {
                stepCards[stepIndex - 1].classList.add('completed');
                stepStatuses[stepIndex - 1].textContent = '완료';
                stepProgresses[stepIndex - 1].style.width = '100%';
                stepPercents[stepIndex - 1].textContent = '100%';
            }
            
            // 현재 단계 활성화
            stepCards[stepIndex].classList.add('running');
            stepStatuses[stepIndex].textContent = '실행중';
            
            // 진행률 애니메이션
            this.animateProgress(stepProgresses[stepIndex], stepPercents[stepIndex]);
        }
    }
    
    animateProgress(progressBar, progressText) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }, 500);
    }
    
    completeAIChain() {
        this.isProcessing = false;
        this.updateOverallProgress(100);
        
        // 모든 단계 완료 표시
        const stepCards = document.querySelectorAll('.step-card');
        const stepStatuses = document.querySelectorAll('.step-status');
        const stepProgresses = document.querySelectorAll('.step-progress .progress-fill');
        const stepPercents = document.querySelectorAll('.progress-percent');
        
        stepCards.forEach(card => {
            card.classList.remove('running');
            card.classList.add('completed');
        });
        
        stepStatuses.forEach(status => {
            status.textContent = '완료';
        });
        
        stepProgresses.forEach(progress => {
            progress.style.width = '100%';
        });
        
        stepPercents.forEach(percent => {
            percent.textContent = '100%';
        });
        
        // 하드웨어 제어 버튼 활성화
        this.startHwBtn.disabled = false;
        this.hwStatus.textContent = '실행 준비 완료';
        
        // 하드웨어 연결 시뮬레이션
        setTimeout(() => {
            this.hardwareConnected = true;
            this.updateConnectionStatus(true);
        }, 1000);
    }
    
    startHardware() {
        if (!this.hardwareConnected) {
            alert('하드웨어가 연결되지 않았습니다.');
            return;
        }
        
        this.startHwBtn.disabled = true;
        this.stopHwBtn.disabled = false;
        this.hwStatus.textContent = '실행 중...';
        
        // 하드웨어 실행 시뮬레이션
        this.simulateHardwareExecution();
    }
    
    stopHardware() {
        this.startHwBtn.disabled = false;
        this.stopHwBtn.disabled = true;
        this.hwStatus.textContent = '중지됨';
    }
    
    simulateHardwareExecution() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                this.completeHardwareExecution();
            }
            
            this.hwStatus.textContent = `실행 중... ${Math.round(progress)}%`;
        }, 1000);
    }
    
    completeHardwareExecution() {
        this.startHwBtn.disabled = true;
        this.stopHwBtn.disabled = true;
        this.hwStatus.textContent = '실행 완료';
        
        // 결과 표시
        this.showExecutionResult();
    }
    
    showExecutionResult() {
        const hardwareResult = document.getElementById('hardwareResult');
        hardwareResult.innerHTML = `
            <div class="result-content">
                <h5>하드웨어 실행 완료</h5>
                <p>좌석 배치가 성공적으로 완료되었습니다.</p>
                <div class="code-display">16자리 제어 코드: 1234567890ABCDEF</div>
            </div>
        `;
        hardwareResult.style.display = 'block';
    }
    
    resetSystem() {
        if (confirm('시스템을 리셋하시겠습니까?')) {
            // 모든 상태 초기화
            this.currentStep = 0;
            this.isProcessing = false;
            this.hardwareConnected = false;
            
            // UI 초기화
            this.waitingSection.style.display = 'block';
            this.monitoringSection.style.display = 'none';
            
            // 단계 인디케이터 초기화
            this.updateStepIndicator(-1);
            this.updateOverallProgress(0);
            
            // 하드웨어 상태 초기화
            this.startHwBtn.disabled = true;
            this.stopHwBtn.disabled = true;
            this.hwStatus.textContent = '대기중';
            
            // 단계 카드 초기화
            const stepCards = document.querySelectorAll('.step-card');
            const stepStatuses = document.querySelectorAll('.step-status');
            const stepProgresses = document.querySelectorAll('.step-progress .progress-fill');
            const stepPercents = document.querySelectorAll('.progress-percent');
            
            stepCards.forEach(card => {
                card.classList.remove('running', 'completed');
            });
            
            stepStatuses.forEach(status => {
                status.textContent = '대기중';
            });
            
            stepProgresses.forEach(progress => {
                progress.style.width = '0%';
            });
            
            stepPercents.forEach(percent => {
                percent.textContent = '0%';
            });
            
            // 결과 숨기기
            const results = document.querySelectorAll('.step-result');
            results.forEach(result => {
                result.style.display = 'none';
            });
            
            // 새로운 시뮬레이션 시작
            setTimeout(() => {
                this.startSimulation();
            }, 5000);
        }
    }

    updateConnectionStatus(connected) {
        const indicator = this.connectionStatus.querySelector('.status-indicator');
        const text = this.connectionStatus.querySelector('span:last-child');
        
        if (connected) {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            text.textContent = '모바일 기기 연결됨';
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            text.textContent = '모바일 기기 연결 대기중';
        }
    }
    
    refreshQRCode() {
        // QR 코드 새로고침 (실제 구현에서는 서버에서 새로 생성)
        console.log('QR 코드 새로고침');
    }
}

// 전역 변수로 인스턴스 생성
let controlController;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    controlController = new ControlController();
    
    // WebSocket 매니저 초기화
    new ControlWebSocketManager();
});

// WebSocket 연동 구현 (Phase 4)
class ControlWebSocketManager {
    constructor() {
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        if (window.wsManager) {
            // WebSocket 이벤트 핸들러 등록
            window.wsManager.on('upload_complete', (data) => {
                this.handleUploadComplete(data);
            });
            
            window.wsManager.on('chain_progress', (data) => {
                this.handleChainProgress(data);
            });
            
            window.wsManager.on('chain_complete', (data) => {
                this.handleChainComplete(data);
            });
            
            window.wsManager.on('hardware_start', (data) => {
                this.handleHardwareStart(data);
            });
            
            window.wsManager.on('hardware_progress', (data) => {
                this.handleHardwareProgress(data);
            });
            
            window.wsManager.on('hardware_complete', (data) => {
                this.handleHardwareComplete(data);
            });
            
            window.wsManager.on('status_update', (data) => {
                this.handleStatusUpdate(data);
            });
        }
    }
    
    handleUploadComplete(data) {
        console.log('업로드 완료:', data);
        if (controlController) {
            controlController.updateConnectionStatus(true);
            controlController.showNotification('파일 업로드 완료', 'success');
        }
    }
    
    handleChainProgress(data) {
        console.log('체인 진행:', data);
        if (controlController) {
            controlController.updateStepProgress(data.chain_id, data.progress);
            controlController.updateOverallProgress(data.total_progress);
        }
    }
    
    handleChainComplete(data) {
        console.log('체인 완료:', data);
        if (controlController) {
            controlController.completeStep(data.chain_id);
            if (data.all_chains_completed) {
                controlController.showNotification('AI 처리 완료', 'success');
            }
        }
    }
    
    handleHardwareStart(data) {
        console.log('하드웨어 시작:', data);
        if (controlController) {
            controlController.updateHardwareStatus('running');
            controlController.showNotification('하드웨어 실행 시작', 'info');
        }
    }
    
    handleHardwareProgress(data) {
        console.log('하드웨어 진행:', data);
        if (controlController) {
            controlController.updateHardwareProgress(data.progress, data.step);
        }
    }
    
    handleHardwareComplete(data) {
        console.log('하드웨어 완료:', data);
        if (controlController) {
            controlController.updateHardwareStatus('completed');
            controlController.showNotification('하드웨어 실행 완료', 'success');
        }
    }
    
    handleStatusUpdate(data) {
        console.log('상태 업데이트:', data);
        if (controlController) {
            controlController.updateSystemStatus(data);
        }
    }
    
    emit(event, data) {
        // Phase 4에서 구현 예정
        console.log('Control WebSocket 이벤트:', event, data);
    }
    
    // 예상 이벤트들
    handleUploadComplete(data) {
        // Phase 4에서 구현 예정
        console.log('파일 업로드 완료:', data);
    }
    
    handleChainStart(data) {
        // Phase 4에서 구현 예정
        console.log('AI 체인 시작:', data);
    }
    
    handleChainProgress(data) {
        // Phase 4에서 구현 예정
        console.log('AI 체인 진행상황:', data);
    }
    
    handleChainComplete(data) {
        // Phase 4에서 구현 예정
        console.log('AI 체인 완료:', data);
    }
    
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
}

// 전역 WebSocket 매니저 인스턴스
window.controlWsManager = new ControlWebSocketManager();