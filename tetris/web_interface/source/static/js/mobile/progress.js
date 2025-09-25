let currentStep = 0;
let progressValue = 0;
let doneWaitCount = 0;
let currentScenario = null;
let eventSource = null;
let detailPanelOpen = false;
let stepResultsOriginalParent = null;
let stepResultsNextSibling = null;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };

// URL에서 시나리오 정보 가져오기
function getScenarioFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('scenario') || 'default';
}

// 뒤로가기
function goBack() {
    window.history.back();
}

// HTTP 폴링 제거됨: 상태 새로고침은 SSE로만 처리

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

// 진행률 업데이트 - 서버 값만 사용
function updateProgress(percentage, serverStep = null) {
    // 진행률은 후퇴하지 않도록 보장
    if (typeof percentage === 'number') {
        progressValue = Math.max(progressValue || 0, percentage);
        document.getElementById('progressPercentage').textContent = progressValue + '%';
        if (detailPanelOpen) {
            const dp = document.getElementById('detailProgressPercentage');
            if (dp) dp.textContent = progressValue + '%';
        }
    }
    
    // 서버 단계가 없으면 종료
    if (serverStep === null || serverStep === undefined) {
        console.log('⚠️ 서버에서 단계 정보를 받지 못함, 현재 단계 유지');
        return;
    }
    console.log('✅ 서버에서 받은 단계:', serverStep);
    
    // 단계는 후퇴하지 않도록 보장 (단, 1단계로의 초기화는 허용)
    if (serverStep < currentStep && serverStep !== 1) {
        console.log('⏭️ 단계 후퇴 감지, 무시합니다. (현재:', currentStep, '수신:', serverStep, ')');
        return;
    }
    
    if (serverStep !== currentStep) {
        currentStep = serverStep;
        updateStepDisplay();
        document.getElementById('progressText').textContent = getCurrentStepMessage(currentStep);
        console.log('단계 변경:', currentStep + '단계로 업데이트');
        if (detailPanelOpen) refreshDetailTimeline();
        if (detailPanelOpen) {
            const dt = document.getElementById('detailProgressText');
            if (dt) dt.textContent = getCurrentStepMessage(currentStep);
        }
    }
}

// 단계 표시 업데이트
function updateStepDisplay() {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        const icon = step.querySelector('.step-icon');
        const title = step.querySelector('.step-title');
        const description = step.querySelector('.step-description');
        
        if (i < currentStep) {
            // 완료된 단계
            icon.className = 'step-icon completed';
            icon.textContent = '✓';
            title.style.color = '#28a745';
            description.textContent = '완료되었습니다';
        } else if (i === currentStep) {
            // 현재 진행 중인 단계
            if (currentStep === 5) {
                // 5단계는 완료 상태로 표시
                icon.className = 'step-icon completed';
                icon.textContent = '✓';
                title.style.color = '#28a745';
                description.textContent = '분석이 완료되었습니다!';
            } else {
                icon.className = 'step-icon active';
                icon.textContent = i;
                title.style.color = '#007bff';
                description.textContent = '진행 중입니다...';
            }
        } else {
            // 대기 중인 단계
            icon.className = 'step-icon pending';
            icon.textContent = i;
            title.style.color = '#999';
            description.textContent = '대기 중입니다';
        }
    }
}

// SSE 상태 수신 핸들러
function handleStatusData(statusData) {
    try {
        if (statusData) {
            console.log('SSE 상태 데이터:', statusData);
            
            // 전체 statusData 로그 출력
            console.log('📊 전체 statusData:', statusData);
            console.log('🔍 statusData.current_step:', statusData.current_step);
            console.log('🔍 statusData.processing:', statusData.processing);
            console.log('🔍 statusData.progress:', statusData.progress);
            console.log('🔍 statusData.status:', statusData.status);
            
            // 서버에서 받은 단계 정보 확인
            const serverStep = statusData.current_step || statusData.processing?.current_step;
            console.log('✅ 서버 단계 정보:', serverStep);
            
            // current_step이 undefined인지 확인
            if (statusData.current_step === undefined) {
                console.warn('⚠️ current_step이 undefined입니다!');
            } else {
                console.log('✅ current_step 값:', statusData.current_step, '타입:', typeof statusData.current_step);
            }
            
            // 진행률 업데이트 (서버 값만 사용)
            const progress = statusData.progress || statusData.processing?.progress;
            if (progress !== undefined && serverStep !== null && serverStep !== undefined) {
                console.log('📊 서버 진행률 업데이트:', progress + '%', '단계:', serverStep);
                updateProgress(progress, serverStep);
            } else {
                console.log('⚠️ 서버에서 진행률 또는 단계 정보가 불완전함:', {
                    progress: progress,
                    serverStep: serverStep
                });
            }
            
            // 서버 메시지가 있으면 표시 (진행률과 독립적으로)
            const serverMessage = statusData.message;
            if (serverMessage) {
                document.getElementById('progressText').textContent = serverMessage;
                console.log('📝 서버 메시지 업데이트:', serverMessage);
            }
            
            // 현재 단계 확인
            const currentStep = statusData.current_step || 0;
            console.log(`현재 단계: ${currentStep}`);
            console.log(`현재 단계 타입: ${typeof currentStep}`);
            console.log(`currentStep >= 1: ${currentStep >= 1}`);
            console.log(`currentStep >= 2: ${currentStep >= 2}`);
            console.log(`currentStep >= 3: ${currentStep >= 3}`);
            console.log(`currentStep >= 4: ${currentStep >= 4}`);
            
            // 새로운 분석 시작 감지 (current_step이 1이고 이전에 더 높은 단계였던 경우)
            if (currentStep === 1) {
                console.log('🔄 새로운 분석 시작 감지 - 이전 결과 클리어');
                clearAllStepResults();
            }
            
            // 이번 이벤트 payload에 포함된 단계별 결과를 아코디언에 반영
            try {
                const ar = statusData.analysis_result || {};
                const pr = statusData.processed_results || {};

                // 가공된 결과 우선 표시
                if (pr.chain1_out && !shownSteps[1]) {
                    displayProcessedStepResult(1, pr.chain1_out);
                    shownSteps[1] = true;
                }
                if (pr.chain2_out && !shownSteps[2]) {
                    displayProcessedStepResult(2, pr.chain2_out);
                    shownSteps[2] = true;
                }
                if (pr.chain3_out && !shownSteps[3]) {
                    displayProcessedStepResult(3, pr.chain3_out);
                    shownSteps[3] = true;
                }
                if (pr.chain4_out && !shownSteps[4]) {
                    displayProcessedStepResult(4, pr.chain4_out);
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

                // 루트에 실린 경우도 대응
                if (statusData.chain1_out && !shownSteps[1]) {
                    displayStepResult(1, statusData.chain1_out);
                    shownSteps[1] = true;
                }
                if (statusData.chain2_out && !shownSteps[2]) {
                    displayStepResult(2, statusData.chain2_out);
                    shownSteps[2] = true;
                }
                if (statusData.chain3_out && !shownSteps[3]) {
                    displayStepResult(3, statusData.chain3_out);
                    shownSteps[3] = true;
                }
                if (statusData.chain4_out && !shownSteps[4]) {
                    displayStepResult(4, statusData.chain4_out);
                    shownSteps[4] = true;
                }
            } catch (e) {
                console.warn('단계별 결과 반영 중 오류:', e);
            }

            // 5단계 완료 시 - 실제 4단계 결과가 도착한 경우에만 완료 처리
            const hasStep4Output = !!(shownSteps[4] || statusData.analysis_result?.chain4_out);
            if (currentStep >= 5 && hasStep4Output) {
                console.log('✅ 5단계 완료 - 분석 완료 처리 (출력 확인됨)');
                updateProgress(100, 5);
                document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                showResultButton();
            } else if (currentStep >= 5 && !hasStep4Output) {
                doneWaitCount = (doneWaitCount || 0) + 1;
                console.log(`⏳ 5단계 신호 수신, 그러나 step4 출력 미도착 → 완료 처리 보류 (시도 ${doneWaitCount})`);
                // 안전장치: 일정 횟수(예: 5회) 이상 대기 시 완료로 간주
                if (doneWaitCount >= 5) {
                    console.log('⚠️ 최종 출력 미도착 타임아웃 → 완료로 간주하고 종료');
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    updateProgress(100, 5);
                    showResultButton();
                }
            }
            
            // 상태에 따른 처리
            const status = statusData.status || statusData.system?.status;
            if (status === 'done') {
                const hasFinal = !!(statusData.chain4_out || statusData.analysis_result?.chain4_out || statusData.processed_results?.chain4_out);
                if (hasFinal) {
                    console.log('분석 완료! (최종 출력 확인)');
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    showResultButton();
                } else {
                    doneWaitCount = (doneWaitCount || 0) + 1;
                    console.log(`분석 완료 신호 수신, 그러나 최종 출력 미도착 → 폴링 유지 (시도 ${doneWaitCount})`);
                }
            } else if (status === 'error') {
                console.log('분석 오류 발생');
                document.getElementById('progressText').textContent = '분석 중 오류가 발생했습니다.';
            }
        }
    } catch (error) {
        console.error('상태 처리 오류:', error);
    }
}

// 결과 확인 버튼 표시
function showResultButton() {
    const button = document.getElementById('resultCheckButton');
    button.classList.add('show');
}

// 상세 패널 열기
function openDetailPanel() {
    const panel = document.getElementById('detailPanel');
    // const source = document.getElementById('stepResults');
    // const target = document.getElementById('detailStepResults');
    // const tl = document.getElementById('detailTimeline');
    // if (panel && source && target) {
    if (panel) {
        // 최초 오픈 시 원래 위치 기억
        // if (!stepResultsOriginalParent) {
        //     stepResultsOriginalParent = source.parentNode;
        //     stepResultsNextSibling = source.nextSibling;
        // }
        // 동일 노드를 상세 패널 내부로 이동 → SSE 갱신이 그대로 반영됨
        // target.innerHTML = '';
        // target.appendChild(source);
        // source.style.display = 'block';
        panel.classList.add('show');
        panel.setAttribute('aria-hidden', 'false');
        detailPanelOpen = true;
        // 초기 타임라인 상태 갱신
        refreshDetailTimeline();
        // 상세 진행 카드 동기화
        syncDetailProgressCard();
    }
}

// 상세 패널 닫기
function closeDetailPanel() {
    const panel = document.getElementById('detailPanel');
    const source = document.getElementById('stepResults');
    if (panel) {
        panel.classList.remove('show');
        panel.setAttribute('aria-hidden', 'true');
    }
    // 원래 위치로 되돌리기
    if (source && stepResultsOriginalParent) {
        try {
            if (stepResultsNextSibling && stepResultsNextSibling.parentNode === stepResultsOriginalParent) {
                stepResultsOriginalParent.insertBefore(source, stepResultsNextSibling);
            } else {
                stepResultsOriginalParent.appendChild(source);
            }
            source.style.display = 'none';
        } catch (_) {}
    }
    detailPanelOpen = false;
}

// 상세 패널의 타임라인 상태를 현재 단계에 맞춰 갱신
function refreshDetailTimeline() {
    const tlSteps = [1,2,3,4];
    tlSteps.forEach((n) => {
        const el = document.getElementById(`tl-step-${n}`);
        if (!el) return;
        el.classList.remove('active','completed');
        if (currentStep > n) {
            el.classList.add('completed');
        } else if (currentStep === n) {
            el.classList.add('active');
        }
    });
}

// 상세 진행 카드(퍼센트/텍스트) 동기화
function syncDetailProgressCard() {
    const dp = document.getElementById('detailProgressPercentage');
    const dt = document.getElementById('detailProgressText');
    const p = document.getElementById('progressPercentage');
    const t = document.getElementById('progressText');
    if (dp && dt && p && t) {
        dp.textContent = p.textContent;
        dt.textContent = t.textContent;
    }
}

// 단계별 분석 결과 업데이트
function updateStepResults(resultData) {
    console.log('updateStepResults 호출됨:', resultData);
    
    // 1단계: 이미지 분석 결과
    if (resultData.chain1_out) {
        console.log('1단계 결과 발견:', resultData.chain1_out);
        displayStepResult(1, resultData.chain1_out);
    }
    
    // 2단계: 짐 인식 및 분류 결과
    if (resultData.chain2_out) {
        console.log('2단계 결과 발견:', resultData.chain2_out);
        displayStepResult(2, resultData.chain2_out);
    }
    
    // 3단계: 차량 공간 계산 결과
    if (resultData.chain3_out) {
        console.log('3단계 결과 발견:', resultData.chain3_out);
        displayStepResult(3, resultData.chain3_out);
    }
    
    // 4단계: 최적 배치 생성 결과
    if (resultData.chain4_out) {
        console.log('4단계 결과 발견:', resultData.chain4_out);
        displayStepResult(4, resultData.chain4_out);
    }
}

// 가공된 단계별 분석 결과 업데이트
function updateProcessedStepResults(processedResults) {
    console.log('updateProcessedStepResults 호출됨:', processedResults);
    
    // 1단계: 이미지 분석 결과
    if (processedResults.chain1_out) {
        console.log('가공된 1단계 결과 발견:', processedResults.chain1_out);
        displayProcessedStepResult(1, processedResults.chain1_out);
    }
    
    // 2단계: 짐 인식 및 분류 결과
    if (processedResults.chain2_out) {
        console.log('가공된 2단계 결과 발견:', processedResults.chain2_out);
        displayProcessedStepResult(2, processedResults.chain2_out);
    }
    
    // 3단계: 차량 공간 계산 결과
    if (processedResults.chain3_out) {
        console.log('가공된 3단계 결과 발견:', processedResults.chain3_out);
        displayProcessedStepResult(3, processedResults.chain3_out);
    }
    
    // 4단계: 최적 배치 생성 결과
    if (processedResults.chain4_out) {
        console.log('가공된 4단계 결과 발견:', processedResults.chain4_out);
        displayProcessedStepResult(4, processedResults.chain4_out);
    }
}

// 모든 단계 결과 클리어
function clearAllStepResults() {
    console.log('🧹 모든 단계 결과 클리어 시작');
    
    for (let i = 1; i <= 4; i++) {
        const resultElement = document.getElementById(`step${i}Result`);
        const contentElement = document.getElementById(`step${i}ResultContent`);
        
        if (resultElement && contentElement) {
            contentElement.innerHTML = '';
            resultElement.style.display = 'none';
            console.log(`🧹 ${i}단계 결과 클리어 완료`);
        }
    }
    
    console.log('🧹 모든 단계 결과 클리어 완료');
}

// 안전 유틸리티 (삭제되었을 수 있어 재정의)
function safeSliceText(value, max = 100) {
    try {
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }
    } catch (_) {
        value = String(value);
    }
    if (!value) return '';
    return value.length > max ? value.slice(0, max) + '...' : value;
}

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
    s = s.replace(/```json\s*|```/gi, '').trim();
    // JSON 형식이 아니면 스킵
    if (!(s.startsWith('{') || s.startsWith('['))) {
        return null;
    }
    try {
        return JSON.parse(s);
    } catch (_) {
        return null;
    }
}

// 특정 단계의 결과를 화면에 표시
function displayStepResult(stepNumber, resultData) {
    console.log(`🎯 displayStepResult 호출됨: 단계 ${stepNumber}, 데이터:`, resultData);
    
    
    const accordionItem = document.getElementById(`accordionItem0${stepNumber}`);
    const accordionCollapse = document.getElementById(`accordionCollapseSample0${stepNumber}`);
    
    if (!accordionItem || !accordionCollapse) {
        console.error(`단계 ${stepNumber} 결과 요소를 찾을 수 없습니다.`);
        return;
    }
    
    // 이전 데이터 클리어
    accordionItem.classList.remove('active');
    accordionCollapse.style.display = 'none';
    
    // 결과 데이터 포맷팅
    const formattedResult = formatStepResult(stepNumber, resultData);
    console.log(`🎯 포맷된 결과:`, formattedResult);
    
    // 내용 업데이트
    accordionCollapse.innerHTML = formattedResult;
    
    // 결과 영역 표시
    accordionItem.classList.add('accordion-item');
    accordionCollapse.style.display = 'inline-block';

    accordionItem.addEventListener('click', () => {
        accordionItem.classList.toggle('active');
    });
    
    console.log(`단계 ${stepNumber} 결과 표시 완료`);
}

// 가공된 특정 단계의 결과를 화면에 표시
function displayProcessedStepResult(stepNumber, processedData) {
    const resultElement = document.getElementById(`step${stepNumber}Result`);
    const contentElement = document.getElementById(`step${stepNumber}ResultContent`);
    
    if (!resultElement || !contentElement) {
        console.error(`단계 ${stepNumber} 결과 요소를 찾을 수 없습니다.`);
        return;
    }
    
    // 이전 데이터 클리어
    contentElement.innerHTML = '';
    resultElement.style.display = 'none';
    
    // 가공된 결과 데이터 포맷팅
    const formattedResult = formatProcessedStepResult(stepNumber, processedData);
    
    // 내용 업데이트
    contentElement.innerHTML = formattedResult;
    
    // 결과 영역 표시
    resultElement.style.display = 'block';
    
    // 애니메이션으로 표시
    setTimeout(() => {
        resultElement.classList.add('show', 'completed');
        initResultToggle(stepNumber);
    }, 100);
    
    // 단계별 완료 텍스트 표시
    showStepCompletionText(stepNumber, processedData);
    
    console.log(`가공된 단계 ${stepNumber} 결과 표시 완료`);
}

// 단계별 완료 텍스트 표시
function showStepCompletionText(stepNumber, processedData) {
    const stepResultsContainer = document.getElementById('stepResults');
    if (!stepResultsContainer) return;
    
    // 기존 완료 텍스트 제거 (중복 방지)
    const existingText = document.getElementById(`step${stepNumber}CompletionText`);
    if (existingText) {
        existingText.remove();
    }
    
    // 완료 텍스트 생성
    const completionText = createStepCompletionText(stepNumber, processedData);
    
    // 완료 텍스트를 해당 단계 결과 아래에 삽입
    const resultElement = document.getElementById(`step${stepNumber}Result`);
    if (resultElement) {
        resultElement.insertAdjacentHTML('afterend', completionText);
    } else {
        // 결과 요소가 없으면 컨테이너에 직접 추가
        stepResultsContainer.insertAdjacentHTML('beforeend', completionText);
    }
    
    console.log(`단계 ${stepNumber} 완료 텍스트 표시 완료`);
}

// 결과 블록 접기/펼치기 토글 초기화
function initResultToggle(stepNumber) {
    const item = document.getElementById(`step${stepNumber}Result`);
    if (!item) return;
    const title = item.querySelector('.step-result-title');
    const content = item.querySelector('.step-result-content');
    if (!title || !content) return;

    // 초기 높이 설정
    if (!item.classList.contains('expanded')) {
        content.style.maxHeight = '0px';
    }

    // 중복 바인딩 방지
    title.removeEventListener('click', title._toggleHandler);
    title._toggleHandler = () => {
        const isExpanded = item.classList.contains('expanded');
        if (isExpanded) {
            item.classList.remove('expanded');
            content.style.maxHeight = '0px';
        } else {
            item.classList.add('expanded');
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    };
    title.addEventListener('click', title._toggleHandler);
}

// 단계별 완료 텍스트 생성
function createStepCompletionText(stepNumber, processedData) {
    let title = '';
    let content = '';
    
    switch(stepNumber) {
        case 1: // 이미지 분석
            title = '1단계: 이미지 분석 완료';
            content = `
                <p><span class="highlight">${processedData.people_count || 0}명</span></p>
                <p><strong>🧳 총 짐 개수:</strong> <span class="highlight">${processedData.total_luggage || 0}개</span></p>
                <p>이미지에서 <span class="highlight">${processedData.people_count || 0}명의 인원</span>과 <span class="highlight">${processedData.total_luggage || 0}개의 짐</span>을 성공적으로 인식했습니다.</p>
            `;
            break;
            
        case 2: // 짐 인식 및 분류
            title = '2단계: 짐 인식 및 분류 완료';
            content = `
                <p><strong>🪑 좌석 배치 지시사항 생성 완료</strong></p>
                <p>각 짐의 특성에 맞는 <span class="highlight">좌석 배치 지시사항</span>을 성공적으로 생성했습니다.</p>
            `;
            break;
            
        case 3: // 차량 공간 계산
            title = '3단계: 차량 공간 계산 완료';
            content = `
                <p><strong>🚗 차량 환경 분석 완료</strong></p>
                <p>차량의 <span class="highlight">공간 구조</span>와 <span class="highlight">작업 순서</span>를 성공적으로 계산했습니다.</p>
            `;
            break;
            
        case 4: // 최적 배치 생성
            title = '4단계: 최적 배치 생성 완료';
            content = `
                <p><strong>🎯 최적 배치 코드 생성 완료</strong></p>
                <p><span class="highlight">${processedData.code_length || 0}자리 배치 코드</span>를 성공적으로 생성했습니다.</p>
                <p>코드: <span class="highlight">${processedData.placement_code || ''}</span></p>
            `;
            break;
            
        default:
            title = `${stepNumber}단계: 분석 완료`;
            content = `<p>분석이 성공적으로 완료되었습니다.</p>`;
    }
    
    return `
        <div class="step-completion-text" id="step${stepNumber}CompletionText">
            <h4>${title}</h4>
            ${content}
        </div>
    `;
}

// 단계별 결과 데이터 포맷팅
function formatStepResult(stepNumber, resultData) {
    console.log(`🔧 formatStepResult 호출됨: 단계 ${stepNumber}, 데이터 타입: ${typeof resultData}`);
    try {
        let formattedResult = '';
        
        switch(stepNumber) {
            case 1: // 이미지 분석
                console.log(`🔧 1단계 데이터 파싱 시도:`, resultData);
                const chain1Data = (function(){
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();
                console.log(`🔧 1단계 파싱 완료:`, chain1Data);
                formattedResult = `
                    <strong>👥 인원 수:</strong> ${chain1Data.people || 0}명
                    <br><strong>🧳 총 짐 개수:</strong> ${chain1Data.total_luggage_count || 0}개
                    <br><strong>📋 짐 상세 정보</strong>
                `;
                let luggageTableRows = '';
                
                for (let luggage in chain1Data.luggage_details) {
                    luggageTableRows += `
                        <tr>
                            <td>${chain1Data.luggage_details[luggage].object}</td>
                            <td>${chain1Data.luggage_details[luggage].color}</td>
                            <td>${chain1Data.luggage_details[luggage].material}</td>
                            <td>${chain1Data.luggage_details[luggage].shape}</td>
                        </tr>
                    `;
                }

                formattedResult += `
                    <br><table border="1">
                        <thead>
                            <tr>
                                <th>물건</th>
                                <th>색상</th>
                                <th>재료</th>
                                <th>모양</th>
                            </tr>
                        </thead>
                        <tbody>${luggageTableRows}</tbody>
                    </table>
                `;
                break;
                
            case 2: // 짐 인식 및 분류
                const chain2Data = (function(){
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();
                formattedResult = `
                    <strong>🪑 좌석 배치 지시사항</strong>
                `;
                let seatsTableRows = '';
                for (let seat in chain2Data.instruction.seats) {
                    let seatDataArray = chain2Data.instruction.seats[seat];
                    let tableSeatData = '';
                    seatDataArray.forEach(data => {
                        tableSeatData += `<td>${data}</td>`;
                    });
                    seatsTableRows += `<tr>${tableSeatData}</tr>`;
                }
                formattedResult += `
                    <br><table border="1">
                        <thead>
                            <tr>
                                <th>위치</th>
                                <th>방법</th>
                                <th>용량</th>
                                <th>chair|storage</th>
                            </tr>
                        </thead>
                        <tbody>${seatsTableRows}</tbody>
                    </table>
                `;
                break;
                
            case 3: // 차량 공간 계산
                const cleanData = (typeof resultData === 'string') ? resultData.replace(/```json\s*|```/g, '') : resultData;
                const chain3Data = (function(){
                    const parsed = safeJsonParse(cleanData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();

                let environmentBeforeTableRows = '';
                for (let seat in chain3Data.environment_before.seats) {
                    environmentBeforeTableRows += `<tr>
                        <td>${chain3Data.environment_before.seats[seat].rail_axis}</td>
                        <td>${chain3Data.environment_before.seats[seat].position}</td>
                        <td>${chain3Data.environment_before.seats[seat].facing}</td>
                        <td>${chain3Data.environment_before.seats[seat].mode}</td>
                    </tr>`;
                }

                let taskSequenceTableRows = '';
                for (let seq in chain3Data.task_sequence) {
                    let taskSequenceDataArray = chain3Data.task_sequence[seq];
                    let tabletaskSequenceData = '';
                    taskSequenceDataArray.forEach(data => {
                        tabletaskSequenceData += `<td>${data}</td>`;
                    });
                    taskSequenceTableRows += `<tr>${tabletaskSequenceData}</tr>`;
                }

                let environmentAfterTableRows = '';
                for (let seat in chain3Data.environment_after.seats) {
                    environmentAfterTableRows += `<tr>
                        <td>${chain3Data.environment_after.seats[seat].rail_axis}</td>
                        <td>${chain3Data.environment_after.seats[seat].position}</td>
                        <td>${chain3Data.environment_after.seats[seat].facing}</td>
                        <td>${chain3Data.environment_after.seats[seat].mode}</td>
                    </tr>`;
                }


                formattedResult = `
                    <strong>🚗 환경 설정 (이전):</strong>
                    <br><table border="1">
                        <thead>
                            <tr>
                                <th>rail_axis</th>
                                <th>position</th>
                                <th>facing</th>
                                <th>mode</th>
                            </tr>
                        </thead>
                        <tbody>${environmentBeforeTableRows}</tbody>
                    </table>
                    <br><strong>📋 작업 순서:</strong>
                    <br><table border="1">
                        <tbody>${taskSequenceTableRows}</tbody>
                    </table>
                    <br><strong>🚗 환경 설정 (이후):</strong>
                    <br><table border="1">
                        <thead>
                            <tr>
                                <th>rail_axis</th>
                                <th>position</th>
                                <th>facing</th>
                                <th>mode</th>
                            </tr>
                        </thead>
                        <tbody>${environmentAfterTableRows}</tbody>
                    </table>
                `;

                break;
                
            case 4: // 최적 배치 생성
                formattedResult = `
                    <strong>🎯 최적 배치 코드:</strong> ${resultData}
                    <br><em>16자리 코드는 각 좌석의 최적 배치 상태를 나타냅니다.</em>
                `;
                break;
                
            default:
                formattedResult = `<pre>${resultData}</pre>`;
        }
        
        return formattedResult;
        
    } catch (error) {
        console.error(`단계 ${stepNumber} 결과 포맷팅 오류:`, error);
        return `<p>데이터 파싱 오류: ${error.message}</p><pre>${resultData}</pre>`;
    }
}

// 가공된 단계별 결과 데이터 포맷팅
function formatProcessedStepResult(stepNumber, processedData) {
    try {
        let formattedResult = '';
        
        switch(stepNumber) {
            case 1: // 이미지 분석
                try {
                    // processedData가 문자열인 경우 JSON 파싱 시도
                    let chain1Data = processedData;
                    if (typeof processedData === 'string') {
                        chain1Data = safeJsonParse(processedData) || {};
                    }
                    
                    const peopleCount = chain1Data.people || chain1Data.people_count || 0;
                    const totalLuggage = chain1Data.total_luggage_count || chain1Data.total_luggage || 0;
                    const luggageDetails = chain1Data.luggage_details || {};
                    
                    // 짐 상세 정보를 표 형태로 변환
                    let luggageTableRows = '';
                    if (typeof luggageDetails === 'object' && luggageDetails !== null) {
                        console.log("luggageDetails" + luggageDetails);
                        Object.entries(luggageDetails).forEach(([key, value]) => {
                            luggageTableRows += `
                                <tr>
                                    <td>${key}</td>
                                    <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
                                </tr>
                            `;
                        });
                    }
                    
                    formattedResult = `
                        <table>
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>값</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>👥 인원 수</strong></td>
                                    <td>${peopleCount}명</td>
                                </tr>
                                <tr>
                                    <td><strong>🧳 총 짐 개수</strong></td>
                                    <td>${totalLuggage}개</td>
                                </tr>
                                ${luggageTableRows ? `
                                <tr>
                                    <td colspan="2"><strong>📋 짐 상세 정보</strong></td>
                                </tr>
                                ${luggageTableRows}
                                ` : ''}
                            </tbody>
                        </table>
                    `;
                } catch (error) {
                    console.error('1단계 결과 포맷팅 오류:', error);
                    formattedResult = `포맷팅 오류 발생`;
                }
                break;
                
            case 2: // 짐 인식 및 분류
                try {
                    // 가공된 좌석 배치 데이터가 있는 경우
                    if (processedData.seat_assignments && Array.isArray(processedData.seat_assignments)) {
                        const seatAssignments = processedData.seat_assignments;
                        const seatsCount = processedData.seats_count || seatAssignments.length;
                        
                        // 좌석 배치 표 생성
                        let tableRows = '';
                        seatAssignments.forEach(seat => {
                            tableRows += `
                                <tr>
                                    <td>${seat.seat_id}</td>
                                    <td>${seat.type}</td>
                                    <td>${seat.size}</td>
                                    <td>${seat.category}</td>
                                </tr>
                            `;
                        });
                        
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>좌석 번호</th>
                                        <th>타입</th>
                                        <th>크기</th>
                                        <th>카테고리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        `;
                    } else {
                        // 가공된 데이터가 없는 경우 원본 표시
                        let instructionData = processedData && processedData.instruction ? processedData.instruction : {};
                        if (typeof processedData === 'string') {
                            const parsed = safeJsonParse(processedData) || {};
                            instructionData = parsed.instruction || parsed;
                        }
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>🪑 좌석 배치 지시사항</strong></td>
                                        <td><pre>${JSON.stringify(instructionData, null, 2)}</pre></td>
                                    </tr>
                                </tbody>
                            </table>
                        `;
                    }
                } catch (error) {
                    console.error('2단계 결과 포맷팅 오류:', error);
                    formattedResult = `
                        <table>
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>값</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>🪑 좌석 배치 지시사항</strong></td>
                                    <td><pre>${processedData}</pre></td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                }
                break;
                
            case 3: // 차량 공간 계산
                try {
                    // 가공된 작업 순서 데이터가 있는 경우
                    if (processedData.task_sequence_list && Array.isArray(processedData.task_sequence_list)) {
                        const taskSequenceList = processedData.task_sequence_list;
                        
                        // 작업 순서 표 생성
                        let taskRows = '';
                        taskSequenceList.forEach(task => {
                            taskRows += `
                                <tr>
                                    <td>${task.step_id}</td>
                                    <td>${task.action}</td>
                                    <td>${task.target}</td>
                                    <td>${task.description}</td>
                                </tr>
                            `;
                        });
                        
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>단계</th>
                                        <th>작업</th>
                                        <th>대상</th>
                                        <th>설명</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${taskRows}
                                </tbody>
                            </table>
                            <br>
                            <table>
                                <thead>
                                    <tr>
                                        <th>환경 설정</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>🌍 환경 설정 (이전)</strong></td>
                                        <td><pre>${JSON.stringify(processedData.environment_before || {}, null, 2)}</pre></td>
                                    </tr>
                                    <tr>
                                        <td><strong>🌍 환경 설정 (이후)</strong></td>
                                        <td><pre>${JSON.stringify(processedData.environment_after || {}, null, 2)}</pre></td>
                                    </tr>
                                </tbody>
                            </table>
                        `;
                    } else {
                        // 가공된 데이터가 없는 경우 원본 표시
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>🌍 환경 설정 (이전)</strong></td>
                                        <td><pre>${JSON.stringify(processedData.environment_before || {}, null, 2)}</pre></td>
                                    </tr>
                                    <tr>
                                        <td><strong>📋 작업 순서</strong></td>
                                        <td><pre>${JSON.stringify(processedData.task_sequence || {}, null, 2)}</pre></td>
                                    </tr>
                                    <tr>
                                        <td><strong>🌍 환경 설정 (이후)</strong></td>
                                        <td><pre>${JSON.stringify(processedData.environment_after || {}, null, 2)}</pre></td>
                                    </tr>
                                </tbody>
                            </table>
                        `;
                    }
                } catch (error) {
                    console.error('3단계 결과 포맷팅 오류:', error);
                    formattedResult = `
                        <table>
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>값</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>🚗 차량 공간 계산 결과</strong></td>
                                    <td><pre>${processedData}</pre></td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                }
                break;
                
            case 4: // 최적 배치 생성
                try {
                    // 가공된 배치 분석 데이터가 있는 경우
                    if (processedData.placement_analysis) {
                        const analysis = processedData.placement_analysis;
                        const complexityText = {
                            'basic': '기본',
                            'medium': '중간',
                            'high': '고급'
                        }[analysis.complexity_level] || '기본';
                        
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>📏 코드 길이</strong></td>
                                        <td>${processedData.code_length || 0}자</td>
                                    </tr>
                                    <tr>
                                        <td><strong>📋 지시사항 수</strong></td>
                                        <td>${analysis.total_instructions}개</td>
                                    </tr>
                                    <tr>
                                        <td><strong>⚡ 복잡도</strong></td>
                                        <td>${complexityText}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>📝 배치 코드</strong></td>
                                        <td><pre>${processedData.placement_code || ''}</pre></td>
                                    </tr>
                                </tbody>
                            </table>
                        `;
                    } else {
                        // 가공된 데이터가 없는 경우 원본 표시
                        formattedResult = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th>값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>🎯 최적 배치 코드</strong></td>
                                        <td><pre>${processedData.placement_code || ''}</pre></td>
                                    </tr>
                                    <tr>
                                        <td><strong>📏 코드 길이</strong></td>
                                        <td>${processedData.code_length || 0}자</td>
                                    </tr>
                                </tbody>
                            </table>
                        `;
                    }
                } catch (error) {
                    console.error('4단계 결과 포맷팅 오류:', error);
                    formattedResult = `
                        <table>
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>값</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>🎯 최적 배치 생성 결과</strong></td>
                                    <td><pre>${processedData}</pre></td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                }
                break;
                
            default:
                formattedResult = `
                    <table>
                        <thead>
                            <tr>
                                <th>항목</th>
                                <th>값</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>📊 분석 결과</strong></td>
                                <td><pre>${JSON.stringify(processedData, null, 2)}</pre></td>
                            </tr>
                        </tbody>
                    </table>
                `;
        }
        
        return formattedResult;
        
    } catch (error) {
        console.error(`가공된 단계 ${stepNumber} 결과 포맷팅 오류:`, error);
        return `<p>데이터 포맷팅 오류: ${error.message}</p><pre>${JSON.stringify(processedData, null, 2)}</pre>`;
    }
}

// 분석 시작
async function startAnalysis() {
    try {
        // 새로운 시나리오 생성 (이전 데이터 방지)
        const newScenario = `step_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        console.log('새로운 시나리오 생성:', newScenario);
        
        // 세션 스토리지에서 분석 데이터 가져오기
        const analysisDataStr = sessionStorage.getItem('analysisData');
        let analysisData = {
            people_count: 4,
            image_data_url: 'default_image',
            scenario: newScenario  // 새로운 시나리오 사용
        };
        
        if (analysisDataStr) {
            analysisData = (function(){
                try { return JSON.parse(analysisDataStr); } catch { return {}; }
            })();
            // 새로운 시나리오로 덮어쓰기
            analysisData.scenario = newScenario;
            console.log('세션에서 분석 데이터 가져옴 (새로운 시나리오 적용):', {
                scenario: analysisData.scenario,
                people_count: analysisData.people_count,
                image_data_url: analysisData.image_data_url.substring(0, 50) + '...'
            });
        } else {
            console.warn('세션에서 분석 데이터를 찾을 수 없습니다. 기본값 사용');
        }
        
        // 분석 시작 API 호출
        console.log('분석 API 호출 시작...');
        const response = await fetch('/desktop/api/step_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                people_count: analysisData.people_count,
                image_data_url: analysisData.image_data_url,
                scenario: analysisData.scenario
            })
        });
        
        const result = await response.json();
        console.log('분석 시작 응답:', result);
        
        if (result.success) {
            console.log('분석이 성공적으로 시작되었습니다.');
            // currentScenario 업데이트
            currentScenario = newScenario;
            console.log('현재 시나리오 업데이트:', currentScenario);
            // 진행률 텍스트 업데이트
            document.getElementById('progressText').textContent = 'AI가 분석을 시작했습니다...';
        } else {
            console.error('분석 시작 실패:', result.message);
            // 오류 메시지 표시
            document.getElementById('progressText').textContent = '분석 시작에 실패했습니다: ' + result.message;
        }
    } catch (error) {
        console.error('분석 시작 오류:', error);
        document.getElementById('progressText').textContent = '분석 시작 중 오류가 발생했습니다: ' + error.message;
    }
}

function initializeAccordions() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        item.classList.remove('active');
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    currentScenario = getScenarioFromURL();
    console.log('시나리오:', currentScenario);
    
    // 초기 상태 설정
    updateProgress(0);
    updateStepDisplay();
    // 분석 중에도 상세보기 가능하도록 버튼 노출
    showResultButton();
    
    // 분석 시작
    startAnalysis();
    
    // 아코디언 초기화
    initializeAccordions();
    
    // SSE 시작
    try {
        if (eventSource) {
            eventSource.close();
        }
        eventSource = new EventSource('/desktop/api/status_stream');
        eventSource.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                // 연결 이벤트는 건너뜀
                if (payload && payload.event === 'connected') return;
                handleStatusData(payload);
                const status = payload.status || payload.system?.status;
                const hasFinal = !!(payload.chain4_out || payload.analysis_result?.chain4_out || payload.processed_results?.chain4_out);
                if (status === 'done' && hasFinal) {
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    showResultButton();
                    eventSource.close();
                } else if (status === 'error') {
                    document.getElementById('progressText').textContent = '분석 중 오류가 발생했습니다.';
                    eventSource.close();
                }
            } catch (err) {
                console.error('SSE 메시지 처리 오류:', err);
            }
        };
        eventSource.onerror = (e) => {
            console.warn('SSE 오류 또는 종료:', e);
            try { eventSource.close(); } catch (_) {}
        };
    } catch (e) {
        console.error('SSE 연결 실패:', e);
    }
});