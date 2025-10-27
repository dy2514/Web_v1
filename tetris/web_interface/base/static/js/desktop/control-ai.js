/**
 * TETRIS Control Dashboard - AI Processing Functions
 * AI 처리 관련 기능 (Mobile Progress 로직 기반)
 */

// 전역 변수
let currentStep = 0;
let progressValue = 0;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };
let eventSource = null;

// 로그 관련 변수
let logsRefreshInterval = null;

// option 이미지 파일 관련 변수
window.currentOptionNo = 1; // chain2에서 받은 option_no 저장용

// 최신 로그 조회 및 표시
async function loadRecentLogs() {
    try {
        const response = await fetch('/desktop/api/logs/recent');
        const result = await response.json();
        
        if (result.success && result.data.logs) {
            displayRecentLogs(result.data.logs);
        } else {
            showLogsError('로그를 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('로그 로딩 오류:', error);
        showLogsError('로그를 불러오는 중 오류가 발생했습니다.');
    }
}

// 로그 표시
function displayRecentLogs(logs) {
    const logsContent = document.getElementById('logsContent');
    const logsLoading = document.getElementById('logsLoading');
    const logsError = document.getElementById('logsError');
    
    if (!logsContent) return;
    
    // 로딩 및 에러 상태 숨기기
    if (logsLoading) logsLoading.style.display = 'none';
    if (logsError) logsError.style.display = 'none';
    
    // 로그 내용 표시
    logsContent.style.display = 'flex';
    
    if (logs.length === 0) {
        logsContent.innerHTML = `
            <div class="log-item">
                <button class="log-accordion-header" onclick="toggleLogAccordion(this)">
                    <div class="log-header-left">
                        <span class="material-icons log-accordion-icon">expand_more</span>
                        <span class="log-filename">로그 없음</span>
                    </div>
                </button>
                <div class="log-accordion-content active">
                    <div class="log-content-wrapper">
                        <div class="log-content">아직 생성된 로그가 없습니다.</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // 로그 항목들을 아코디언 형태로 생성 (기본적으로 모두 열림)
    const logsHTML = logs.map((log, index) => `
        <div class="log-item">
            <button class="log-accordion-header" onclick="toggleLogAccordion(this)">
                <div class="log-header-left">
                    <span class="material-icons log-accordion-icon" style="transform: rotate(180deg);">expand_more</span>
                    <span class="log-filename">${log.filename}</span>
                </div>
                <div class="log-header-right">
                    <span class="log-timestamp">${log.timestamp}</span>
                </div>
            </button>
            <div class="log-accordion-content" id="logContent_${index}">
                <div class="log-content-wrapper">
                    <div class="log-content">${escapeHtml(log.content)}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    logsContent.innerHTML = logsHTML;
}

// 로그 에러 표시
function showLogsError(message) {
    const logsContent = document.getElementById('logsContent');
    const logsLoading = document.getElementById('logsLoading');
    const logsError = document.getElementById('logsError');
    
    if (logsContent) logsContent.style.display = 'none';
    if (logsLoading) logsLoading.style.display = 'none';
    if (logsError) {
        logsError.style.display = 'flex';
        logsError.querySelector('span:last-child').textContent = message;
    }
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 로그 아코디언 토글 기능 (전역 함수로 등록)
window.toggleLogAccordion = function(button) {
    const logItem = button.closest('.log-item');
    const content = logItem.querySelector('.log-accordion-content');
    const icon = button.querySelector('.log-accordion-icon');
    
    if (content.classList.contains('active')) {
        // 닫기
        content.classList.remove('active');
        button.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        // 열기
        content.classList.add('active');
        button.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}

// 로그 새로고침 버튼 이벤트
function setupLogsRefreshButton() {
    const refreshBtn = document.getElementById('refreshLogsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadRecentLogs();
        });
    }
}

// 로그 자동 새로고침 시작
function startLogsAutoRefresh() {
    // 기존 인터벌 정리
    if (logsRefreshInterval) {
        clearInterval(logsRefreshInterval);
    }
    
    // 30초마다 자동 새로고침
    logsRefreshInterval = setInterval(() => {
        loadRecentLogs();
    }, 30000);
}

// 로그 자동 새로고침 중지
function stopLogsAutoRefresh() {
    if (logsRefreshInterval) {
        clearInterval(logsRefreshInterval);
        logsRefreshInterval = null;
    }
}

// 현재 단계에 맞는 문구 반환
function getCurrentStepMessage(step) {
    if (window.ProgressCore && typeof ProgressCore.getCurrentStepMessage === 'function') {
        const msg = ProgressCore.getCurrentStepMessage(step);
        console.log(`🔍 getCurrentStepMessage(공통) 단계=${step}, 메시지=${msg}`);
        return msg;
    }
    // fallback
    const messages = {
        0: "분석 시작 대기중입니다...",
        1: "사용자 입력 분석 중입니다...",
        2: "최적 배치 생성 중입니다...",
        3: "시트 동작 계획 중입니다...",
        4: "최적 배치 코드 생성 중입니다..."
    };
    return messages[step] || "분석을 시작하고 있습니다...";
}

// AI 처리 단계 업데이트
function updateAIProgress(step, progress, status, message) {
    console.log(`🎯 updateAIProgress 호출: 단계=${step}, 진행률=${progress}%, 상태=${status}`);
    
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
            
            // 분석 중일 때 로딩 애니메이션 활성화
            if (status === 'running' || status === 'active') {
                progressBar.classList.add('loading');
            } else {
                progressBar.classList.remove('loading');
            }
        }
        
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
        
        // 아코디언 상태 표시 개선
        if (statusElement) {
            let statusText = status;
            let statusClass = status.toLowerCase();
            
            // 상태에 따른 한국어 텍스트
            switch(status) {
                case 'running':
                case 'active':
                    statusText = '분석중...';
                    statusClass = 'processing';
                    break;
                case 'completed':
                case 'done':
                    statusText = '완료';
                    statusClass = 'completed';
                    // 완료된 단계도 클릭 가능하도록 disabled 제거
                    const accordionHeader = document.getElementById(`accordionHeaderStep${step}`);
                    const accordionCollapse = document.getElementById(`accordionCollapseStep${step}`);
                    if (accordionHeader) accordionHeader.removeAttribute('disabled');
                    if (accordionCollapse) accordionCollapse.removeAttribute('disabled');
                    break;
                case 'waiting':
                    statusText = '대기중';
                    statusClass = 'waiting';
                    break;
                case 'error':
                    statusText = '오류';
                    statusClass = 'error';
                    break;
            }
            
            statusElement.textContent = statusText;
            statusElement.className = `accordion-step-status ${statusClass}`;
        }
        
        // 아이콘 업데이트 추가
        updateModalStepIcon(step, status);
    }
    
    // 전체 진행률 상태 업데이트
    const currentStepStatus = document.getElementById('currentStepStatus');
    const overallProgressFill = document.getElementById('overallProgressFill');
    const overallProgressPercentage = document.getElementById('overallProgressPercentage');
    
    if (currentStepStatus) {
        // 분석 중일 때는 더 명확한 메시지 표시
        let displayMessage = message;
        if (!displayMessage && step && status === 'running') {
            displayMessage = getCurrentStepMessage(step);
        }
        const finalMessage = displayMessage || getCurrentStepMessage(step);
        console.log(`📝 화면에 표시할 메시지: "${finalMessage}" (단계: ${step}, 상태: ${status})`);
        currentStepStatus.textContent = finalMessage;
        
        // 상태에 따른 스타일 적용
        currentStepStatus.className = 'current-step-status';
        if (status === 'running' || status === 'active') {
            currentStepStatus.classList.add('running');
        } else if (status === 'completed' || status === 'done') {
            currentStepStatus.classList.add('completed');
        } else {
            currentStepStatus.classList.add('waiting');
        }
    }
    
    if (overallProgressFill) {
        if (progress === 25) {
            overallProgressFill.style.width = `${27}%`;
        } else if (progress === 75) {
            overallProgressFill.style.width = `${73}%`;
        } else {
            overallProgressFill.style.width = `${progress}%`;
        }
        
        // 분석 중일 때 로딩 애니메이션 활성화
        if (status === 'running' || status === 'active') {
            overallProgressFill.classList.add('loading');
        } else {
            overallProgressFill.classList.remove('loading');
        }
    }
    
    if (overallProgressPercentage) {
        overallProgressPercentage.textContent = `${progress}%`;
    }
    
    // 현재 단계의 아코디언 자동 열기
    if (step && (status === 'running' || status === 'active')) {
        updateAccordionStatus(step, 'active');
        // 이전 단계들은 '분석 완료'로 표시하고 disabled 제거
        for (let i = 1; i < step; i++) {
            const prevStatusEl = document.getElementById(`step${i}AccordionStatus`);
            if (prevStatusEl) {
                prevStatusEl.textContent = '분석 완료';
                prevStatusEl.className = 'accordion-step-status completed';
            }
            
            // 이전 단계들도 클릭 가능하도록 disabled 제거
            const prevAccordionHeader = document.getElementById(`accordionHeaderStep${i}`);
            const prevAccordionCollapse = document.getElementById(`accordionCollapseStep${i}`);
            if (prevAccordionHeader) prevAccordionHeader.removeAttribute('disabled');
            if (prevAccordionCollapse) prevAccordionCollapse.removeAttribute('disabled');
        }
    }
}

// 새로운 step indicator 아이콘 업데이트 함수
function updateStepIndicatorIcon(stepIndex, status) {
    const stepProgress = document.getElementById(`stepProgress${stepIndex}`);
    if (!stepProgress) return;
    
    const stepCircle = stepProgress.querySelector('.step-circle');
    if (!stepCircle) return;
    
    // 기존 ::after 가상 요소 제거를 위해 클래스 초기화
    stepCircle.className = 'step-circle';
    
    if (status === 'completed') {
        // 완료된 단계: 체크마크 표시
        stepCircle.style.border = '2px solid #10b981';
        stepCircle.style.backgroundColor = '#10b981';
        stepCircle.innerHTML = '<span style="color: white; font-size: 1.6vw; font-weight: bold;">✓</span>';
    } else if (status === 'active') {
        // 활성 단계: 검은색 원 표시
        stepCircle.style.border = '0.3rem solid rgb(66, 76, 92)';
        // stepCircle.style.backgroundColor = '#374151';
        stepCircle.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 1vw; height: 1vw; border-radius: 50%; background-color: rgb(66, 76, 92);"></div>';
    } else {
        // 비활성 단계: 빈 원
        stepCircle.style.border = '2px solid #6b7280';
        stepCircle.style.backgroundColor = '#ffffff';
        stepCircle.innerHTML = '';
    }
}

// 단계별 인디케이터 업데이트 (0-4단계까지)
function updateStepIndicator(step) {
    console.log(`🎯 updateStepIndicator 호출: 단계=${step}`);
    
    // step indicator 컨테이너에 진행 상태 클래스 추가
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        // 기존 진행 상태 클래스 제거
        stepIndicator.classList.remove('completed-0', 'completed-1', 'completed-2', 'completed-3', 'completed-4');
        stepIndicator.classList.remove('active-0', 'active-1', 'active-2', 'active-3', 'active-4');
        
        // 현재 진행 상태에 맞는 클래스 추가
        // step이 현재 진행 중인 단계를 나타냄
        // 0: Step 1 진행 중, 1: Step 2 진행 중, ..., 4: 모든 단계 완료
        if (step === 4) {
            // 모든 단계 완료 - 모든 연결선이 초록색
            stepIndicator.classList.add(`completed-${step}`);
        } else {
            // 현재 단계 진행 중 - 현재 단계까지 어두운 회색 선
            stepIndicator.classList.add(`active-${step}`);
        }
    }
    
    // AI 처리 단계 (0-4단계) 업데이트 - 새로운 step indicator 구조
    for (let i = 0; i <= 4; i++) {
        const stepProgress = document.getElementById(`stepProgress${i}`);
        
        if (stepProgress) {
            stepProgress.classList.remove('active', 'completed', 'inactive');
            
            if (i < step) {
                // 완료된 단계
                stepProgress.classList.add('completed');
                updateStepIndicatorIcon(i, 'completed');
            } else if (i === step) {
                // 현재 진행 중인 단계
                stepProgress.classList.add('active');
                updateStepIndicatorIcon(i, 'active');
            } else {
                // 대기 중인 단계
                stepProgress.classList.add('inactive');
                updateStepIndicatorIcon(i, 'inactive');
            }
        }
    }
    
    // 하드웨어 구동 섹션 업데이트
    updateHardwareSection(step);
    
    // current_step이 6일 때 하드웨어 구동 완료 상태로 변경
    if (step === 6) {
        console.log('🔧 updateStepIndicator에서 current_step 5 감지 - 하드웨어 구동 완료 상태로 변경');
        updateHardwareStatus('completed', '구동 완료');
    }
}

// 하드웨어 구동 섹션 업데이트
function updateHardwareSection(step) {
    const hardwareSection = document.querySelector('.hardware-operation-section');
    const hardwareStatus = document.getElementById('hardwareStatus');
    
    if (!hardwareSection || !hardwareStatus) return;
    
    // 기존 상태 클래스 제거
    hardwareSection.classList.remove('waiting', 'processing', 'completed', 'error');
    
    if (step <= 4) {
        // AI 처리 단계 (1-4단계) 중일 때는 대기중
        hardwareSection.classList.add('waiting');
        hardwareStatus.textContent = '대기중';
    } else if (step > 5) {
        // 6단계일 때는 하드웨어 구동 완료
        hardwareSection.classList.add('completed');
        hardwareStatus.textContent = '구동 완료';
    }
    
    console.log(`🔧 하드웨어 섹션 업데이트: 단계=${step}, 상태=${hardwareStatus.textContent}`);
}

// 하드웨어 상태 직접 업데이트 (외부에서 호출 가능)
function updateHardwareStatus(status, message) {
    const hardwareSection = document.querySelector('.hardware-operation-section');
    const hardwareStatus = document.getElementById('hardwareStatus');
    
    console.log(`🔧 updateHardwareStatus 호출: status=${status}, message=${message}`);
    console.log(`🔧 hardwareSection 존재: ${!!hardwareSection}`);
    console.log(`🔧 hardwareStatus 존재: ${!!hardwareStatus}`);
    
    if (!hardwareSection || !hardwareStatus) {
        console.error('🔧 하드웨어 섹션 또는 상태 요소를 찾을 수 없습니다');
        return;
    }
    
    // 기존 상태 클래스 제거
    hardwareSection.classList.remove('waiting', 'processing', 'completed', 'error');
    
    switch(status) {
        case 'waiting':
        case 'idle':
            hardwareSection.classList.add('waiting');
            hardwareStatus.textContent = '대기중';
            break;
        case 'running':
        case 'processing':
        case 'active':
            hardwareSection.classList.add('processing');
            hardwareStatus.textContent = message || '구동중';
            break;
        case 'completed':
        case 'done':
        case 'finished':
            hardwareSection.classList.add('completed');
            hardwareStatus.textContent = message || '완료';
            break;
        case 'error':
        case 'failed':
            hardwareSection.classList.add('error');
            hardwareStatus.textContent = message || '오류';
            break;
        default:
            hardwareSection.classList.add('waiting');
            hardwareStatus.textContent = '대기중';
    }
    
    console.log(`🔧 하드웨어 상태 직접 업데이트: 상태=${status}, 메시지=${message}`);
    console.log(`🔧 하드웨어 섹션 클래스: ${hardwareSection.className}`);
    console.log(`🔧 하드웨어 상태 텍스트: ${hardwareStatus.textContent}`);
}

// 아코디언 상태 업데이트
function updateAccordionStatus(step, status) {
    const accordionHeader = document.getElementById(`accordionHeaderStep${step}`);
    const accordionCollapse = document.getElementById(`accordionCollapseStep${step}`);
    
    if (accordionHeader && accordionCollapse) {
        if (status === 'active' || status === 'running') {
            // disabled 속성 제거 (아코디언이 열릴 수 있도록)
            accordionHeader.removeAttribute('disabled');
            accordionCollapse.removeAttribute('disabled');
            
            accordionHeader.setAttribute('aria-expanded', 'true');
            accordionCollapse.classList.add('show');
            accordionCollapse.setAttribute('aria-hidden', 'false');
        }
    }
    
    // 아이콘도 함께 업데이트
    updateModalStepIcon(step, status);
}

// 1단계 이후(2, 3, 4단계) 세부 현황을 '대기중'으로 초기화
function resetStepsAfter2ToWaiting() {
    for (let i = 2; i <= 4; i++) {
        const statusEl = document.getElementById(`step${i}AccordionStatus`);
        if (statusEl) {
            statusEl.textContent = '대기중';
            statusEl.className = 'accordion-step-status waiting';
        }

        const progressBar = document.getElementById(`step${i}Progress`);
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
            progressBar.classList.remove('loading');
        }

        const progressText = document.getElementById(`step${i}ProgressText`);
        if (progressText) {
            progressText.textContent = '0%';
        }

        const detailInfo = document.getElementById(`step${i}DetailInfo`);
        if (detailInfo) {
            detailInfo.innerHTML = '';
            detailInfo.classList.remove('has-result');
        }

        // 상단 진행 카드(원형 아이콘/텍스트)도 대기 상태로 동기화 (1-3단계만)
        if (i <= 3) {
            const stepProgress = document.getElementById(`stepProgress${i}`);
            if (stepProgress) {
                stepProgress.classList.remove('active', 'completed');
            }
            const stepIcon = document.getElementById(`stepIcon${i}`);
            if (stepIcon) {
                stepIcon.innerHTML = `<span class="step-number">${i}</span>`;
            }
            const stepStatus = document.getElementById(`stepStatus${i}`);
            if (stepStatus) {
                stepStatus.textContent = '대기중';
            }
        }

        // 좌측 상태 아이콘도 공통 함수로 동기화
        if (typeof updateStepIcon === 'function') {
            updateStepIcon(i);
        } else if (window.ProgressCore && typeof ProgressCore.updateStepIcon === 'function') {
            // fallback: ProgressCore 직접 호출
            ProgressCore.updateStepIcon(currentStep, i);
        }
    }
}

// 모든 단계를 초기 상태로 리셋 (새로운 분석 시작 시)
function resetAllSteps() {
    console.log('🔄 모든 단계 초기화 시작');
    
    // shownSteps 플래그 리셋
    shownSteps = { 1: false, 2: false, 3: false, 4: false };
    
    // step indicator 컨테이너 초기화
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.classList.remove('completed-0', 'completed-1', 'completed-2', 'completed-3', 'completed-4');
        stepIndicator.classList.remove('active-0', 'active-1', 'active-2', 'active-3', 'active-4');
        stepIndicator.classList.add('active-0');
    }
    
    // 새로운 step indicator 구조로 모든 단계 초기화
    for (let i = 0; i <= 4; i++) {
        const stepProgress = document.getElementById(`stepProgress${i}`);
        if (stepProgress) {
            stepProgress.classList.remove('active', 'completed', 'inactive');
            stepProgress.classList.add('inactive');
            updateStepIndicatorIcon(i, 'inactive');
        }
    }
    
    // 모든 단계를 대기중으로 초기화 (1-4단계)
    for (let i = 1; i <= 4; i++) {
        const statusEl = document.getElementById(`step${i}AccordionStatus`);
        if (statusEl) {
            statusEl.textContent = '대기중';
            statusEl.className = 'accordion-step-status waiting';
        }

        const progressBar = document.getElementById(`step${i}Progress`);
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
            progressBar.classList.remove('loading');
        }

        const progressText = document.getElementById(`step${i}ProgressText`);
        if (progressText) {
            progressText.textContent = '0%';
        }

        const detailInfo = document.getElementById(`step${i}DetailInfo`);
        if (detailInfo) {
            detailInfo.innerHTML = '';
            detailInfo.classList.remove('has-result');
        }

        // 상단 진행 카드는 이미 위에서 초기화됨

        // 아코디언 닫기
        const accordionCollapse = document.getElementById(`accordionCollapseStep${i}`);
        if (accordionCollapse) {
            accordionCollapse.classList.remove('show');
        }
        
        const accordionHeader = document.getElementById(`accordionHeaderStep${i}`);
        if (accordionHeader) {
            accordionHeader.setAttribute('aria-expanded', 'false');
        }
    }
    
    // 전체 진행률 초기화
    const overallProgressFill = document.getElementById('overallProgressFill');
    const overallProgressPercentage = document.getElementById('overallProgressPercentage');
    const currentStepStatus = document.getElementById('currentStepStatus');
    
    if (overallProgressFill) {
        overallProgressFill.style.width = '0%';
        overallProgressFill.classList.remove('loading');
    }
    if (overallProgressPercentage) {
        overallProgressPercentage.textContent = '0%';
    }
    if (currentStepStatus) {
        currentStepStatus.textContent = '분석 시작 대기중입니다...';
        currentStepStatus.className = 'current-step-status waiting';
    }
    
    console.log('🔄 모든 단계 초기화 완료');
}

// 하드웨어 이벤트 처리 함수
function handleHardwareEvent(payload) {
    console.log('🔧 하드웨어 이벤트 수신:', payload);
    
    switch(payload.event) {
        case 'hardware_start':
            updateHardwareStatus('processing', payload.message || '하드웨어 구동 시작');
            console.log('🔧 하드웨어 구동 시작');
            break;
            
        case 'hardware_progress':
            const progress = payload.progress || 50;
            updateHardwareStatus('processing', payload.message || `하드웨어 구동 중 (${progress}%)`);
            console.log(`🔧 하드웨어 구동 진행률: ${progress}%`);
            break;
            
        case 'hardware_complete':
            updateHardwareStatus('completed', payload.message || '하드웨어 구동 완료');
            console.log('🔧 하드웨어 구동 완료');
            break;
            
        case 'hardware_error':
            updateHardwareStatus('error', payload.message || '하드웨어 구동 오류');
            console.error('🔧 하드웨어 구동 오류:', payload.message);
            break;
            
        default:
            console.log('🔧 알 수 없는 하드웨어 이벤트:', payload.event);
    }
}

// SSE 상태 수신 핸들러 (Mobile Progress 로직 기반)
async function handleAIStatusData(statusData) {
    try {
        if (statusData) {
            console.log('📊 AI 상태 데이터 수신:', statusData);
            
            // 전체 statusData 로그 출력
            console.log('📊 전체 statusData:', statusData);
            console.log('🔍 statusData.current_step:', statusData.current_step);
            console.log('🔍 statusData.processing:', statusData.processing);
            console.log('🔍 statusData.progress:', statusData.progress);
            console.log('🔍 statusData.status:', statusData.status);
            
            // 서버에서 받은 단계 정보 확인
            let serverStep = statusData.current_step || statusData.processing?.current_step;
            console.log('✅ 서버 단계 정보:', serverStep);
            
            // current_step이 undefined인지 확인
            if (statusData.current_step === undefined) {
                console.warn('⚠️ current_step이 undefined입니다!');
            } else {
                console.log('✅ current_step 값:', statusData.current_step, '타입:', typeof statusData.current_step);
            }
            
            // 진행률 업데이트 (단계별 고정값 사용 - mobile/progress와 동일)
            if (serverStep == null || serverStep == undefined) {
                serverStep = 0;
            }

            // 분석 진행중인 경우에만 분석 step이 움직이도록
            const processingStatus = statusData.processing?.status || statusData.status;
            if (processingStatus === 'running' || processingStatus === 'processing' || processingStatus === 'completed') {
                serverStep++;
            }
            
            console.log('📊 serverStep:', serverStep);
            let progress;
            switch(serverStep) {
                case 1:
                    progress = 25;
                    break;
                case 2:
                    progress = 50;
                    break;
                case 3:
                    progress = 75;
                    break;
                case 4:
                    progress = 100;
                    break;
                default:    
                    progress = 0;
            }
            console.log('📊 단계별 고정 진행률 업데이트:', progress + '%', '단계:', serverStep);
            
            // 새로운 분석이 시작되었는지 확인 (serverStep이 0 또는 1이고, 이전 데이터가 있었다면)
            if (serverStep === 0 || (serverStep === 1 && currentStep > 1)) {
                console.log('🔄 새로운 분석 시작 감지 - 모든 단계 초기화');
                resetAllSteps();
            }
            
            // 단계 업데이트 (후퇴 방지)
            if (serverStep < currentStep && serverStep !== 1 && serverStep !== 0) {
                console.log('⏭️ 단계 후퇴 감지, 무시합니다. (현재:', currentStep, '수신:', serverStep, ')');
                return;
            }
            
            if (serverStep !== currentStep) {
                console.log(`✅ 단계 변경: ${currentStep} -> ${serverStep}단계로 업데이트`);
                currentStep = serverStep;
                updateStepIndicator(currentStep);
                // 요구사항: 현재 단계가 0 또는 1단계(매핑상 1 또는 2)이면 1단계 이후(2,3,4단계)를 대기중으로 초기화
                if (currentStep <= 1) {
                    resetStepsAfter2ToWaiting();
                }
            }
            
            // 분석 중 상태를 명확하게 표시
            const message = getCurrentStepMessage(currentStep);
            updateAIProgress(currentStep, progress, 'running', message);
            console.log('📝 분석 중 메시지 표시:', message);
            console.log('📝 현재 단계:', currentStep, '메시지:', message);
            
            // 현재 단계의 아코디언 자동 열기
            if (currentStep !== 0) {
                updateAccordionStatus(currentStep, 'active');
            }
            
            // 단계별 결과 처리
            await handleStepResults(statusData);
            
            // 완료 처리 (4단계까지 완료되면 AI 처리 완료)
            if (currentStep >= 4) {
                console.log('✅ AI 처리 완료 (최적 배치 코드 생성 완료)');
                updateAIProgress(currentStep, 100, 'completed', '최적 배치 코드 생성이 완료되었습니다!');
                
                // 4단계 완료 시 모든 단계 완료 표시
                for (let i = 1; i <= 4; i++) {
                    const statusEl = document.getElementById(`step${i}AccordionStatus`);
                    if (statusEl && statusEl.textContent !== '완료') {
                        statusEl.textContent = '완료';
                        statusEl.className = 'accordion-step-status completed';
                    }
                }
                // current_step이 5일 때 하드웨어 구동 완료 상태로 변경
                if (currentStep === 6) {
                    updateHardwareStatus('completed', '구동 완료');
                }
            }
        }
    } catch (error) {
        console.error('AI 상태 처리 오류:', error);
    }
}

// 단계별 결과 처리 (mobile/progress와 동일한 로직)
async function handleStepResults(statusData) {
    try {
        const ar = statusData.analysis_result || {};
        console.log(`🔍 statusData: ${statusData}`);
        console.log(statusData);

        // 원본 결과 표시
        if (ar.chain1_out && !shownSteps[1]) {
            await displayStepResult(1, ar.chain1_out);
            shownSteps[1] = true;
        }
        if (ar.chain2_out && !shownSteps[2]) {
            await displayStepResult(2, ar.chain2_out);
            shownSteps[2] = true;
        }
        if (ar.chain3_out && !shownSteps[3]) {
            // 3단계 결과만 표시 (placement_code 제외)
            await displayStepResult(3, ar.chain3_out);
            shownSteps[3] = true;
        }
        if (ar.serial_encoder_out && !shownSteps[4]) {
            // 4단계: 최적 배치 코드 생성 결과 표시
            await displayStepResult(4, ar.serial_encoder_out);
            shownSteps[4] = true;
        }

        // 루트에 실린 경우도 대응
        if (statusData.chain1_out && !shownSteps[1]) {
            await displayStepResult(1, statusData.chain1_out);
            shownSteps[1] = true;
        }
        if (statusData.chain2_out && !shownSteps[2]) {
            await displayStepResult(2, statusData.chain2_out);
            shownSteps[2] = true;
        }
        if (statusData.chain3_out && !shownSteps[3]) {
            // 3단계 결과만 표시 (placement_code 제외)
            await displayStepResult(3, statusData.chain3_out);
            shownSteps[3] = true;
        }
        if (statusData.serial_encoder_out && !shownSteps[4]) {
            // 4단계: 최적 배치 코드 생성 결과 표시
            await displayStepResult(4, statusData.serial_encoder_out);
            shownSteps[4] = true;
        }

    } catch (e) {
        console.warn('단계별 결과 처리 중 오류:', e);
    }
}

// 단계별 결과 표시 (mobile/progress와 동일한 로직)
async function displayStepResult(stepNumber, resultData) {
    console.log(`🎯 displayStepResult 호출: 단계 ${stepNumber}, 데이터:`, resultData);
    
    const detailInfo = document.getElementById(`step${stepNumber}DetailInfo`);
    if (detailInfo) {
        // 이전 데이터 클리어
        detailInfo.innerHTML = '';
        
        // 결과 데이터 포맷팅
        const formattedResult = await formatStepResult(stepNumber, resultData);
        console.log(`🎯 포맷된 결과:`, formattedResult);

        detailInfo.innerHTML = formattedResult;
        
        // 결과 표시 하이라이트 클래스 추가
        detailInfo.classList.add('has-result');
        
        // 아코디언 자동 열기
        updateAccordionStatus(stepNumber, 'active');
        
        // 아이콘 상태 업데이트
        updateStepIcon(stepNumber);
        
        console.log(`단계 ${stepNumber} 결과 표시 완료`);
    }
}

// 단계별 아이콘 상태 업데이트 (mobile/progress와 동일한 로직)
function updateStepIcon(stepNumber) {
    console.log(`🎯 updateStepIcon 호출: 단계 ${stepNumber}`);
    console.log(`🔍 currentStep: ${currentStep}`);
    if (window.ProgressCore && typeof ProgressCore.updateStepIcon === 'function') {
        console.log(`🎯 ProgressCore.updateStepIcon 호출: 단계 ${stepNumber}`);
        console.log(`🔍 currentStep: ${currentStep}`);
        ProgressCore.updateStepIcon(currentStep, stepNumber);
        return;
    }
    // fallback: 직접 아이콘 업데이트
    console.log(`🎯 fallback 아이콘 업데이트: 단계 ${stepNumber}`);
    const iconElement = document.getElementById(`step${stepNumber}-icon`);
    if (!iconElement) {
        console.warn(`아이콘 요소를 찾을 수 없습니다: step${stepNumber}-icon`);
        return;
    }
    iconElement.classList.remove('info', 'warning', 'success', 'error');

    // 4단계가 완료되었는지 또는 현재 단계보다 이전 단계인지 확인
    const isCompleted = currentStep > stepNumber || (currentStep === 4 && stepNumber <= 4);
    
    if (isCompleted) {
        iconElement.classList.add('success');
        iconElement.innerHTML = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#228738"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
</svg>`;
    } else if (currentStep === stepNumber || (currentStep === 0 && stepNumber === 1)) {
        iconElement.classList.add('warning');
        iconElement.innerHTML = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8.5" stroke="#D9D9D9" stroke-width="2" fill="none"></circle>
                <circle cx="10" cy="10" r="8.5" stroke="#3B82F6" stroke-width="2" fill="none" stroke-dasharray="28.57" stroke-dashoffset="9.42" stroke-linecap="round"></circle>
            </svg>`;
    } else {
        iconElement.classList.add('info');
        iconElement.innerHTML = `
<svg width="18" height="20" viewBox="0 0 18 20" fill="#000000" xmlns="http://www.w3.org/2000/svg">
    <path fill="#000000" clip-rule="evenodd" d="M3.44141 6.52374C4.50762 6.86303 5.28 7.86127 5.28 9.0399C5.28 10.2185 4.50762 11.2168 3.44141 11.5561L3.44141 19.2002C3.44141 19.642 3.08323 20.0002 2.64141 20.0002C2.19958 20.0002 1.84141 19.642 1.84141 19.2002L1.84141 11.557C0.773737 11.2185 0 10.2196 0 9.0399C0 7.86023 0.773737 6.86128 1.84141 6.52284L1.84141 0.8C1.84141 0.358172 2.19958 0 2.64141 0C3.08323 0 3.44141 0.358172 3.44141 0.8V6.52374ZM2.64 10.0799C2.06562 10.0799 1.6 9.61428 1.6 9.0399C1.6 8.46553 2.06562 7.9999 2.64 7.9999C3.21438 7.9999 3.68 8.46553 3.68 9.0399C3.68 9.61428 3.21438 10.0799 2.64 10.0799Z" fill="#33363D"/>
    <path fill="#000000" clip-rule="evenodd" d="M7.8414 19.2002L7.84141 15.1571C6.77374 14.8186 6 13.8197 6 12.64C6 11.4603 6.77374 10.4614 7.84141 10.1229V0.8C7.84141 0.358172 8.19958 0 8.64141 0C9.08323 0 9.44141 0.358172 9.44141 0.8L9.44141 10.1238C10.5076 10.4631 11.28 11.4614 11.28 12.64C11.28 13.8186 10.5076 14.8169 9.44141 15.1562V19.2002C9.44141 19.642 9.08323 20.0002 8.64141 20.0002C8.19958 20.0002 7.8414 19.642 7.8414 19.2002ZM7.6 12.64C7.6 13.2144 8.06562 13.68 8.64 13.68C9.21438 13.68 9.68 13.2144 9.68 12.64C9.68 12.0656 9.21438 11.6 8.64 11.6C8.06562 11.6 7.6 12.0656 7.6 12.64Z" fill="#33363D"/>
    <path fill="#000000" clip-rule="evenodd" d="M13.8414 4.12294V0.8C13.8414 0.358172 14.1996 0 14.6414 0C15.0832 0 15.4414 0.358172 15.4414 0.8V4.12383C16.5076 4.46313 17.28 5.46137 17.28 6.64C17.28 7.81863 16.5076 8.81687 15.4414 9.15617L15.4414 19.2002C15.4414 19.642 15.0832 20.0002 14.6414 20.0002C14.1996 20.0002 13.8414 19.642 13.8414 19.2002V9.15706C12.7737 8.81862 12 7.81967 12 6.64C12 5.46033 12.7737 4.46138 13.8414 4.12294ZM14.64 7.68C14.0656 7.68 13.6 7.21438 13.6 6.64C13.6 6.06562 14.0656 5.6 14.64 5.6C15.2144 5.6 15.68 6.06562 15.68 6.64C15.68 7.21438 15.2144 7.68 14.64 7.68Z" fill="#33363D"/>
</svg>`;
    }
}

// 모달의 단계별 아이콘 업데이트 함수
function updateModalStepIcon(step, status) {
    const iconElement = document.getElementById(`step${step}-icon`);
    if (!iconElement) return;
    
    // 기존 클래스 제거
    iconElement.classList.remove('info', 'warning', 'success', 'error');
    
    // SVG 아이콘 생성
    let iconHTML = '';
    
    if (status === 'running' || status === 'active' || status === 'processing') {
        // 분석 중 - 로딩 스피너 아이콘
        iconElement.classList.add('warning');
        iconHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8.5" stroke="#D9D9D9" stroke-width="2" fill="none"/>
                <circle cx="10" cy="10" r="8.5" stroke="#3B82F6" stroke-width="2" fill="none" 
                        stroke-dasharray="28.57" stroke-dashoffset="9.42" stroke-linecap="round">
                    <animate attributeName="stroke-dashoffset" values="0;28.57;0" dur="1.5s" repeatCount="indefinite"/>
                </circle>
            </svg>
        `;
    } else if (status === 'completed' || status === 'done') {
        // 완료 - 성공 아이콘 (초록색 체크)
        iconElement.classList.add('success');
        iconHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#228738"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
            </svg>
        `;
    } else {
        // 대기 중 - 참고 정보 아이콘 (파란색 i)
        iconElement.classList.add('info');
        iconHTML = `
            <svg width="18" height="20" viewBox="0 0 18 20" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                <path fill="#000000" clip-rule="evenodd" d="M3.44141 6.52374C4.50762 6.86303 5.28 7.86127 5.28 9.0399C5.28 10.2185 4.50762 11.2168 3.44141 11.5561L3.44141 19.2002C3.44141 19.642 3.08323 20.0002 2.64141 20.0002C2.19958 20.0002 1.84141 19.642 1.84141 19.2002L1.84141 11.557C0.773737 11.2185 0 10.2196 0 9.0399C0 7.86023 0.773737 6.86128 1.84141 6.52284L1.84141 0.8C1.84141 0.358172 2.19958 0 2.64141 0C3.08323 0 3.44141 0.358172 3.44141 0.8V6.52374ZM2.64 10.0799C2.06562 10.0799 1.6 9.61428 1.6 9.0399C1.6 8.46553 2.06562 7.9999 2.64 7.9999C3.21438 7.9999 3.68 8.46553 3.68 9.0399C3.68 9.61428 3.21438 10.0799 2.64 10.0799Z" fill="#33363D"/>
                <path fill="#000000" clip-rule="evenodd" d="M7.8414 19.2002L7.84141 15.1571C6.77374 14.8186 6 13.8197 6 12.64C6 11.4603 6.77374 10.4614 7.84141 10.1229V0.8C7.84141 0.358172 8.19958 0 8.64141 0C9.08323 0 9.44141 0.358172 9.44141 0.8L9.44141 10.1238C10.5076 10.4631 11.28 11.4614 11.28 12.64C11.28 13.8186 10.5076 14.8169 9.44141 15.1562V19.2002C9.44141 19.642 9.08323 20.0002 8.64141 20.0002C8.19958 20.0002 7.8414 19.642 7.8414 19.2002ZM7.6 12.64C7.6 13.2144 8.06562 13.68 8.64 13.68C9.21438 13.68 9.68 13.2144 9.68 12.64C9.68 12.0656 9.21438 11.6 8.64 11.6C8.06562 11.6 7.6 12.0656 7.6 12.64Z" fill="#33363D"/>
                <path fill="#000000" clip-rule="evenodd" d="M13.8414 4.12294V0.8C13.8414 0.358172 14.1996 0 14.6414 0C15.0832 0 15.4414 0.358172 15.4414 0.8V4.12383C16.5076 4.46313 17.28 5.46137 17.28 6.64C17.28 7.81863 16.5076 8.81687 15.4414 9.15617L15.4414 19.2002C15.4414 19.642 15.0832 20.0002 14.6414 20.0002C14.1996 20.0002 13.8414 19.642 13.8414 19.2002V9.15706C12.7737 8.81862 12 7.81967 12 6.64C12 5.46033 12.7737 4.46138 13.8414 4.12294ZM14.64 7.68C14.0656 7.68 13.6 7.21438 13.6 6.64C13.6 6.06562 14.0656 5.6 14.64 5.6C15.2144 5.6 15.68 6.06562 15.68 6.64C15.68 7.21438 15.2144 7.68 14.64 7.68Z" fill="#33363D"/>
            </svg>
        `;
    }
    
    iconElement.innerHTML = iconHTML;
    console.log(`🎨 Step ${step} 아이콘 업데이트: ${status}`);
}

// 안전한 JSON 파싱은 ProgressCore 사용
function safeJsonParse(data) {
    if (window.ProgressCore && typeof ProgressCore.safeJsonParse === 'function') {
        return ProgressCore.safeJsonParse(data);
    }
    // fallback
    if (data && typeof data === 'object') return data;
    if (typeof data !== 'string') return null;
    let s = data.trim();
    if (s.startsWith('```')) {
        s = s.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    }
    if (!(s.startsWith('{') || s.startsWith('['))) return null;
    try { return JSON.parse(s); } catch { return null; }
}

// 결과 포맷팅 함수
async function formatStepResult(stepNumber, resultData) {
    try {
        let formattedResult = '';
        
        switch (stepNumber) {
            case 1: {
                const chain1Data = (function () {
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();

                // state.json에서 직접 image_data_url 가져오기
                let imageSrc = '';
                try {
                    const response = await fetch('/desktop/api/status');
                    const statusData = await response.json();
                    if (statusData.success && statusData.data) {
                        imageSrc = statusData.data.upload?.image_data_url || statusData.data.image_data_url || '';
                    }
                } catch (error) {
                    console.warn('이미지 데이터 URL을 가져올 수 없습니다:', error);
                }

                let luggageTableRows = '';
                const objectCounts = {};
                if (chain1Data && chain1Data.luggage_details) {
                    for (let key in chain1Data.luggage_details) {
                        const obj = chain1Data.luggage_details[key]?.object;
                        if (!obj) continue;
                        objectCounts[obj] = (objectCounts[obj] || 0) + 1;
                    }
                }
                for (let object in objectCounts) {
                    luggageTableRows += `<li>${object} (${objectCounts[object]}개)</li>`;
                }

                // state.json에서 직접 image_path 가져오기
                let imagePath = '';
                try {
                    const response = await fetch('/desktop/api/status');
                    const statusData = await response.json();
                    if (statusData.success && statusData.data) {
                        imagePath = statusData.data.upload?.image_path || 
                                    statusData.data.image_path;
                    }
                } catch (error) {
                    console.warn('이미지 데이터 URL을 가져올 수 없습니다:', error);
                }

                formattedResult = `
                <div class="analysis-result-wrapper">
                    <div class="analysis-result-container">
                        <div class="analysis-result-content">
                            <div class="image-container"><img src="${imagePath}" alt="짐 상세 정보" class="analysis-image"></div>
                            ${imageSrc ? `<div class="image-container"><img src="${imageSrc}" alt="짐 상세 정보" class="analysis-image"></div>` : ''}
                            <p>👥 인원 수: ${chain1Data.people || 0}명</p>
                            <p>🧳 총 짐 개수: ${chain1Data.total_luggage_count || 0}개</p>
                            ${luggageTableRows ? `<p>📋 짐 상세 정보</p>
                            <ul class="luggage-detail-list">${luggageTableRows}</ul>` : ''}
                        </div>
                    </div>
                    <div class="analysis-result-json-container">
                        <h4 class="json-container-title">JSON 데이터</h4>
                        <pre>${JSON.stringify(chain1Data, null, 2)}</pre>
                    </div>
                </div>`;
                break;
            }

            case 2: {
                const chain2Data = (function () {
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();
                const optNo = chain2Data.option_no ? chain2Data.option_no : 1;
                
                // 전역 변수에 option_no 저장 (3단계에서 사용)
                window.currentOptionNo = optNo;
                
                formattedResult = `
                <div class="analysis-result-wrapper">
                    <div class="analysis-result-container">
                        <p style="margin-bottom: 1vh;">최적 배치 생성 결과</p>
                        <div class="image-container">
                            <img src="/static/images/optimum_arrangement_options/${optNo}.png" alt="최적 배치 생성" class="analysis-image">
                        </div>
                    </div>
                    <div class="analysis-result-json-container">
                        <h4 class="json-container-title">JSON 데이터</h4>
                        <pre>${JSON.stringify(chain2Data, null, 2)}</pre>
                    </div>
                </div>`;
                break;
            }

            case 3: {
                const cleanData = (typeof resultData === 'string') ? resultData.replace(/```json\s*|```/g, '') : resultData;
                const chain3Data = (function () {
                    const parsed = safeJsonParse(cleanData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();

                // chain2에서 받은 option_no 사용 (전역 변수에서 가져오기)
                const optionNo = window.currentOptionNo || 1;

                formattedResult = `
                <div class="analysis-result-wrapper">
                    <div class="analysis-result-container">
                        <p style="margin-bottom: 1vh;">시트 동작 계획 결과</p>
                        <div class="image-container">
                            <img src="/static/images/operation_plan_options/${optionNo}.jpg" alt="시트 동작 계획" class="analysis-image">
                        </div>
                    </div>
                    <div class="analysis-result-json-container">
                        <h4 class="json-container-title">JSON 데이터</h4>
                        <pre>${JSON.stringify(chain3Data, null, 2)}</pre>
                    </div>
                </div>`;
                break;
            }

            case 4: {
                // 4단계: 최적 배치 코드 생성
                const placementCode = (typeof resultData === 'string') ? resultData : '';
                
                // chain2에서 받은 option_no 사용 (전역 변수에서 가져오기)
                const optionNo = window.currentOptionNo || 1;
                
                formattedResult = `
                <div class="analysis-result-wrapper">
                    <div class="analysis-result-container" style="flex: 1; padding: 0; background-image: none;">
                        <p style="font-size: 1.3vw; text-align: center; margin: 1vh;">하드웨어 제어 코드</p>
                        <div class="placement-code-display" style="background: #f5f5f5; padding: 1vh; border-radius: 8px; margin: 0 20vw 1vh;">
                            <h3 style="font-size: 1.3vw; font-weight: bold; text-align: center; font-family: monospace; letter-spacing: 4px;">${placementCode}</h3>
                        </div>
                        <div class="image-container">
                            <img style="height: 46vh; max-width: 46vw;" src="/static/images/optimum_arrangement_options/${optionNo}.png" alt="최적 배치 코드" class="analysis-image">
                        </div>
                        <p style="color: #666; font-size: 1vw; text-align: center; margin: 2rem 6rem;">16자리 코드는 각 좌석의 최적 배치 상태를 나타냅니다.</p>
                    </div>
                </div>`;
                break;
            }

            default: {
                formattedResult = `<div class="analysis-result-container"><pre>${typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2)}</pre></div>`;
            }
        }

        return formattedResult;
    } catch (error) {
        console.error(`formatStepResult 오류(step ${stepNumber}):`, error);
        return `<div class="analysis-result-container"><p>데이터 포맷팅 오류: ${error.message}</p></div>`;
    }
}

// SSE 연결 시작 (mobile/progress와 동일한 API 사용)
function startAIStatusStream() {
    try {
        if (eventSource) {
            eventSource.close();
        }
        
        // 데스크탑용 SSE 엔드포인트 사용
        const statusStreamUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.STATUS_STREAM || '/desktop/api/status_stream';
        eventSource = new EventSource(statusStreamUrl);
        eventSource.onmessage = async (e) => {
            try {
                const payload = JSON.parse(e.data);
                console.log('📡 AI SSE 메시지 수신:', payload);
                console.log('📡 AI SSE 메시지 타입:', typeof payload, 'keys:', Object.keys(payload));
                
                // 연결 이벤트는 건너뜀
                if (payload && payload.event === 'connected') {
                    console.log('✅ AI SSE 연결 확인');
                    return;
                }
                
                // 하드웨어 제어 이벤트 처리
                if (payload.event && payload.event.startsWith('hardware_')) {
                    handleHardwareEvent(payload);
                    return;
                }
                
                // AI 상태 최적 배치 생성
                console.log('🎯 handleAIStatusData 호출 시작');
                await handleAIStatusData(payload);
                console.log('🎯 handleAIStatusData 호출 완료');
                
            } catch (err) {
                console.error('AI SSE 메시지 처리 오류:', err, '데이터:', e.data);
            }
        };
        
        eventSource.onerror = (e) => {
            console.warn('SSE 오류 또는 종료:', e);
            console.error('SSE 연결 오류:', e);
            
            // 연결 상태 확인
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log('SSE 연결이 종료되었습니다. 재연결을 시도합니다...');
                setTimeout(() => {
                    startAIStatusStream();
                }, 3000);
            } else if (eventSource.readyState === EventSource.CONNECTING) {
                console.log('SSE 연결 중...');
            }
            
            try { eventSource.close(); } catch (_) {}
        };
        
        console.log('✅ AI 상태 스트림 시작 (mobile/progress와 동일한 API 사용)');
        
        // SSE 연결 후 현재 상태 확인 및 하드웨어 섹션 업데이트
        setTimeout(() => {
            checkCurrentStatusAndUpdateHardware();
        }, 1000);
        
        // 추가로 3초 후에도 한 번 더 확인 (SSE 연결 지연 대비)
        setTimeout(() => {
            forceUpdateHardwareStatus();
        }, 3000);
    } catch (e) {
        console.error('SSE 연결 실패:', e);
    }
}

// 현재 상태 확인 및 하드웨어 섹션 업데이트
async function checkCurrentStatusAndUpdateHardware() {
    try {
        const response = await fetch('/desktop/api/status');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('응답이 JSON 형식이 아닙니다');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const currentStepValue = result.data.current_step;
            const analysisResult = result.data.analysis_result;
            console.log(`🔧 현재 상태 확인: current_step = ${currentStepValue}`);
            console.log(`🔧 분석 결과 확인:`, analysisResult);
            
            // 완료된 단계들 확인 및 상태 업데이트
            updateCompletedStepsStatus(analysisResult, currentStepValue);
            
            // 완료된 단계들의 결과를 다시 표시
            if (analysisResult) {
                console.log('🔄 state.json에서 완료된 단계 결과를 다시 표시');
                
                // 1단계 결과 표시
                if (analysisResult.chain1_out && !shownSteps[1]) {
                    await displayStepResult(1, analysisResult.chain1_out);
                    shownSteps[1] = true;
                }
                
                // 2단계 결과 표시
                if (analysisResult.chain2_out && !shownSteps[2]) {
                    await displayStepResult(2, analysisResult.chain2_out);
                    shownSteps[2] = true;
                }
                
                // 3단계 결과 표시
                if (analysisResult.chain3_out && !shownSteps[3]) {
                    await displayStepResult(3, analysisResult.chain3_out);
                    shownSteps[3] = true;
                }
                
                // 4단계 결과 표시
                if (analysisResult.serial_encoder_out && !shownSteps[4]) {
                    await displayStepResult(4, analysisResult.serial_encoder_out);
                    shownSteps[4] = true;
                }
            }
            
            if (currentStepValue) {
                updateHardwareSection(currentStepValue);
                
                // current_step이 6일 때 하드웨어 구동 완료 상태로 변경
                if (currentStepValue === 6) {
                    updateHardwareStatus('completed', '구동 완료');
                }
            }
        }
    } catch (error) {
        console.error('🔧 현재 상태 확인 오류:', error);
        // 오류 시 기본 상태로 설정
        updateHardwareStatus('waiting', '대기중');
    }
}

// 완료된 단계들의 상태를 업데이트하는 함수
function updateCompletedStepsStatus(analysisResult, currentStep) {
    console.log('🔧 완료된 단계 상태 업데이트 시작');
    console.log('🔧 analysisResult:', analysisResult);
    console.log('🔧 currentStep:', currentStep);
    
    if (!analysisResult) {
        console.log('🔧 분석 결과가 없습니다');
        return;
    }
    
    // 각 단계별로 완료 상태 확인 및 업데이트
    const stepResults = {
        1: analysisResult.chain1_out,
        2: analysisResult.chain2_out,
        3: analysisResult.chain3_out,
        4: analysisResult.serial_encoder_out
    };
    
    console.log('🔧 단계별 결과:', stepResults);
    
    for (let step = 1; step <= 4; step++) {
        const stepResult = stepResults[step];
        const statusElement = document.getElementById(`step${step}AccordionStatus`);
        
        console.log(`🔧 ${step}단계 검사:`, {
            stepResult: !!stepResult,
            statusElement: !!statusElement,
            statusElementId: `step${step}AccordionStatus`,
            statusElementText: statusElement ? statusElement.textContent : 'N/A'
        });
        
        if (stepResult && statusElement) {
            console.log(`🔧 ${step}단계 결과 존재: 완료 상태로 변경`);
            console.log(`🔧 변경 전 상태: "${statusElement.textContent}"`);
            
            // 아코디언 상태를 완료로 변경
            statusElement.textContent = '완료';
            statusElement.className = 'accordion-step-status completed';
            
            console.log(`🔧 변경 후 상태: "${statusElement.textContent}"`);
            console.log(`🔧 변경 후 클래스: "${statusElement.className}"`);
            
            // 진행률 바도 100%로 설정
            const progressBar = document.getElementById(`step${step}Progress`);
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.setAttribute('aria-valuenow', 100);
                progressBar.classList.remove('loading');
                console.log(`🔧 ${step}단계 진행률 바 100%로 설정`);
            }
            
            // 진행률 텍스트도 100%로 설정
            const progressText = document.getElementById(`step${step}ProgressText`);
            if (progressText) {
                progressText.textContent = '100%';
                console.log(`🔧 ${step}단계 진행률 텍스트 100%로 설정`);
            }
            
            // 상단 진행 카드도 완료 상태로 업데이트 (1-3단계만)
            if (step <= 3) {
                const stepProgress = document.getElementById(`stepProgress${step}`);
                if (stepProgress) {
                    stepProgress.classList.add('completed');
                    console.log(`🔧 ${step}단계 상단 카드 완료 상태로 설정`);
                }
                
                const stepIcon = document.getElementById(`stepIcon${step}`);
                if (stepIcon) {
                    stepIcon.innerHTML = '<span class="step-number">&nbsp;</span>';
                    console.log(`🔧 ${step}단계 아이콘 체크마크로 변경`);
                }
                
                const stepStatus = document.getElementById(`stepStatus${step}`);
                if (stepStatus) {
                    stepStatus.textContent = '완료';
                    console.log(`🔧 ${step}단계 상태 텍스트 완료로 변경`);
                }
            }
            
            // 세부 현황 모달의 아이콘도 업데이트
            if (typeof updateStepIcon === 'function') {
                updateStepIcon(step);
            }
        } else if (step < currentStep && statusElement) {
            // current_step보다 작은 단계들은 완료로 처리
            console.log(`🔧 ${step}단계는 current_step(${currentStep})보다 작으므로 완료 상태로 변경`);
            console.log(`🔧 변경 전 상태: "${statusElement.textContent}"`);
            statusElement.textContent = '완료';
            statusElement.className = 'accordion-step-status completed';
            console.log(`🔧 변경 후 상태: "${statusElement.textContent}"`);
        } else {
            console.log(`🔧 ${step}단계 상태 변경 건너뜀:`, {
                hasResult: !!stepResult,
                hasStatusElement: !!statusElement,
                stepLessThanCurrent: step < currentStep
            });
        }
    }
    
    console.log('🔧 완료된 단계 상태 업데이트 완료');
}


// 수동 하드웨어 상태 업데이트 함수 (디버깅용)
function forceUpdateHardwareStatus() {
    console.log('🔧 수동 하드웨어 상태 업데이트 시작');
    
    // 현재 state.json에서 current_step 확인
    fetch('/desktop/api/status')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('응답이 JSON 형식이 아닙니다');
            }
            return response.json();
        })
        .then(result => {
            if (result.success && result.data) {
                const currentStep = result.data.current_step;
                const analysisResult = result.data.analysis_result;
                console.log(`🔧 현재 current_step: ${currentStep}`);
                
                // 완료된 단계들 상태 업데이트
                updateCompletedStepsStatus(analysisResult, currentStep);
                
                if (currentStep === 5) {
                    updateHardwareStatus('completed', '구동 완료');
                } else {
                    console.log(`🔧 current_step이 ${currentStep}이므로 대기중 상태로 설정`);
                    updateHardwareStatus('waiting', '대기중');
                }
            } else {
                console.error('🔧 상태 정보를 가져올 수 없습니다:', result);
            }
        })
        .catch(error => {
            console.error('🔧 상태 확인 오류:', error);
            // 오류 시 대기중 상태로 설정
            updateHardwareStatus('waiting', '대기중');
        });
}

// 하드웨어 상태 테스트 함수 (개발용)
function testHardwareStatusChange() {
    console.log('🧪 하드웨어 상태 테스트 시작');
    
    // 대기중 -> 구동중 -> 완료 순서로 테스트
    setTimeout(() => {
        console.log('🧪 1단계: 대기중 상태');
        updateHardwareStatus('waiting', '대기중');
    }, 0);
    
    setTimeout(() => {
        console.log('🧪 2단계: 구동중 상태');
        updateHardwareStatus('processing', '구동중');
    }, 2000);
    
    setTimeout(() => {
        console.log('🧪 3단계: 구동 완료 상태');
        updateHardwareStatus('completed', '완료');
    }, 4000);
    
    setTimeout(() => {
        console.log('🧪 4단계: 다시 대기중 상태');
        updateHardwareStatus('waiting', '대기중');
    }, 6000);
    
    console.log('🧪 하드웨어 상태 테스트 완료 (8초 후)');
}

// 하드웨어 아이콘 초기화 (클릭 이벤트 제거됨)
function setupHardwareIcon() {
    const hardwareIcon = document.getElementById('hardwareIcon');
    if (hardwareIcon) {
        // 하드웨어 아이콘을 클릭 불가능하게 설정
        hardwareIcon.style.cursor = 'default';
        
        // 기본 상태를 대기중으로 설정
        updateHardwareStatus('waiting', '대기중');
        
        console.log('✅ 하드웨어 아이콘 초기화 완료 - 기본 상태: 대기중');
    }
}

// 페이지 로드 시 로그 기능 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그 관련 기능 초기화
    setupLogsRefreshButton();
    loadRecentLogs();
    startLogsAutoRefresh();
    
    // 하드웨어 아이콘 초기화
    setupHardwareIcon();
    
    // 즉시 하드웨어 상태 확인 (SSE 연결 전에)
    setTimeout(() => {
        forceUpdateHardwareStatus();
    }, 500);
    
    console.log('✅ 로그 기능 초기화 완료');
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    stopLogsAutoRefresh();
});

// 전역 함수 노출
window.updateAIProgress = updateAIProgress;
window.updateStepIndicator = updateStepIndicator;
window.updateAccordionStatus = updateAccordionStatus;
window.handleAIStatusData = handleAIStatusData;
window.startAIStatusStream = startAIStatusStream;
window.updateStepIcon = updateStepIcon;
window.updateHardwareSection = updateHardwareSection;
window.updateHardwareStatus = updateHardwareStatus;
window.handleHardwareEvent = handleHardwareEvent;
window.checkCurrentStatusAndUpdateHardware = checkCurrentStatusAndUpdateHardware;
window.forceUpdateHardwareStatus = forceUpdateHardwareStatus;
window.updateCompletedStepsStatus = updateCompletedStepsStatus;
window.testHardwareStatusChange = testHardwareStatusChange;
window.resetAllSteps = resetAllSteps;
window.resetStepsAfter2ToWaiting = resetStepsAfter2ToWaiting;