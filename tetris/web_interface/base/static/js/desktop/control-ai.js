/**
 * TETRIS Control Dashboard - AI Processing Functions
 * AI 처리 관련 기능 (Mobile Progress 로직 기반)
 */

// 전역 변수
let currentStep = 1;
let progressValue = 25;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };
let eventSource = null;

// 로그 관련 변수
let logsRefreshInterval = null;

// 최신 로그 조회 및 표시
async function loadRecentLogs() {
    try {
        const response = await fetch('/api/logs/recent');
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
    logsContent.style.display = 'block';
    
    if (logs.length === 0) {
        logsContent.innerHTML = `
            <div class="log-item">
                <div class="log-header">
                    <span class="log-filename">로그 없음</span>
                </div>
                <div class="log-content">아직 생성된 로그가 없습니다.</div>
            </div>
        `;
        return;
    }
    
    // 로그 항목들 생성
    const logsHTML = logs.map((log, index) => `
        <div class="log-item">
            <div class="log-header">
                <span class="log-filename">${log.filename}</span>
                <span class="log-timestamp">${log.timestamp}</span>
            </div>
            <div class="log-content" id="logContent_${index}">${escapeHtml(log.content)}</div>
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
        0: "사용자 입력 대기 중입니다...",
        1: "사용자 입력 분석 중입니다...",
        2: "최적 배치 생성 중입니다...",
        3: "시트 동작 계획 중입니다...",
        4: "하드웨어 구동 중입니다..."
    };
    return messages[step] || "분석을 시작하고 있습니다...";
}

// AI 처리 단계 업데이트
function updateAIProgress(step, progress, status, message) {
    if (step == 5) { step = 4; }
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
        overallProgressFill.style.width = `${progress}%`;
    }
    
    if (overallProgressPercentage) {
        overallProgressPercentage.textContent = `${progress}%`;
    }
    
    // 현재 단계의 아코디언 자동 열기
    if (step && (status === 'running' || status === 'active')) {
        updateAccordionStatus(step, 'active');
        // 이전 단계들은 '분석 완료'로 표시
        for (let i = 1; i < step; i++) {
            const prevStatusEl = document.getElementById(`step${i}AccordionStatus`);
            if (prevStatusEl) {
                prevStatusEl.textContent = '분석 완료';
                prevStatusEl.className = 'accordion-step-status completed';
            }
        }
    }
}

// 단계별 인디케이터 업데이트
function updateStepIndicator(step) {
    if (step == 5) { step = 4; }
    else if (step == 6) { step = 5; }
    console.log(`🎯 updateStepIndicator 호출: 단계=${step}`);
    
    for (let i = 1; i <= 4; i++) {
        const stepProgress = document.getElementById(`stepProgress${i}`);
        const stepIcon = document.getElementById(`stepIcon${i}`);
        const stepStatus = document.getElementById(`stepStatus${i}`);
        
        if (stepProgress) {
            stepProgress.classList.remove('active', 'completed');
            
            if (i < step) {
                stepProgress.classList.add('completed');
                if (stepIcon) {
                    stepIcon.innerHTML = '<span class="step-number">✓</span>';
                }
                if (stepStatus) {
                    stepStatus.textContent = '완료';
                }
            } else if (i === step) {
                stepProgress.classList.add('active');
                if (stepIcon) {
                    stepIcon.innerHTML = `<span class="step-number">${i}</span>`;
                }
                if (stepStatus) {
                    stepStatus.textContent = '진행중';
                }
            } else {
                if (stepIcon) {
                    stepIcon.innerHTML = `<span class="step-number">${i}</span>`;
                }
                if (stepStatus) {
                    stepStatus.textContent = '대기중';
                }
            }
        }
    }
}

// 아코디언 상태 업데이트
function updateAccordionStatus(step, status) {
    const accordionHeader = document.getElementById(`accordionHeaderStep${step}`);
    const accordionCollapse = document.getElementById(`accordionCollapseStep${step}`);
    
    if (accordionHeader && accordionCollapse) {
        if (status === 'active' || status === 'running') {
            accordionHeader.setAttribute('aria-expanded', 'true');
            accordionCollapse.classList.add('show');
            accordionCollapse.setAttribute('aria-hidden', 'false');
        }
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

            serverStep++;
            console.log('📊 serverStep:', serverStep);
            let progress;
            switch(serverStep) {
                case 1:
                    progress = 20;
                    break;
                case 2:
                    progress = 40;
                    break;
                case 3:
                    progress = 60;
                    break;
                case 4: case 5:
                    progress = 80;
                    break;
                case 6:
                    progress = 100;
                    break;
                default:    
                    progress = 0;
            }
            console.log('📊 단계별 고정 진행률 업데이트:', progress + '%', '단계:', serverStep);
            
            // 단계 업데이트 (후퇴 방지)
            if (serverStep < currentStep && serverStep !== 1 && serverStep !== 0) {
                console.log('⏭️ 단계 후퇴 감지, 무시합니다. (현재:', currentStep, '수신:', serverStep, ')');
                return;
            }
            
            if (serverStep !== currentStep) {
                console.log(`✅ 단계 변경: ${currentStep} -> ${serverStep}단계로 업데이트`);
                currentStep = serverStep;
                updateStepIndicator(currentStep);
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
            
            // 완료 처리 (mobile/progress와 동일한 로직)
            if (currentStep > 5) {
                console.log('✅ AI 처리 완료 (최종 출력 확인)');
                updateAIProgress(currentStep, 100, 'completed', '하드웨어 구동이 완료되었습니다!');
                updateStepIndicator(5);
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
        if (ar.chain4_out && ar.chain3_out && !shownSteps[3]) {
            // 3단계 결과가 있으면 바로 표시
            ar.chain3_out = safeJsonParse(ar.chain3_out);
            if (ar.chain4_out) {
                ar.chain3_out.placement_code = ar.chain4_out;
            }
            await displayStepResult(3, ar.chain3_out);
            shownSteps[3] = true;
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
        if (statusData.chain4_out && statusData.chain3_out && !shownSteps[3]) {
            // 3단계 결과가 있으면 바로 표시
            statusData.chain3_out = safeJsonParse(statusData.chain3_out);
            if (statusData.chain4_out) {
                statusData.chain3_out.placement_code = statusData.chain4_out;
            }
            await displayStepResult(3, statusData.chain3_out);
            shownSteps[3] = true;
        }
        if (statusData.current_step == 5 && !shownSteps[4]) {
            await displayStepResult(4, null);
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
    // fallback: 기존 구현 유지 (위 정의 참고)
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

// 결과 포맷팅은 ProgressCore 사용
async function formatStepResult(stepNumber, resultData) {
    if (window.ProgressCore && typeof ProgressCore.formatStepResult === 'function') {
        // 데스크탑은 이미지 데이터 URL 사용
        const ctx = {
            chain2OptionPrefix: 'option',
            chain3OptionPrefix: 'option',
            chain2OptionExt: 'png',
            chain3OptionExt: 'png',
            async getStep1Image() {
                try {
                    const response = await fetch('/desktop/api/status');
                    const statusData = await response.json();
                    if (statusData.success && statusData.data) {
                        return statusData.data.upload?.image_data_url || statusData.data.image_data_url || '';
                    }
                } catch (_) {}
                return '';
            }
        };
        return ProgressCore.formatStepResult(stepNumber, resultData, ctx);
    }
    // fallback
    return `<div class="analysis-result-container"><pre>${typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2)}</pre></div>`;
}

// SSE 연결 시작 (mobile/progress와 동일한 API 사용)
function startAIStatusStream() {
    try {
        if (eventSource) {
            eventSource.close();
        }
        
        // 데스크탑용 SSE 엔드포인트 사용
        const statusStreamUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.STATUS_STREAM || '/api/status_stream';
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
    } catch (e) {
        console.error('SSE 연결 실패:', e);
    }
}

// 페이지 로드 시 로그 기능 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그 관련 기능 초기화
    setupLogsRefreshButton();
    loadRecentLogs();
    startLogsAutoRefresh();
    
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