let currentStep = 0;
let progressValue = 0;
let doneWaitCount = 0;
let currentScenario = null;
let eventSource = null;
let detailPanelOpen = false;
let stepResultsOriginalParent = null;
let stepResultsNextSibling = null;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };

// 하드웨어 제어 관련 변수
let currentPlacementCode = null;
let hardwareControlRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

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

// Progress Bar 업데이트 함수
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
        
        // 진행률에 따른 색상 변경
        if (percentage < 20) {
            progressFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
        } else if (percentage < 40) {
            progressFill.style.background = 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)';
        } else if (percentage < 60) {
            progressFill.style.background = 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)';
        } else if (percentage < 80) {
            progressFill.style.background = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)';
        }
    }
}

// 진행률 업데이트 - 서버 값만 사용
function updateProgress(percentage, serverStep = null) {
    // 진행률은 후퇴하지 않도록 보장
    if (typeof percentage === 'number') {
        progressValue = Math.max(progressValue || 0, percentage);
        document.getElementById('progressPercentage').textContent = progressValue + '%';
        
        // Progress Bar 업데이트
        updateProgressBar(progressValue);
        
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
        // updateStepDisplay();
        document.getElementById('progressText').textContent = getCurrentStepMessage(currentStep);
        console.log('단계 변경:', currentStep + '단계로 업데이트');
        if (detailPanelOpen) refreshDetailTimeline();
        if (detailPanelOpen) {
            const dt = document.getElementById('detailProgressText');
            if (dt) dt.textContent = getCurrentStepMessage(currentStep);
        }
    }
}

// 단계 표시 업데이트 (임시 비활성화)
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
                showResultButton(); // 분석 완료 시 버튼 활성화
            } else if (currentStep >= 5 && !hasStep4Output) {
                doneWaitCount = (doneWaitCount || 0) + 1;
                console.log(`⏳ 5단계 신호 수신, 그러나 step4 출력 미도착 → 완료 처리 보류 (시도 ${doneWaitCount})`);
                // 안전장치: 일정 횟수(예: 5회) 이상 대기 시 완료로 간주
                if (doneWaitCount >= 5) {
                    console.log('⚠️ 최종 출력 미도착 타임아웃 → 완료로 간주하고 종료');
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    updateProgress(100, 5);
                    showResultButton(); // 분석 완료 시 버튼 활성화
                }
            }
            
            // 상태에 따른 처리
            const status = statusData.status || statusData.system?.status;
            if (status === 'done') {
                const hasFinal = !!(statusData.chain4_out || statusData.analysis_result?.chain4_out || statusData.processed_results?.chain4_out);
                if (hasFinal) {
                    console.log('분석 완료! (최종 출력 확인)');
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    showResultButton(); // 분석 완료 시 버튼 활성화
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
    button.disabled = false; // 분석 완료 시 버튼 활성화
    button.textContent = '분석 결과 적용하기'; // 원래 텍스트로 복원
}

// 결과 확인 버튼 비활성화
function disableResultButton() {
    const button = document.getElementById('resultCheckButton');
    button.disabled = true;
    button.textContent = '분석 완료 후 적용 가능';
}

// 분석 결과 적용하기 버튼 클릭
function applyAnalysisResult() {
    const button = document.getElementById('resultCheckButton');
    
    // 버튼이 비활성화된 경우 처리
    if (button.disabled) {
        return;
    }
    
    // 4단계 결과에서 배치 코드 추출
    // const placementCode = extractPlacementCode();
    
    // if (!placementCode) {
    //     alert('분석 결과에서 배치 코드를 찾을 수 없습니다. 분석이 완료된 후 다시 시도해주세요.');
    //     return;
    // }
    
    // currentPlacementCode = placementCode;
    showHardwareConfirmModal();
}

// 배치 코드 추출 함수
// function extractPlacementCode() {
//     // 여러 소스에서 배치 코드 찾기
//     let placementCode = null;
    
//     // 1. sessionStorage에서 최신 분석 결과 확인
//     const analysisDataStr = sessionStorage.getItem('analysisData');
//     if (analysisDataStr) {
//         try {
//             const analysisData = JSON.parse(analysisDataStr);
//             if (analysisData.placement_code) {
//                 placementCode = analysisData.placement_code;
//             }
//         } catch (e) {
//             console.warn('세션 데이터 파싱 오류:', e);
//         }
//     }
    
//     // 2. 전역 변수에서 확인 (SSE로 받은 데이터)
//     if (!placementCode && window.latestAnalysisResult) {
//         const result = window.latestAnalysisResult;
//         if (result.chain4_out) {
//             placementCode = result.chain4_out;
//         } else if (result.processed_results && result.processed_results.chain4_out) {
//             placementCode = result.processed_results.chain4_out.placement_code;
//         }
//     }
    
//     // 3. DOM에서 직접 찾기
//     if (!placementCode) {
//         const step4Result = document.getElementById('step4ResultContent');
//         if (step4Result) {
//             const text = step4Result.textContent || step4Result.innerText;
//             // 16자리 숫자 패턴 찾기
//             const match = text.match(/\b\d{16}\b/);
//             if (match) {
//                 placementCode = match[0];
//             }
//         }
//     }
    
//     console.log('추출된 배치 코드:', placementCode);
//     return placementCode;
// }

// 하드웨어 확인 모달 표시
function showHardwareConfirmModal() {
    const modal = document.getElementById('hardwareConfirmModal');
    const codeElement = document.getElementById('placementCodeValue');
    
    if (codeElement && currentPlacementCode) {
        codeElement.textContent = currentPlacementCode;
    }
    
    modal.style.display = 'flex';
}

// 하드웨어 확인 모달 닫기
function cancelHardwareControl() {
    const modal = document.getElementById('hardwareConfirmModal');
    modal.style.display = 'none';
    currentPlacementCode = null;
}

// 하드웨어 제어 확인
function confirmHardwareControl() {
    // if (!currentPlacementCode) {
    //     alert('배치 코드가 없습니다.');
    //     return;
    // }
    
    // 확인 모달 닫기
    const confirmModal = document.getElementById('hardwareConfirmModal');
    confirmModal.style.display = 'none';
    
    // 하드웨어 제어 실행
    executeHardwareControl();

    // 진행 모달 표시 (임시..)
    showHardwareProgressModal();
}

// 하드웨어 진행 모달 표시
function showHardwareProgressModal() {
    const modal = document.getElementById('hardwareProgressModal');
    modal.style.display = 'flex';
    
    // 초기 상태 설정
    // resetHardwareStatus();
    // updateHardwareProgress(0, '하드웨어 연결 중...');
}

// 하드웨어 진행 모달 닫기
function closeHardwareProgress() {
    const modal = document.getElementById('hardwareProgressModal');
    modal.style.display = 'none';
    hardwareControlRetryCount = 0;
}

// 하드웨어 상태 초기화
function resetHardwareStatus() {
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        item.classList.remove('completed', 'error', 'processing');
        const icon = item.querySelector('.status-icon');
        icon.textContent = '⏳';
    });
    
    document.getElementById('closeProgressBtn').style.display = 'none';
    document.getElementById('retryBtn').style.display = 'none';
}

// 하드웨어 진행 상황 업데이트
function updateHardwareProgress(progress, message) {
    const progressFill = document.getElementById('hardwareProgressFill');
    const progressText = document.getElementById('hardwareProgressText');
    
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
}

// 하드웨어 제어 실행
async function executeHardwareControl() {
    try {
        // 1단계: 아두이노 연결
        updateHardwareStatus('connection', 'processing');
        updateHardwareProgress(20, '아두이노 연결 중...');
        
        // 2단계: 명령 전송
        updateHardwareStatus('connection', 'completed');
        updateHardwareStatus('command', 'processing');
        updateHardwareProgress(50, '명령 전송 중...');
        
        // API 호출
        const response = await fetch('/desktop/api/trigger_hardware', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: currentScenario || 'default',
                // placement_code: currentPlacementCode
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 성공 처리
            updateHardwareStatus('command', 'completed');
            updateHardwareStatus('execution', 'completed');
            updateHardwareProgress(100, '하드웨어 제어 완료!');
            
            // 완료 버튼 표시
            document.getElementById('closeProgressBtn').style.display = 'block';
            
            console.log('하드웨어 제어 성공:', result);
        } else {
            throw new Error(result.error || '하드웨어 제어 실패');
        }
        
    } catch (error) {
        console.error('하드웨어 제어 오류:', error);
        
        // 에러 상태 표시
        updateHardwareStatus('command', 'error');
        updateHardwareStatus('execution', 'error');
        updateHardwareProgress(0, `오류: ${error.message}`);
        
        // 재시도 버튼 표시
        if (hardwareControlRetryCount < MAX_RETRY_ATTEMPTS) {
            document.getElementById('retryBtn').style.display = 'block';
        } else {
            document.getElementById('closeProgressBtn').style.display = 'block';
        }
    }
}

// 하드웨어 상태 업데이트
function updateHardwareStatus(type, status) {
    let statusElement;
    
    switch(type) {
        case 'connection':
            statusElement = document.getElementById('connectionStatus');
            break;
        case 'command':
            statusElement = document.getElementById('commandStatus');
            break;
        case 'execution':
            statusElement = document.getElementById('executionStatus');
            break;
    }
    
    if (statusElement) {
        const statusItem = statusElement.closest('.status-item');
        statusItem.classList.remove('completed', 'error', 'processing');
        statusItem.classList.add(status);
        
        switch(status) {
            case 'completed':
                statusElement.textContent = '✅';
                break;
            case 'error':
                statusElement.textContent = '❌';
                break;
            case 'processing':
                statusElement.textContent = '⏳';
                break;
        }
    }
}

// 하드웨어 제어 재시도
function retryHardwareControl() {
    hardwareControlRetryCount++;
    console.log(`하드웨어 제어 재시도 (${hardwareControlRetryCount}/${MAX_RETRY_ATTEMPTS})`);
    
    // 재시도 버튼 숨기기
    document.getElementById('retryBtn').style.display = 'none';
    
    // 상태 초기화 후 재실행
    resetHardwareStatus();
    executeHardwareControl();
}

// 하드웨어 이벤트 처리
function handleHardwareEvent(payload) {
    console.log('하드웨어 이벤트 수신:', payload);
    
    switch(payload.event) {
        case 'hardware_start':
            updateHardwareProgress(10, payload.message || '하드웨어 제어 시작');
            break;
            
        case 'hardware_progress':
            const progress = payload.progress || 50;
            updateHardwareProgress(progress, payload.message || '하드웨어 제어 진행 중');
            break;
            
        case 'hardware_complete':
            updateHardwareStatus('execution', 'completed');
            updateHardwareProgress(100, payload.message || '하드웨어 제어 완료');
            document.getElementById('closeProgressBtn').style.display = 'block';
            break;
            
        case 'hardware_error':
            updateHardwareStatus('command', 'error');
            updateHardwareStatus('execution', 'error');
            updateHardwareProgress(0, `오류: ${payload.message || '알 수 없는 오류'}`);
            
            if (hardwareControlRetryCount < MAX_RETRY_ATTEMPTS) {
                document.getElementById('retryBtn').style.display = 'block';
            } else {
                document.getElementById('closeProgressBtn').style.display = 'block';
            }
            break;
    }
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
        document.querySelector('.topbar img').style.opacity = 0;
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
        document.querySelector('.topbar img').style.opacity = 1;
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
    
    // 이전 데이터 클리어
    accordionItem.innerHTML = '';
    
    // 결과 데이터 포맷팅
    const formattedResult = formatStepResult(stepNumber, resultData);
    console.log(`🎯 포맷된 결과:`, formattedResult);

    // 새로운 아코디언 요소로 변경
    const stepTitleList = ['이미지 분석', '짐 인식 및 분류', '차량 공간 계산', '최적 배치 생성'];
    const newAccordionHtml = `
      <div id="accordionItem0${stepNumber}" class="accordion-item">
        <h5 class="accordion-header"><button type="button" id="accordionHeaderSample0${stepNumber}" class="btn-accordion" aria-controls="accordionCollapseSample0${stepNumber}">
            <span>${stepTitleList[stepNumber - 1]}</span>
        </button></h5>
        <div id="accordionCollapseSample01" class="accordion-collapse collapse" aria-labelledby="accordionHeaderSample0${stepNumber}">
        <div class="accordion-body">
            ${formattedResult}
        </div>
        </div>
    </div>
    `;

    accordionItem.innerHTML = newAccordionHtml;

    // krds 아코디언 초기화
    krds_accordion.init({
        allowMultiple: true,  // 여러 아코디언 동시 열기 허용
        closeOthers: false    // 다른 아코디언 열 때 기존 것 닫지 않음
    });
    krds_accordion.setupAccordions();
    // 아코디언 요소 너비 설정
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.parentElement.style.width = '100%';
    });
    document.querySelectorAll('.krds-accordion .accordion-item .btn-accordion.active:focus').forEach(item => {
        item.borderRadius = '5px';
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
    // updateStepDisplay();
    
    // 초기에는 버튼 비활성화
    disableResultButton();
    
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
                
                // 하드웨어 제어 이벤트 처리
                if (payload.event && payload.event.startsWith('hardware_')) {
                    handleHardwareEvent(payload);
                    return;
                }
                
                handleStatusData(payload);
                const status = payload.status || payload.system?.status;
                const hasFinal = !!(payload.chain4_out || payload.analysis_result?.chain4_out || payload.processed_results?.chain4_out);
                if (status === 'done' && hasFinal) {
                    document.getElementById('progressText').textContent = '분석이 완료되었습니다!';
                    showResultButton(); // 분석 완료 시 버튼 활성화
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