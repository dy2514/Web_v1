/**
 * TETRIS Control Dashboard - AI Processing Functions
 * AI 처리 관련 기능 (Mobile Progress 로직 기반)
 */

// 전역 변수
let currentStep = 0;
let progressValue = 0;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };
let eventSource = null;

// 현재 단계에 맞는 문구 반환
function getCurrentStepMessage(step) {
    const messages = {
        1: "이미지 분석 중입니다...",
        2: "짐 인식 및 분류 중입니다...",
        3: "차량 공간 계산 중입니다...",
        4: "최적 배치 생성 중입니다...",
        5: "결과 검증 및 완료 중입니다..."
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
        aiProgressStatus.textContent = message || getCurrentStepMessage(step);
    }
}

// 단계별 인디케이터 업데이트
function updateStepIndicator(step) {
    console.log(`🎯 updateStepIndicator 호출: 단계=${step}`);
    
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        if (indicator) {
            indicator.classList.remove('active', 'completed');
            
            if (i < step) {
                indicator.classList.add('completed');
            } else if (i === step) {
                indicator.classList.add('active');
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

// SSE 상태 수신 핸들러 (Mobile Progress 로직 기반)
function handleAIStatusData(statusData) {
    try {
        if (statusData) {
            console.log('📊 AI 상태 데이터 수신:', statusData);
            
            // 서버에서 받은 단계 정보 확인
            const serverStep = statusData.current_step || statusData.processing?.current_step;
            const progress = statusData.progress || statusData.processing?.progress;
            const message = statusData.message || statusData.processing?.message;
            
            console.log(`📊 서버 정보: 단계=${serverStep}, 진행률=${progress}%, 메시지=${message}`);
            
            // 단계 업데이트 (후퇴 방지)
            if (serverStep !== null && serverStep !== undefined) {
                if (serverStep < currentStep && serverStep !== 1) {
                    console.log('⏭️ 단계 후퇴 감지, 무시합니다.');
                    return;
                }
                
                if (serverStep !== currentStep) {
                    currentStep = serverStep;
                    updateStepIndicator(currentStep);
                    console.log(`✅ 단계 변경: ${currentStep}단계로 업데이트`);
                }
            }
            
            // 진행률 업데이트
            if (progress !== undefined && progress !== null) {
                progressValue = Math.max(progressValue || 0, progress);
                updateAIProgress(currentStep, progressValue, 'processing', message);
                console.log(`📊 진행률 업데이트: ${progressValue}%`);
            }
            
            // 단계별 결과 처리
            handleStepResults(statusData);
            
            // 완료 처리
            if (currentStep >= 5 || statusData.status === 'done') {
                console.log('✅ AI 처리 완료');
                updateAIProgress(currentStep, 100, 'completed', 'AI 처리 완료');
                updateStepIndicator(5);
            }
        }
    } catch (error) {
        console.error('AI 상태 처리 오류:', error);
    }
}

// 단계별 결과 처리
function handleStepResults(statusData) {
    try {
        const ar = statusData.analysis_result || {};
        const pr = statusData.processed_results || {};
        
        // 가공된 결과 우선 표시
        if (pr.chain1_out && !shownSteps[1]) {
            displayStepResult(1, pr.chain1_out);
            shownSteps[1] = true;
        }
        if (pr.chain2_out && !shownSteps[2]) {
            displayStepResult(2, pr.chain2_out);
            shownSteps[2] = true;
        }
        if (pr.chain3_out && !shownSteps[3]) {
            displayStepResult(3, pr.chain3_out);
            shownSteps[3] = true;
        }
        if (pr.chain4_out && !shownSteps[4]) {
            displayStepResult(4, pr.chain4_out);
            shownSteps[4] = true;
        }
        
        // 원본 결과 표시 (가공된 결과가 없을 때)
        if (ar.chain1_out && !shownSteps[1]) {
            displayStepResult(1, ar.chain1_out);
            shownSteps[1] = true;
        }
        if (ar.chain2_out && !shownSteps[2]) {
            displayStepResult(2, ar.chain2_out);
            shownSteps[2] = true;
        }
        if (ar.chain3_out && !shownSteps[3]) {
            displayStepResult(3, ar.chain3_out);
            shownSteps[3] = true;
        }
        if (ar.chain4_out && !shownSteps[4]) {
            displayStepResult(4, ar.chain4_out);
            shownSteps[4] = true;
        }
    } catch (e) {
        console.warn('단계별 결과 처리 중 오류:', e);
    }
}

// 단계별 결과 표시
function displayStepResult(stepNumber, resultData) {
    console.log(`🎯 displayStepResult 호출: 단계 ${stepNumber}, 데이터:`, resultData);
    
    const detailInfo = document.getElementById(`step${stepNumber}DetailInfo`);
    if (detailInfo) {
        const formattedResult = formatStepResult(stepNumber, resultData);
        detailInfo.innerHTML = formattedResult;
        
        // 결과 표시 하이라이트 클래스 추가
        detailInfo.classList.add('has-result');
        
        // 아코디언 자동 열기
        updateAccordionStatus(stepNumber, 'active');
    }
}

// 단계별 결과 포맷팅
function formatStepResult(stepNumber, resultData) {
    try {
        let formattedResult = '';
        
        switch(stepNumber) {
            case 1: // 이미지 분석
                const chain1Data = safeJsonParse(resultData) || {};
                formattedResult = `
                    <div class="step-result-content">
                        <h4>📊 분석 결과</h4>
                        <p><strong>👥 인원 수:</strong> ${chain1Data.people || 0}명</p>
                        <p><strong>🧳 총 짐 개수:</strong> ${chain1Data.total_luggage_count || 0}개</p>
                        <div class="result-details">
                            <h5>짐 상세 정보:</h5>
                            <pre>${JSON.stringify(chain1Data.luggage_details || {}, null, 2)}</pre>
                        </div>
                    </div>
                `;
                break;
                
            case 2: // 짐 인식 및 분류
                const chain2Data = safeJsonParse(resultData) || {};
                formattedResult = `
                    <div class="step-result-content">
                        <h4>🪑 좌석 배치 지시사항</h4>
                        <div class="result-details">
                            <pre>${JSON.stringify(chain2Data.instruction || chain2Data, null, 2)}</pre>
                        </div>
                    </div>
                `;
                break;
                
            case 3: // 차량 공간 계산
                const chain3Data = safeJsonParse(resultData) || {};
                formattedResult = `
                    <div class="step-result-content">
                        <h4>🚗 차량 공간 계산 결과</h4>
                        <div class="result-details">
                            <h5>환경 설정 (이전):</h5>
                            <pre>${JSON.stringify(chain3Data.environment_before || {}, null, 2)}</pre>
                            <h5>작업 순서:</h5>
                            <pre>${JSON.stringify(chain3Data.task_sequence || {}, null, 2)}</pre>
                            <h5>환경 설정 (이후):</h5>
                            <pre>${JSON.stringify(chain3Data.environment_after || {}, null, 2)}</pre>
                        </div>
                    </div>
                `;
                break;
                
            case 4: // 최적 배치 생성
                formattedResult = `
                    <div class="step-result-content">
                        <h4>🎯 최적 배치 코드</h4>
                        <div class="result-details">
                            <p><strong>배치 코드:</strong> <code>${resultData}</code></p>
                            <p><em>16자리 코드는 각 좌석의 최적 배치 상태를 나타냅니다.</em></p>
                        </div>
                    </div>
                `;
                break;
                
            default:
                formattedResult = `
                    <div class="step-result-content">
                        <h4>📊 분석 결과</h4>
                        <div class="result-details">
                            <pre>${JSON.stringify(resultData, null, 2)}</pre>
                        </div>
                    </div>
                `;
        }
        
        return formattedResult;
        
    } catch (error) {
        console.error(`단계 ${stepNumber} 결과 포맷팅 오류:`, error);
        return `<div class="step-result-content"><p>데이터 포맷팅 오류: ${error.message}</p></div>`;
    }
}

// 안전한 JSON 파싱
function safeJsonParse(data) {
    if (data && typeof data === 'object') {
        return data;
    }
    if (typeof data !== 'string') {
        return null;
    }
    
    let s = data.trim();
    // 코드펜스 제거
    if (s.startsWith('```')) {
        s = s.replace(/^```json\s*/i, '')
            .replace(/^```/i, '')
            .replace(/```$/i, '')
            .trim();
    }
    
    if (!(s.startsWith('{') || s.startsWith('['))) {
        return null;
    }
    
    try {
        return JSON.parse(s);
    } catch (_) {
        return null;
    }
}

// SSE 연결 시작
function startAIStatusStream() {
    try {
        if (eventSource) {
            eventSource.close();
        }
        
        eventSource = new EventSource('/desktop/api/status_stream');
        eventSource.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                console.log('📡 SSE 메시지 수신:', payload);
                
                // 연결 이벤트는 건너뜀
                if (payload && payload.event === 'connected') return;
                
                // AI 상태 데이터 처리
                handleAIStatusData(payload);
                
            } catch (err) {
                console.error('SSE 메시지 처리 오류:', err);
            }
        };
        
        eventSource.onerror = (e) => {
            console.warn('SSE 오류 또는 종료:', e);
            try { eventSource.close(); } catch (_) {}
        };
        
        console.log('✅ AI 상태 스트림 시작');
    } catch (e) {
        console.error('SSE 연결 실패:', e);
    }
}

// 분석 시작
function startAIAnalysis() {
    console.log('🚀 AI 분석 시작');
    
    // 상태 초기화
    currentStep = 0;
    progressValue = 0;
    shownSteps = { 1: false, 2: false, 3: false, 4: false };
    
    // 초기 상태 설정
    updateAIProgress(1, 0, 'waiting', '분석을 시작하고 있습니다...');
    updateStepIndicator(0);
    
    // SSE 연결 시작
    startAIStatusStream();
}

// 전역 함수 노출
window.updateAIProgress = updateAIProgress;
window.updateStepIndicator = updateStepIndicator;
window.updateAccordionStatus = updateAccordionStatus;
window.handleAIStatusData = handleAIStatusData;
window.startAIAnalysis = startAIAnalysis;
window.startAIStatusStream = startAIStatusStream;