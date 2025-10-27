let currentStep = 0;
let progressValue = 0;
let doneWaitCount = 0;
let currentScenario = null;
let eventSource = null;
let detailPanelOpen = false;
let stepResultsOriginalParent = null;
let stepResultsNextSibling = null;
let shownSteps = { 1: false, 2: false, 3: false, 4: false };
let optionNo = -1;
// option 이미지 파일 명 prefix, 확장자
let chain2OptionImgNamePrefix = "option";
let chain3OptionImgNamePrefix = "option";
let chain2OptionImgNameExtension = "png";
let chain3OptionImgNameExtension = "png";

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
        1: "사용자 입력 분석 중입니다",
        2: "최적 배치 생성 중입니다",
        3: "시트 동작 계획 중입니다",
        4: "최적 배치 생성 중입니다",
        5: "결과 검증 및 완료 중입니다"
    };
    return messages[step] || "분석을 시작하고 있습니다";
}

// 다음 단계로 이동
function moveToNextStep(completedStep) {
    console.log(`✅ ${completedStep}단계 완료 - 다음 단계로 이동`);
    
    // 다음 단계 계산
    const nextStep = completedStep + 1;
    
    // 이미 더 높은 단계에 있다면 후퇴하지 않음
    if (nextStep <= currentStep && completedStep < 3) {
        return;
    }
    
    // 3단계 완료 후 분석 완료 처리
    if (completedStep >= 3) {
        // 이미 완료 상태라면 중복 처리 방지
        if (currentStep >= 5) {
            return;
        }
        
        console.log('📊 3단계 완료 - 분석 완료 처리');
        currentStep = 5;  // 완료 상태
        
        // 100% 및 완료 메시지 표시
        updateProgress(100, 5);
        document.getElementById('progressText').innerHTML = '분석이 완료되었습니다!';
        
        // 메인 아이콘을 완료 상태로 변경
        updateMainIconToCompleted();
        
        // 모든 단계 아이콘을 성공 상태로 업데이트
        updateAllStepIconsToSuccess();
        
        // 분석 결과 적용 버튼 활성화
        showResultButton();
        
        // 상세 패널이 열려있다면 동기화
        if (detailPanelOpen) {
            refreshDetailTimeline();
            syncDetailProgressCard();
        }
        
        return;
    }
    
    // 현재 단계 업데이트
    currentStep = nextStep;
    
    // 진행률 및 메시지 업데이트
    let progress;
    switch(nextStep) {
        case 2:
            progress = 50;
            break;
        case 3:
            progress = 75;
            break;
        default:
            progress = progressValue;
    }
    
    console.log(`📊 다음 단계로 이동: ${nextStep}단계 (${progress}%)`);
    
    // UI 업데이트
    updateProgress(progress, nextStep);
    document.getElementById('progressText').innerHTML = getAnimatedMessage(nextStep);
    
    // 상세 패널이 열려있다면 타임라인 및 메시지 동기화
    if (detailPanelOpen) {
        refreshDetailTimeline();
        syncDetailProgressCard();
    }
}

// 점 애니메이션이 적용된 메시지 생성
function getAnimatedMessage(step) {
    const baseMessage = getCurrentStepMessage(step);
    return `<span class="dots-animation">${baseMessage}</span>`;
}

// Progress Bar 업데이트 함수
function updateProgressBar(percentage) {
    console.log('🎨 updateProgressBar 호출:', percentage + '%');
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
        console.log('🎨 progressFill width 설정:', percentage + '%');
        
        // 진행률에 따른 색상 변경
        if (percentage <= 25) {
            progressFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
        } else if (percentage <= 50) {
            progressFill.style.background = 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)';
        } else if (percentage <= 75) {
            progressFill.style.background = 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';
        }
    }
}

// 현재 진행 바의 퍼센트를 가져오는 함수
function getCurrentProgressPercentage() {
    const progressElement = document.getElementById('progressPercentage');
    if (progressElement) {
        const text = progressElement.textContent;
        const match = text.match(/(\d+)%/);
        return match ? parseInt(match[1]) : 0;
    }
    return 0;
}

// 3단계 분석 중 현재 진행률에서 95%까지의 애니메이션 함수
function animateProgressTo95() {
    let currentProgress = getCurrentProgressPercentage();
    
    // 애니메이션 진행 중인지 확인하는 플래그
    if (window.progressTo95AnimationInProgress) {
        return; // 이미 애니메이션이 진행 중이면 중복 실행 방지
    }
    
    window.progressTo95AnimationInProgress = true;
    
    const animateStep = () => {
        if (currentProgress < 95) {
            // 75%부터 95%까지 5%씩 증가
            currentProgress += 5;
        } else {
            // 95% 도달 - 여기서 멈춤
            currentProgress = 95;
            document.getElementById('progressPercentage').textContent = '95%';
            updateProgressBar(95);
            
            if (detailPanelOpen) {
                const dp = document.getElementById('detailProgressPercentage');
                if (dp) dp.textContent = '95%';
            }
            
            window.progressTo95AnimationInProgress = false;
            return;
        }
        
        // UI 업데이트
        document.getElementById('progressPercentage').textContent = currentProgress + '%';
        updateProgressBar(currentProgress);
        
        if (detailPanelOpen) {
            const dp = document.getElementById('detailProgressPercentage');
            if (dp) dp.textContent = currentProgress + '%';
        }
        
        // 다음 단계로 진행
        setTimeout(animateStep, 50);
    };
    
    // 애니메이션 시작
    animateStep();
}

// 분석 완료 시 현재 진행률에서 100%까지의 애니메이션 함수
function animateCompletionProgress() {
    let currentProgress = getCurrentProgressPercentage();
    
    // 애니메이션 진행 중인지 확인하는 플래그
    if (window.progressAnimationInProgress) {
        return; // 이미 애니메이션이 진행 중이면 중복 실행 방지
    }
    
    window.progressAnimationInProgress = true;
    
    const animateStep = () => {
        if (currentProgress < 100) {
            // 95%부터 100%까지 1%씩 증가
            currentProgress += 5;
        } else {
            // 애니메이션 완료 - 100%로 설정
            currentProgress = 100;
            document.getElementById('progressPercentage').textContent = '100%';
            updateProgressBar(100);
            
            if (detailPanelOpen) {
                const dp = document.getElementById('detailProgressPercentage');
                if (dp) dp.textContent = '100%';
            }
            
            window.progressAnimationInProgress = false;
            return;
        }
        
        // UI 업데이트
        document.getElementById('progressPercentage').textContent = currentProgress + '%';
        updateProgressBar(currentProgress);
        
        if (detailPanelOpen) {
            const dp = document.getElementById('detailProgressPercentage');
            if (dp) dp.textContent = currentProgress + '%';
        }
        
        // 다음 단계로 진행
        setTimeout(animateStep, 200);
    };
    
    // 애니메이션 시작
    animateStep();
}

// 진행률 업데이트 - 서버 값만 사용
function updateProgress(percentage, serverStep = null) {
    // 진행률은 후퇴하지 않도록 보장
    if (typeof percentage === 'number') {
        progressValue = Math.max(progressValue || 0, percentage);
        
        // 일반적인 진행률 업데이트
        document.getElementById('progressPercentage').textContent = progressValue + '%';
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
        
        // 클라이언트 측 단계별 메시지 사용
        document.getElementById('progressText').innerHTML = getAnimatedMessage(currentStep);
        console.log('📝 updateProgress에서 클라이언트 메시지 사용:', getCurrentStepMessage(currentStep));
        
        console.log('단계 변경:', currentStep + '단계로 업데이트');
        if (detailPanelOpen) refreshDetailTimeline();
        if (detailPanelOpen) {
            // 상세 패널에서도 메인 화면과 동일한 메시지 표시
            syncDetailProgressCard();
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
            icon.textContent = ' ';
            title.style.color = '#28a745';
            description.textContent = '완료되었습니다';
        } else if (i === currentStep) {
            // 현재 진행 중인 단계
            if (currentStep === 5) {
                // 5단계는 완료 상태로 표시
                icon.className = 'step-icon completed';
                icon.textContent = ' ';
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
async function handleStatusData(statusData) {
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
            
            // 진행률 업데이트 (단계별 고정값 사용)
            if (serverStep !== null && serverStep !== undefined) {
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
                    case 5:
                        progress = 100;
                        break;
                    default:
                        progress = 0;
                }
                
                // processing.status가 running이면 최소 25%로 설정
                const processingStatus = statusData.processing?.status || statusData.status;
                if (processingStatus === 'running' && progress < 25) {
                    progress = 25;
                    console.log('📊 processing.status가 running이므로 진행률을 25%로 설정');
                }
                
                console.log('📊 단계별 고정 진행률 업데이트:', progress + '%', '단계:', serverStep);
                updateProgress(progress, serverStep);
                updateMainIcon(serverStep);
            } else {
                console.log('⚠️ 서버에서 단계 정보가 불완전함:', {
                    serverStep: serverStep
                });
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

                // 원본 결과 표시
                if (ar.chain1_out && !shownSteps[1]) {
                    await displayStepResult(1, ar.chain1_out);
                    shownSteps[1] = true;
                }
                if (ar.chain2_out && !shownSteps[2]) {
                    await displayStepResult(2, ar.chain2_out);
                    shownSteps[2] = true;
                }
                if (ar.serial_encoder_out && ar.chain3_out && !shownSteps[3]) {
                    // 3단계 결과가 있으면 바로 표시
                    ar.chain3_out = safeJsonParse(ar.chain3_out);
                    if (ar.serial_encoder_out) {
                        ar.chain3_out.placement_code = ar.serial_encoder_out;
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
                if (statusData.serial_encoder_out && statusData.chain3_out && !shownSteps[3]) {
                    // 3단계 결과가 있으면 바로 표시
                    statusData.chain3_out = safeJsonParse(statusData.chain3_out);
                    if (statusData.serial_encoder_out) {
                        statusData.chain3_out.placement_code = statusData.serial_encoder_out;
                    }
                    await displayStepResult(3, statusData.chain3_out);
                    shownSteps[3] = true;
                }
            } catch (e) {
                console.warn('단계별 결과 반영 중 오류:', e);
            }

            // 5단계 완료 시 - 실제 4단계 결과가 도착한 경우에만 완료 처리
            const hasStep4Output = !!(shownSteps[4] || statusData.analysis_result?.serial_encoder_out);
            if (currentStep >= 5 && hasStep4Output) {
                console.log('✅ 5단계 완료 - 분석 완료 처리 (출력 확인됨)');
                updateProgress(100, 5); // 100% 즉시 표시
                document.getElementById('progressText').innerHTML = '분석이 완료되었습니다!';
                
                // 메인 아이콘을 완료 상태로 변경
                updateMainIconToCompleted();
                
                showResultButton(); // 분석 완료 시 버튼 활성화
                // 모든 단계 아이콘을 성공 상태로 업데이트
                updateAllStepIconsToSuccess();
                // 상세 패널이 열려있다면 메시지 동기화
                if (detailPanelOpen) {
                    syncDetailProgressCard();
                }
            } else if (currentStep >= 5 && !hasStep4Output) {
                doneWaitCount = (doneWaitCount || 0) + 1;
                console.log(`⏳ 5단계 신호 수신, 그러나 step4 출력 미도착 → 완료 처리 보류 (시도 ${doneWaitCount})`);
                // 안전장치: 일정 횟수(예: 5회) 이상 대기 시 완료로 간주
                if (doneWaitCount >= 5) {
                    console.log('⚠️ 최종 출력 미도착 타임아웃 → 완료로 간주하고 종료');
                    document.getElementById('progressText').innerHTML = '분석이 완료되었습니다!';
                    updateProgress(100, 5); // 100% 즉시 표시
                    
                    // 메인 아이콘을 완료 상태로 변경
                    updateMainIconToCompleted();
                    
                    showResultButton(); // 분석 완료 시 버튼 활성화
                    // 모든 단계 아이콘을 성공 상태로 업데이트
                    updateAllStepIconsToSuccess();
                    // 상세 패널이 열려있다면 메시지 동기화
                    if (detailPanelOpen) {
                        syncDetailProgressCard();
                    }
                }
            }
            
            // 상태에 따른 처리
            const status = statusData.status || statusData.system?.status;
            if (status === 'done') {
                const hasFinal = !!(statusData.serial_encoder_out || statusData.analysis_result?.serial_encoder_out);
                if (hasFinal) {
                    console.log('분석 완료! (최종 출력 확인)');
                    document.getElementById('progressText').innerHTML = '분석이 완료되었습니다!';
                    
                    // 메인 아이콘을 완료 상태로 변경
                    updateMainIconToCompleted();
                    
                    showResultButton(); // 분석 완료 시 버튼 활성화
                    // 모든 단계 아이콘을 성공 상태로 업데이트
                    updateAllStepIconsToSuccess();
                    // 상세 패널이 열려있다면 메시지 동기화
                    if (detailPanelOpen) {
                        syncDetailProgressCard();
                    }
                } else {
                    doneWaitCount = (doneWaitCount || 0) + 1;
                    console.log(`분석 완료 신호 수신, 그러나 최종 출력 미도착 → 폴링 유지 (시도 ${doneWaitCount})`);
                }
            } else if (status === 'error') {
                console.log('분석 오류 발생');
                document.getElementById('progressText').innerHTML = '분석 중 오류가 발생했습니다.';
                // 현재 진행 중인 단계 아이콘을 오류 상태로 업데이트
                updateCurrentStepIconToError();
            }
        }
    } catch (error) {
        console.error('상태 처리 오류:', error);
    }
}

// 결과 확인 버튼 표시
function showResultButton() {
    const button = document.getElementById('resultCheckButton');
    button.disabled = false; // 분석 완료 시 버튼 활성화
}

// 결과 확인 버튼 비활성화
function disableResultButton() {
    const button = document.getElementById('resultCheckButton');
    button.disabled = true;
}

// 분석 결과 적용하기 버튼 클릭
function applyAnalysisResult() {
    const button = document.getElementById('resultCheckButton');
    
    // 버튼이 비활성화된 경우 처리
    if (button.disabled) {
        return;
    }
    
    showHardwareConfirmModal();
}

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
        
        // 아이콘 상태 업데이트
        updateStepIcon(n);
    });
}

// 단계별 아이콘 상태 업데이트
function updateStepIcon(stepNumber) {
    const iconElement = document.getElementById(`step${stepNumber}-icon`);
    if (!iconElement) return;
    
    // 기존 클래스 제거
    iconElement.classList.remove('info', 'warning', 'success', 'error');
    
    // 분석 완료 시 (currentStep >= 5) 모든 아이콘을 성공으로 표시
    if (currentStep >= 5 || currentStep > stepNumber) {
        // 완료된 단계 - 성공 아이콘 (초록색 체크)
        iconElement.classList.add('success');
        iconElement.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#228738"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
            </svg>
        `;
    } else if (currentStep === stepNumber) {
        // 현재 진행 중인 단계 - 로딩 스피너
        iconElement.classList.add('warning');
        iconElement.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8.5" stroke="#D9D9D9" stroke-width="2" fill="none"/>
                <circle cx="10" cy="10" r="8.5" stroke="#3B82F6" stroke-width="2" fill="none" 
                        stroke-dasharray="28.57" stroke-dashoffset="9.42" stroke-linecap="round"/>
            </svg>
        `;
    } else {
        // 대기 중인 단계 - 참고 정보 아이콘 (파란색 i)
        iconElement.classList.add('info');
        iconElement.innerHTML = `
            <svg width="18" height="20" viewBox="0 0 18 20" fill="#b7bcc6" xmlns="http://www.w3.org/2000/svg">
                <path fill="#b7bcc6" clip-rule="evenodd" d="M3.44141 6.52374C4.50762 6.86303 5.28 7.86127 5.28 9.0399C5.28 10.2185 4.50762 11.2168 3.44141 11.5561L3.44141 19.2002C3.44141 19.642 3.08323 20.0002 2.64141 20.0002C2.19958 20.0002 1.84141 19.642 1.84141 19.2002L1.84141 11.557C0.773737 11.2185 0 10.2196 0 9.0399C0 7.86023 0.773737 6.86128 1.84141 6.52284L1.84141 0.8C1.84141 0.358172 2.19958 0 2.64141 0C3.08323 0 3.44141 0.358172 3.44141 0.8V6.52374ZM2.64 10.0799C2.06562 10.0799 1.6 9.61428 1.6 9.0399C1.6 8.46553 2.06562 7.9999 2.64 7.9999C3.21438 7.9999 3.68 8.46553 3.68 9.0399C3.68 9.61428 3.21438 10.0799 2.64 10.0799Z" fill="#33363D"/>
                <path fill="#b7bcc6" clip-rule="evenodd" d="M7.8414 19.2002L7.84141 15.1571C6.77374 14.8186 6 13.8197 6 12.64C6 11.4603 6.77374 10.4614 7.84141 10.1229V0.8C7.84141 0.358172 8.19958 0 8.64141 0C9.08323 0 9.44141 0.358172 9.44141 0.8L9.44141 10.1238C10.5076 10.4631 11.28 11.4614 11.28 12.64C11.28 13.8186 10.5076 14.8169 9.44141 15.1562V19.2002C9.44141 19.642 9.08323 20.0002 8.64141 20.0002C8.19958 20.0002 7.8414 19.642 7.8414 19.2002ZM7.6 12.64C7.6 13.2144 8.06562 13.68 8.64 13.68C9.21438 13.68 9.68 13.2144 9.68 12.64C9.68 12.0656 9.21438 11.6 8.64 11.6C8.06562 11.6 7.6 12.0656 7.6 12.64Z" fill="#33363D"/>
                <path fill="#b7bcc6" clip-rule="evenodd" d="M13.8414 4.12294V0.8C13.8414 0.358172 14.1996 0 14.6414 0C15.0832 0 15.4414 0.358172 15.4414 0.8V4.12383C16.5076 4.46313 17.28 5.46137 17.28 6.64C17.28 7.81863 16.5076 8.81687 15.4414 9.15617L15.4414 19.2002C15.4414 19.642 15.0832 20.0002 14.6414 20.0002C14.1996 20.0002 13.8414 19.642 13.8414 19.2002V9.15706C12.7737 8.81862 12 7.81967 12 6.64C12 5.46033 12.7737 4.46138 13.8414 4.12294ZM14.64 7.68C14.0656 7.68 13.6 7.21438 13.6 6.64C13.6 6.06562 14.0656 5.6 14.64 5.6C15.2144 5.6 15.68 6.06562 15.68 6.64C15.68 7.21438 15.2144 7.68 14.64 7.68Z" fill="#33363D"/>
            </svg>
        `;
    }
}

// 상세 진행 카드(퍼센트/텍스트) 동기화
function syncDetailProgressCard() {
    const dp = document.getElementById('detailProgressPercentage');
    const dt = document.getElementById('detailProgressText');
    const p = document.getElementById('progressPercentage');
    const t = document.getElementById('progressText');
    if (dp && dt && p && t) {
        dp.textContent = p.textContent;
        // 메인 화면과 동일한 메시지로 설정
        dt.innerHTML = t.innerHTML;
    }
}

// 단계별 분석 결과 업데이트
async function updateStepResults(resultData) {
    console.log('updateStepResults 호출됨:', resultData);
    
    // 1단계: 사용자 입력 분석 결과
    if (resultData.chain1_out) {
        console.log('1단계 결과 발견:', resultData.chain1_out);
        await displayStepResult(1, resultData.chain1_out);
    }   
    
    // 2단계: 최적 배치 생성 결과
    if (resultData.chain2_out) {
        console.log('2단계 결과 발견:', resultData.chain2_out);
        await displayStepResult(2, resultData.chain2_out);
    }
    
    // 3단계: 시트 동작 계획 결과 (serial_encoder_out 없이도 표시)
    if (resultData.chain3_out) {
        console.log('3단계 결과 발견:', resultData.chain3_out);
        resultData.chain3_out = safeJsonParse(resultData.chain3_out);
        if (resultData.serial_encoder_out) {
            console.log('4단계 결과 발견:', resultData.serial_encoder_out);
            resultData.chain3_out.placement_code = resultData.serial_encoder_out;
        }
        await displayStepResult(3, resultData.chain3_out);
    }
}

// 가공된 결과를 화면에 표시 (displayStepResult와 동일하게 처리)
async function displayProcessedStepResult(stepNumber, resultData) {
    console.log(`🎯 displayProcessedStepResult 호출됨: 단계 ${stepNumber}, 데이터:`, resultData);
    // displayStepResult와 동일하게 처리
    await displayStepResult(stepNumber, resultData);
}

// 가공된 단계별 분석 결과 업데이트
async function updateProcessedStepResults(processedResults) {
    console.log('updateProcessedStepResults 호출됨:', processedResults);
    
    // 1단계: 사용자 입력 분석 결과
    if (processedResults.chain1_out) {
        console.log('가공된 1단계 결과 발견:', processedResults.chain1_out);
        await displayProcessedStepResult(1, processedResults.chain1_out);
    }
    
    // 2단계: 최적 배치 생성 결과
    if (processedResults.chain2_out) {
        console.log('가공된 2단계 결과 발견:', processedResults.chain2_out);
        await displayProcessedStepResult(2, processedResults.chain2_out);
    }
    
    // 3단계: 시트 동작 계획 결과
    if (processedResults.chain3_out) {
        console.log('가공된 3단계 결과 발견:', processedResults.chain3_out);
        await displayProcessedStepResult(3, processedResults.chain3_out);
    }
    
    // 4단계: 최적 배치 생성 결과
    if (processedResults.serial_encoder_out) {
        console.log('가공된 4단계 결과 발견:', processedResults.serial_encoder_out);
        await displayProcessedStepResult(4, processedResults.serial_encoder_out);
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
async function displayStepResult(stepNumber, resultData) {
    console.log(`🎯 displayStepResult 호출됨: 단계 ${stepNumber}, 데이터:`, resultData);
    
    
    const accordionItemButton = document.querySelector(`#accordionItem0${stepNumber} button`);
    const accordionItemBody = document.querySelector(`#accordionItem0${stepNumber} .accordion-body`);
    const accordionItemSpan = document.querySelector(`#accordionItem0${stepNumber} button span`);


    // 이전 데이터 클리어
    accordionItemBody.innerHTML = '';
    
    // 결과 데이터 포맷팅
    const formattedResult = await formatStepResult(stepNumber, resultData);
    console.log(`🎯 포맷된 결과:`, formattedResult);

    accordionItemBody.innerHTML = formattedResult;
    accordionItemButton.disabled = false;
    accordionItemSpan.style.color = '#000000';

    
    console.log(`가공된 단계 ${stepNumber} 결과 표시 완료`);
    
    // 현재 단계 완료 후 다음 단계로 진행
    moveToNextStep(stepNumber);
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

// 단계별 결과 데이터 포맷팅
async function formatStepResult(stepNumber, resultData) {
    console.log(`🔧 formatStepResult 호출됨: 단계 ${stepNumber}, 데이터 타입: ${typeof resultData}`);
    try {
        let formattedResult = '';
        
        switch(stepNumber) {
            case 1: // 사용자 입력 분석
                console.log(`🔧 1단계 데이터 파싱 시도:`, resultData);
                const chain1Data = (function(){
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();
                console.log(`🔧 1단계 파싱 완료:`, chain1Data);

                let luggageTableRows = '';
                
                // object별 갯수 세기
                const objectCounts = {};
                for (let luggage in chain1Data.luggage_details) {
                    const object = chain1Data.luggage_details[luggage].object;
                    objectCounts[object] = (objectCounts[object] || 0) + 1;
                }
                
                // object별 갯수와 함께 표시
                for (let object in objectCounts) {
                    luggageTableRows += `<li>${object} (${objectCounts[object]}개)</li>
                    `;
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
                    <div class="image-container"><img src="${imagePath}" alt="짐 상세 정보" class="analysis-image"></div>
                    <p>👥 인원 수: ${chain1Data.people || 0}명</p>
                    <p>🧳 총 짐 개수: ${chain1Data.total_luggage_count || 0}개</p>
                    ${luggageTableRows ? `<p>📋 짐 상세 정보</p>
                    <ul style="list-style-type: disc; margin-left: 30px;">${luggageTableRows}</ul>` : ''}
                `;
                break;
                
            case 2: // 최적 배치 생성
                const chain2Data = (function(){
                    const parsed = safeJsonParse(resultData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();

                // chain2의 optionNo 저장
                optionNo = chain2Data.option_no ? chain2Data.option_no : -1;

                // formattedResult = `
                //     <p>🪑 좌석 배치 지시사항</p>
                // `;
                // let seatsTableRows = '';
                // for (let seat in chain2Data.instruction.seats) {
                //     let seatDataArray = chain2Data.instruction.seats[seat];
                //     let tableSeatData = '';
                //     seatDataArray.forEach(data => {
                //         tableSeatData += `<td>${data}</td>`;
                //     });
                //     seatsTableRows += `<tr>${tableSeatData}</tr>`;
                // }

                formattedResult += `<div class="image-container">
                    <img src="/static/images/optimum_arrangement_options/${optionNo}.png" alt="최적 배치 생성" class="analysis-image">
                </div>`;
                break;
                
            case 3: // 시트 동작 계획
                const cleanData = (typeof resultData === 'string') ? resultData.replace(/```json\s*|```/g, '') : resultData;
                const chain3Data = (function(){
                    const parsed = safeJsonParse(cleanData);
                    return parsed && typeof parsed === 'object' ? parsed : {};
                })();

                formattedResult = `
                    <div class="image-container">
                    <img src="/static/images/operation_plan_options/${optionNo}.jpg" alt="시트 동작 계획" class="analysis-image"></div>
                `;
                break;
                
            default:
                formattedResult = `<pre>${resultData}</pre>`;
        }
        
        return `<div class="analysis-result-container">${formattedResult}</div>`;
        
    } catch (error) {
        console.error(`단계 ${stepNumber} 결과 포맷팅 오류:`, error);
        return `<p>데이터 파싱 오류: ${error.message}</p><pre>${resultData}</pre>`;
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
            image_path: 'default_image_path',
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
                image_path: analysisData.image_path,
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
                image_path: analysisData.image_path,
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
            
            // 1단계 메시지 사용
            document.getElementById('progressText').innerHTML = getAnimatedMessage(1);
            console.log('📝 분석 시작, 1단계 메시지 사용:', getCurrentStepMessage(1));
        } else {
            console.error('분석 시작 실패:', result.message);
            // 오류 메시지 표시
            document.getElementById('progressText').textContent = '분석 시작에 실패했습니다: ' + result.message;
        }
    } catch (error) {
        console.error('분석 시작 오류:', error);
        document.getElementById('progressText').innerHTML = '분석 시작 중 오류가 발생했습니다: ' + error.message;
    }
}

function initializeAccordions() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        item.classList.remove('active');
    });
}

// 초기 아이콘 상태 설정
function initializeStepIcons() {
    // 1단계는 진행 중으로, 나머지는 대기 중으로 설정
    for (let i = 1; i <= 4; i++) {
        updateStepIcon(i);
    }
}

// 모든 단계 아이콘을 성공 상태로 업데이트
function updateAllStepIconsToSuccess() {
    for (let i = 1; i <= 4; i++) {
        const iconElement = document.getElementById(`step${i}-icon`);
        if (iconElement) {
            iconElement.classList.remove('info', 'warning', 'error');
            iconElement.classList.add('success');
            iconElement.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#228738"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
                </svg>
            `;
        }
    }
}

// 현재 진행 중인 단계 아이콘을 오류 상태로 업데이트
function updateCurrentStepIconToError() {
    if (currentStep >= 1 && currentStep <= 4) {
        const iconElement = document.getElementById(`step${currentStep}-icon`);
        if (iconElement) {
            iconElement.classList.remove('info', 'warning', 'success');
            iconElement.classList.add('error');
            iconElement.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#DC2626"/>
                    <path d="M13.5 6.5L6.5 13.5M6.5 6.5L13.5 13.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    currentScenario = getScenarioFromURL();
    console.log('시나리오:', currentScenario);
    
    console.log('[진입] Progress 페이지 진입');
    
    // 클라이언트 측 상태 강제 초기화
    currentStep = 1;  // 1단계부터 시작
    progressValue = 0;  // 0%부터 시작
    doneWaitCount = 0;

    // 초기 상태 설정 (25%로 시작)
    updateProgress(25, 1);
    // updateStepDisplay();
    
    // 초기 메시지 설정
    document.getElementById('progressText').innerHTML = getAnimatedMessage(1);
    
    // 초기에는 버튼 비활성화
    disableResultButton();
    
    // 분석 시작
    startAnalysis();
    
    // 아코디언 초기화
    initializeAccordions();
    
    // 초기 아이콘 상태 설정
    initializeStepIcons();
    
    // SSE 시작
    await startSSE();
});

// SSE 시작 함수 (재사용을 위해 분리)
async function startSSE() {
    try {
        if (eventSource) {
            eventSource.close();
        }
        eventSource = new EventSource('/desktop/api/status_stream');
        eventSource.onmessage = async (e) => {
            try {
                const payload = JSON.parse(e.data);
                // 연결 이벤트는 건너뜀
                if (payload && payload.event === 'connected') return;
                
                // 하드웨어 제어 이벤트 처리
                if (payload.event && payload.event.startsWith('hardware_')) {
                    handleHardwareEvent(payload);
                    return;
                }
                
                await handleStatusData(payload);
                const status = payload.status || payload.system?.status;
                const hasFinal = !!(payload.serial_encoder_out || payload.analysis_result?.serial_encoder_out);
                if (status === 'done' && hasFinal) {
                    document.getElementById('progressText').innerHTML = '분석이 완료되었습니다!';
                    
                    // 메인 아이콘을 완료 상태로 변경
                    updateMainIconToCompleted();
                    
                    showResultButton(); // 분석 완료 시 버튼 활성화
                    // 상세 패널이 열려있다면 메시지 동기화
                    if (detailPanelOpen) {
                        syncDetailProgressCard();
                    }
                    eventSource.close();
                } else if (status === 'error') {
                    document.getElementById('progressText').innerHTML = '분석 중 오류가 발생했습니다.';
                    eventSource.close();
                } else if (status === 'cancelled') {
                    document.getElementById('progressText').innerHTML = '분석이 중지되었습니다.';
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
}

// 분석 중지 함수 (재사용)
function stopAnalysisOnExit() {
    console.log('[이탈] Progress 페이지 이탈 감지 - 분석 중지 요청');
    
    // SSE 연결 즉시 종료
    if (eventSource) {
        console.log('[이탈] SSE 연결 종료');
        eventSource.close();
        eventSource = null;
    }

    
    // 분석 중지 요청 (동기적으로 처리)
    fetch('/desktop/api/reset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        keepalive: true
    }).then(response => {
        if (response.ok) {
            console.log('[이탈] 분석 중지 완료');
        }
    }).catch(error => {
        console.warn('[이탈] 분석 중지 요청 실패:', error);
    });

    // 클라이언트 상태 초기화
    currentStep = 0;
    progressValue = 0;
    doneWaitCount = 0;
}

// 페이지 이탈 시 분석 중지 (여러 이벤트로 확실하게)
window.addEventListener('beforeunload', function(e) {
    // 사용자에게 확인 메시지 표시
    const message = '분석이 진행 중입니다. 페이지를 떠나시겠습니까?';
    e.returnValue = message;
    return message;
});

// 페이지가 실제로 언로드될 때 분석 중지 (사용자가 "나가기"를 선택했을 때)
window.addEventListener('unload', function(e) {
    console.log('[이탈] 페이지 언로드 감지 - 분석 중지');
    stopAnalysisOnExit();
});

// 페이지 완전 종료 시 분석 중지
window.addEventListener('pagehide', function() {
    console.log('[이탈] 페이지 종료 감지 - 분석 중지');
    stopAnalysisOnExit();
});

/**
 * 메인 아이콘을 현재 스텝에 맞게 업데이트
 * @param {number} step - 현재 진행 중인 스텝 (1, 2, 3, 4, 5)
 */
function updateMainIcon(step) {
    const mainIcon = document.getElementById('mainIcon');
    if (!mainIcon) {
        console.warn('⚠️ 메인 아이콘 요소를 찾을 수 없습니다.');
        return;
    }

    // 기존 스텝 클래스 제거
    mainIcon.classList.remove('step1', 'step2', 'step3', 'step4', 'step5');

    // 현재 스텝에 맞는 클래스 추가
    if (step >= 1 && step <= 5) {
        mainIcon.classList.add(`step${step}`);
        console.log(`🎯 메인 아이콘 업데이트: 스텝 ${step} 아이콘으로 변경`);
    } else {
        console.log('🎯 메인 아이콘: 기본 차량 아이콘 유지');
    }
}

/**
 * 메인 아이콘을 완료 상태(체크 표시)로 업데이트
 */
function updateMainIconToCompleted() {
    const mainIcon = document.getElementById('mainIcon');
    if (!mainIcon) {
        console.warn('⚠️ 메인 아이콘 요소를 찾을 수 없습니다.');
        return;
    }

    // 기존 스텝 클래스 제거
    mainIcon.classList.remove('step1', 'step2', 'step3', 'step4', 'step5');
    
    // 완료 상태 클래스 추가
    mainIcon.classList.add('completed');
    
    console.log('✅ 메인 아이콘을 완료 상태(체크 표시)로 변경');
}

// 페이지 네비게이션 함수들
function navigateToHome() {
    window.location.href = '/mobile/home';
}