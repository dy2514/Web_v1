/**
 * TETRIS Control Dashboard - AI Processing Functions
 * AI 처리 관련 기능
 */

// AI 처리 단계 업데이트
function updateAIProgress(step, progress, status, message) {
    // 단계별 진행률 업데이트
    const stepElements = {
        1: { progress: 'step1Progress', text: 'step1ProgressText', status: 'step1AccordionStatus' },
        2: { progress: 'step2Progress', text: 'step2ProgressText', status: 'step2AccordionStatus' },
        3: { progress: 'step3Progress', text: 'step3ProgressText', status: 'step3AccordionStatus' },
        4: { progress: 'step4Progress', text: 'step4ProgressText', status: 'step4AccordionStatus' }
    };
    
    if (stepElements[step]) {
        const elements = stepElements[step];
        
        // 진행률 바 업데이트
        const progressBar = document.getElementById(elements.progress);
        const progressText = document.getElementById(elements.text);
        const statusElement = document.getElementById(elements.status);
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }
        
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
        
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `accordion-step-status ${status.toLowerCase()}`;
        }
    }
    
    // 전체 진행률 상태 업데이트
    const aiProgressStatus = document.getElementById('aiProgressStatus');
    if (aiProgressStatus) {
        aiProgressStatus.textContent = message || `AI 처리 중... (${step}단계)`;
    }
}

// 단계별 인디케이터 업데이트
function updateStepIndicator(step) {
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        if (indicator) {
            if (i <= step) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }
}

// 아코디언 상태 업데이트
function updateAccordionStatus(step, status) {
    const accordionHeader = document.getElementById(`accordionHeaderStep${step}`);
    const accordionCollapse = document.getElementById(`accordionCollapseStep${step}`);
    
    if (accordionHeader && accordionCollapse) {
        if (status === 'active' || status === 'processing') {
            accordionHeader.setAttribute('aria-expanded', 'true');
            accordionCollapse.classList.add('show');
            accordionCollapse.setAttribute('aria-hidden', 'false');
        }
    }
}

// 전역 함수 노출
window.updateAIProgress = updateAIProgress;
window.updateStepIndicator = updateStepIndicator;
window.updateAccordionStatus = updateAccordionStatus;