/**
 * 모바일 진행상황 페이지 JavaScript
 * Phase 2.2: 기본 진행상황 표시 로직
 */

class ProgressController {
    constructor() {
        this.overallProgress = 0;
        this.currentStep = 0;
        this.startTime = Date.now();
        this.steps = [
            {
                id: 'image_analysis',
                title: '이미지 분석',
                description: '업로드된 짐 사진을 분석하고 있습니다...',
                icon: '📸',
                duration: 30000
            },
            {
                id: 'data_processing',
                title: '데이터 처리',
                description: '분석 결과를 처리하고 있습니다...',
                icon: '⚙️',
                duration: 45000
            },
            {
                id: 'result_generation',
                title: '결과 생성',
                description: '최적의 시트 배치를 생성하고 있습니다...',
                icon: '🧠',
                duration: 30000
            },
            {
                id: 'hardware_code',
                title: '하드웨어 코드 생성',
                description: '16자리 제어 코드를 생성하고 있습니다...',
                icon: '🔧',
                duration: 15000
            }
        ];
        
        this.overallProgressBar = document.getElementById('overallProgressBar');
        this.overallProgressText = document.getElementById('overallProgress');
        this.progressTime = document.getElementById('progressTime');
        this.progressDescription = document.getElementById('progressDescription');
        this.stepsList = document.getElementById('stepsList');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.estimatedTime = document.getElementById('estimatedTime');
        
        this.init();
    }

    init() {
        this.renderSteps();
        this.bindEvents();
        this.setupWebSocket();
        this.startProgress();
    }
    
    bindEvents() {
        this.cancelBtn.addEventListener('click', () => {
            this.cancelProgress();
        });
        
        this.restartBtn.addEventListener('click', () => {
            this.restartProgress();
        });
    }

    setupWebSocket() {
        if (window.wsManager) {
            // WebSocket 이벤트 핸들러 등록
            window.wsManager.on('chain_progress', (data) => {
                this.handleChainProgress(data);
            });
            
            window.wsManager.on('chain_complete', (data) => {
                this.handleChainComplete(data);
            });
            
            window.wsManager.on('chain_error', (data) => {
                this.handleChainError(data);
            });
        }
    }

    handleChainProgress(data) {
        console.log('체인 진행상황 업데이트:', data);
        // WebSocket으로 받은 데이터로 진행상황 업데이트
        if (data.step !== undefined) {
            this.updateStepIndicator(data.step - 1);
            this.updateOverallProgress(data.progress);
        }
    }

    handleChainComplete(data) {
        console.log('체인 완료:', data);
        this.completeProgress();
    }

    handleChainError(data) {
        console.log('체인 오류:', data);
        this.showError('AI 처리 중 오류가 발생했습니다.');
    }
    
    renderSteps() {
        this.stepsList.innerHTML = '';
        
        this.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'step-item';
            stepElement.id = `step-${step.id}`;
            
            stepElement.innerHTML = `
                <div class="step-icon">${step.icon}</div>
                <div class="step-content">
                    <div class="step-title">${step.title}</div>
                    <div class="step-description">${step.description}</div>
                </div>
                <div class="step-status">대기</div>
            `;
            
            this.stepsList.appendChild(stepElement);
        });
    }
    
    startProgress() {
        this.updateTimer();
        this.runNextStep();
        
        // 타이머 업데이트 (1초마다)
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }
    
    runNextStep() {
        if (this.currentStep >= this.steps.length) {
            this.completeProgress();
            return;
        }
        
        const step = this.steps[this.currentStep];
        const stepElement = document.getElementById(`step-${step.id}`);
        
        // 현재 단계 활성화
        stepElement.classList.add('active');
        stepElement.querySelector('.step-status').textContent = '실행중';
        
        this.progressDescription.textContent = step.description;
        
        // 단계별 진행률 계산
        const stepProgress = (this.currentStep / this.steps.length) * 100;
        this.updateOverallProgress(stepProgress);
        
        // 단계 완료 시뮬레이션
        setTimeout(() => {
            this.completeCurrentStep();
        }, step.duration);
    }
    
    completeCurrentStep() {
        const step = this.steps[this.currentStep];
        const stepElement = document.getElementById(`step-${step.id}`);
        
        // 단계 완료 표시
        stepElement.classList.remove('active');
        stepElement.classList.add('completed');
        stepElement.querySelector('.step-status').textContent = '완료';
        
        this.currentStep++;
        
        // 다음 단계로 진행
        setTimeout(() => {
            this.runNextStep();
        }, 500);
    }
    
    completeProgress() {
        // 전체 진행률 100%로 설정
        this.updateOverallProgress(100);
        
        // 타이머 정지
        clearInterval(this.timerInterval);
        
        // 완료 메시지 표시
        this.progressDescription.textContent = '분석이 완료되었습니다!';
        
        // 재시작 버튼 활성화
        this.restartBtn.disabled = false;
        
        // 2초 후 결과 페이지로 이동
        setTimeout(() => {
            window.location.href = '/mobile/result';
        }, 2000);
    }
    
    updateOverallProgress(progress) {
        this.overallProgress = progress;
        this.overallProgressBar.style.width = `${progress}%`;
        this.overallProgressText.textContent = `${Math.round(progress)}%`;
    }
    
    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        this.progressTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 예상 완료 시간 계산
        const remainingSteps = this.steps.length - this.currentStep;
        const estimatedRemaining = remainingSteps * 30; // 평균 30초
        const estimatedMinutes = Math.floor(estimatedRemaining / 60);
        
        if (estimatedMinutes > 0) {
            this.estimatedTime.textContent = `약 ${estimatedMinutes}분 후 완료 예정`;
        } else {
            this.estimatedTime.textContent = `잠시 후 완료 예정`;
        }
    }
    
    cancelProgress() {
        if (confirm('분석을 취소하시겠습니까?')) {
            // Phase 3에서 실제 API 호출로 취소 요청
            clearInterval(this.timerInterval);
            
            // 모든 단계를 대기 상태로 변경
            this.steps.forEach((step) => {
                const stepElement = document.getElementById(`step-${step.id}`);
                stepElement.classList.remove('active', 'completed');
                stepElement.querySelector('.step-status').textContent = '취소됨';
            });
            
            this.progressDescription.textContent = '분석이 취소되었습니다.';
            this.restartBtn.disabled = false;
        }
    }
    
    restartProgress() {
        if (confirm('분석을 다시 시작하시겠습니까?')) {
            // 초기 상태로 리셋
            this.overallProgress = 0;
            this.currentStep = 0;
            this.startTime = Date.now();
            
            // UI 리셋
            this.updateOverallProgress(0);
            this.progressDescription.textContent = '분석을 다시 시작합니다...';
            this.restartBtn.disabled = true;
            
            // 모든 단계를 대기 상태로 변경
            this.steps.forEach((step) => {
                const stepElement = document.getElementById(`step-${step.id}`);
                stepElement.classList.remove('active', 'completed');
                stepElement.querySelector('.step-status').textContent = '대기';
            });
            
            // 진행 재시작
            setTimeout(() => {
                this.startProgress();
            }, 1000);
        }
    }
}

// 전역 변수로 인스턴스 생성
let progressController;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    progressController = new ProgressController();
    
    // WebSocket 매니저 초기화
    new ProgressWebSocketManager();
});

// WebSocket 연동 구현 (Phase 4)
class ProgressWebSocketManager {
    constructor() {
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        if (window.wsManager) {
            // WebSocket 이벤트 핸들러 등록
            window.wsManager.on('chain_progress', (data) => {
                this.handleChainProgress(data);
            });
            
            window.wsManager.on('chain_complete', (data) => {
                this.handleChainComplete(data);
            });
            
            window.wsManager.on('chain_error', (data) => {
                this.handleChainError(data);
            });
        }
    }
    
    handleChainProgress(data) {
        console.log('체인 진행상황:', data);
        if (progressController) {
            progressController.updateStepProgress(data.chain_id, data.progress);
        }
    }
    
    handleChainComplete(data) {
        console.log('체인 완료:', data);
        if (progressController) {
            progressController.completeStep(data.chain_id);
            
            // 모든 체인이 완료되면 결과 페이지로 이동
            if (data.all_chains_completed) {
                setTimeout(() => {
                    window.location.href = '/mobile/result';
                }, 2000);
            }
        }
    }
    
    handleChainError(data) {
        console.error('체인 오류:', data);
        if (progressController) {
            progressController.showError(data.message || '처리 중 오류가 발생했습니다.');
        }
    }
    
    emit(event, data) {
        // Phase 4에서 구현 예정
        console.log('Progress WebSocket 이벤트:', event, data);
    }
    
    // 예상 이벤트들
    handleChainProgress(data) {
        // Phase 4에서 구현 예정
        console.log('체인 진행상황 업데이트:', data);
    }
    
    handleChainComplete(data) {
        // Phase 4에서 구현 예정
        console.log('체인 완료:', data);
    }
    
    handleChainError(data) {
        // Phase 4에서 구현 예정
        console.log('체인 오류:', data);
    }
}

// 전역 WebSocket 매니저 인스턴스
window.progressWsManager = new ProgressWebSocketManager();