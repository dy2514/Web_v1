/* 탑승 인원 선택 */
const chips = document.querySelectorAll('.chip');
let seatSelection = null;
chips.forEach(ch => {
    ch.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        ch.classList.add('selected');
        seatSelection = ch.dataset.seats;
    });
});

/* 파일/업로드/미리보기 */
const photo = document.querySelector('#photo');
const submit = document.querySelector('#submit');
const notice = document.querySelector('#notice');
const preview = document.querySelector('#photo-preview');
const btnPhotoIn = document.querySelector('#btnPhotoIn');
const photoBox = document.querySelector('.photo-box');
const sheet = document.getElementById('photoSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetNoIssue = document.getElementById('sheetNoIssue');
const sheetGallery = document.getElementById('sheetGallery');
const sheetCamera = document.getElementById('sheetCamera');

let previewURL = null;
let currentScenario = null;
let pollTimer = null;

function showNotice(msg) {
    notice.textContent = msg;
    notice.classList.remove('show');
    void notice.offsetWidth;
    notice.classList.add('show');
}

// 진행률 표시 관련 변수
let progressInterval = null;
let currentStep = 0;
let progressValue = 0;

// 진행률 표시 시작
function startProgressDisplay() {
    const progressContainer = document.getElementById('progressContainer');
    progressContainer.classList.add('show');

    // 진행률 초기화
    currentStep = 0;
    progressValue = 0;
    updateProgressBar(0);
    updateStepDisplay();
}

// 진행률 바 업데이트
function updateProgressBar(percentage) {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercentage = document.getElementById('progressPercentage');
    progressBarFill.style.width = percentage + '%';
    progressPercentage.textContent = Math.round(percentage) + '%';
}

// 단계 표시 업데이트
function updateStepDisplay() {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        const icon = step.querySelector('.step-icon');
        const text = step.querySelector('.step-text');

        if (i < currentStep) {
            icon.className = 'step-icon completed';
            icon.textContent = '✓';
            text.className = 'step-text completed';
        } else if (i === currentStep) {
            icon.className = 'step-icon active';
            icon.textContent = i;
            text.className = 'step-text active';
        } else {
            icon.className = 'step-icon pending';
            icon.textContent = i;
            text.className = 'step-text';
        }
    }
}


// 결과 표시 (시뮬 또는 서버 데이터)
function showResult() {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.classList.add('show');

    let totalItems = 0;
    let utilizationRate = 0;
    let arrangementTime = 0;
    let efficiencyScore = 0;

    if (window.serverResultData) {
        if (window.serverResultData.chain1_out) {
            try {
                const chain1Data = JSON.parse(window.serverResultData.chain1_out);
                totalItems = chain1Data.total_luggage_count || 0;
            } catch (e) { /* noop */ }
        }
        if (totalItems === 0 && window.serverResultData.chain4_out) {
            const code = window.serverResultData.chain4_out.trim();
            totalItems = code.length > 0 ? code.split('').filter(c => c !== '0').length : 0;
        }
    }

    if (totalItems === 0) totalItems = 1;

    utilizationRate = Math.min(100, Math.max(70, 70 + totalItems * 5));
    arrangementTime = Math.min(20, Math.max(5, 5 + totalItems * 2));
    efficiencyScore = Math.min(100, Math.max(80, 80 + totalItems * 3));

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('utilizationRate').textContent = utilizationRate + '%';
    document.getElementById('arrangementTime').textContent = arrangementTime + '분';
    document.getElementById('efficiencyScore').textContent = efficiencyScore + '점';
}

function hideConfirmationDialog() {
    const dialog = document.getElementById('confirmationDialog');
    dialog.classList.remove('show');
    const resultCheckButton = document.getElementById('resultCheckButton');
    if (resultCheckButton) resultCheckButton.classList.add('show');
}

function showResultFromButton() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove('show');
    const resultCheckButton = document.getElementById('resultCheckButton');
    if (resultCheckButton) resultCheckButton.classList.remove('show');
    if (window.serverResultData) {
        showResultWithData(window.serverResultData);
    } else {
        showResult();
    }
}

function confirmResult() {
    hideConfirmationDialog();
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove('show');
    const resultCheckButton = document.getElementById('resultCheckButton');
    if (resultCheckButton) resultCheckButton.classList.remove('show');
    if (window.serverResultData) {
        showResultWithData(window.serverResultData);
    } else {
        showResult();
    }
}

function showResultWithData(resultData) {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.classList.add('show');

    let totalItems = 0;
    let utilizationRate = 0;
    let arrangementTime = 0;
    let efficiencyScore = 0;

    if (resultData.chain1_out) {
        try {
            const chain1Data = JSON.parse(resultData.chain1_out);
            totalItems = chain1Data.total_luggage_count || 0;
        } catch (e) { }
    }
    if (totalItems === 0 && resultData.chain4_out) {
        const code = resultData.chain4_out.trim();
        totalItems = code.length > 0 ? code.split('').filter(c => c !== '0').length : 0;
    }

    utilizationRate = Math.min(100, Math.max(70, 70 + totalItems * 5));
    arrangementTime = Math.min(20, Math.max(5, 5 + totalItems * 2));
    efficiencyScore = Math.min(100, Math.max(80, 80 + totalItems * 3));

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('utilizationRate').textContent = utilizationRate + '%';
    document.getElementById('arrangementTime').textContent = arrangementTime + '분';
    document.getElementById('efficiencyScore').textContent = efficiencyScore + '점';

    const resultImage = document.getElementById('resultImage');
    resultImage.src = '/user_input/analysis_result.jpg';
    resultImage.style.display = 'block';
}

function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgressFromServer(serverProgress) {
    progressValue = serverProgress;
    updateProgressBar(progressValue);
    const step = Math.min(5, Math.max(1, Math.ceil(serverProgress / 20)));
    if (step > currentStep) {
        currentStep = step;
        updateStepDisplay();
    }
}

function showErrorState(errorMessage) {
    stopProgress();
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove('show');
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
        <div class="error-header">
            <h3 class="error-title">❌ 분석 실패</h3>
            <p class="error-message">${errorMessage}</p>
        </div>
        <div class="error-actions">
            <button class="error-btn primary" onclick="retryAnalysis()">다시 시도</button>
            <button class="error-btn secondary" onclick="hideErrorState()">닫기</button>
        </div>
    `;
    const existingError = document.querySelector('.error-container');
    if (existingError) existingError.remove();
    const main = document.querySelector('main');
    main.appendChild(errorContainer);
}

function hideErrorState() {
    const errorContainer = document.querySelector('.error-container');
    if (errorContainer) errorContainer.remove();
}

function retryAnalysis() {
    hideErrorState();
    hideFailureDialog();
    startStepAnalysis();
}

function showFailureDialog(errorMessage) {
    const dialog = document.getElementById('failureDialog');
    const messageElement = document.getElementById('failureMessage');
    if (messageElement) messageElement.textContent = errorMessage || '분석 중 오류가 발생했습니다.';
    dialog.classList.add('show');
}

function hideFailureDialog() {
    const dialog = document.getElementById('failureDialog');
    dialog.classList.remove('show');
}

/* 촬영 → 미리보기 → 자동 업로드 */
photo.addEventListener('change', async () => {
    if (!photo.files.length) return;

    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(photo.files[0]);
    preview.src = previewURL;
    preview.style.display = 'block';

    try {
        const fd = new FormData();
        fd.append('photo', photo.files[0]);
        if (seatSelection !== null) fd.append('people', seatSelection);

        const r = await fetch('/mobile/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!d.success) { alert('업로드 실패'); return; }
        currentScenario = d.data.scenario;
        btnPhotoIn.style.display = 'none';
        showNotice('사진이 업로드 되었습니다!');
        closePhotoSheet();
        submit.disabled = false;
        submit.classList.add('active');
    } catch (e) {
        console.error('네트워크 오류:', e);
        alert('네트워크 오류');
    }
});

/* Bottom sheet open/close */
function openPhotoSheet() {
    if (!sheet || !sheetOverlay) return;
    sheet.classList.add('show');
    sheetOverlay.classList.add('show');
    sheet.setAttribute('aria-hidden', 'false');
    sheetOverlay.setAttribute('aria-hidden', 'false');
}

function closePhotoSheet() {
    if (!sheet || !sheetOverlay) return;
    sheet.classList.remove('show');
    sheetOverlay.classList.remove('show');
    sheet.setAttribute('aria-hidden', 'true');
    sheetOverlay.setAttribute('aria-hidden', 'true');
}

if (btnPhotoIn) {
    btnPhotoIn.addEventListener('click', (e) => {
        e.preventDefault(); // 기본 동작 방지
        openPhotoSheet(); // 설명 모달 열기
    });
}

if (photoBox) {
    photoBox.addEventListener('click', (e) => {
        // btnPhotoIn이 아닌 경우에만 모달 열기
        if (e.target !== btnPhotoIn) {
            openPhotoSheet();
        }
    });
}
if (sheetOverlay) {
    sheetOverlay.addEventListener('click', () => { closePhotoSheet(); });
}
if (sheetNoIssue) {
    sheetNoIssue.addEventListener('click', () => { closePhotoSheet(); });
}
if (sheetGallery) {
    sheetGallery.addEventListener('click', () => {
        closePhotoSheet();
        // 갤러리에서 선택 (capture 속성 제거)
        const photoInput = document.getElementById('photo');
        photoInput.removeAttribute('capture');
        photoInput.click();
    });
}

if (sheetCamera) {
    sheetCamera.addEventListener('click', () => {
        closePhotoSheet();
        // 카메라로 촬영 (capture 속성 추가)
        const photoInput = document.getElementById('photo');
        photoInput.setAttribute('capture', 'environment');
        photoInput.click();
    });
}

/* CTA → HTTP 통신 (간소화) */
submit.addEventListener('click', async () => {
    if (!currentScenario) return;
    hideAllResultElements();
    showNotice('최적의 차량 배치 설계를 시작합니다!');

    let imageDataUrl = 'default_image';
    if (previewURL && previewURL.startsWith('blob:')) {
        try {
            const response = await fetch(previewURL);
            const blob = await response.blob();
            const reader = new FileReader();
            imageDataUrl = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (error) { console.error('이미지 변환 오류:', error); }
    } else if (previewURL) {
        imageDataUrl = previewURL;
    }

    const analysisData = {
        scenario: currentScenario,
        people_count: seatSelection || 4,
        image_data_url: imageDataUrl
    };

    console.log('분석 데이터 저장:', {
        scenario: analysisData.scenario,
        people_count: analysisData.people_count,
        image_data_url: (analysisData.image_data_url || '').toString().substring(0, 50) + '...'
    });

    sessionStorage.setItem('analysisData', JSON.stringify(analysisData));
    window.location.href = `/mobile/progress?scenario=${encodeURIComponent(currentScenario)}`;
});

function hideAllResultElements() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove('show');
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.classList.remove('show');
    const confirmationDialog = document.getElementById('confirmationDialog');
    if (confirmationDialog) confirmationDialog.classList.remove('show');
    const failureDialog = document.getElementById('failureDialog');
    if (failureDialog) failureDialog.classList.remove('show');
    const resultCheckButton = document.getElementById('resultCheckButton');
    if (resultCheckButton) resultCheckButton.classList.remove('show');
    hideErrorState();
    window.serverResultData = null;
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

async function convertBlobToBase64(blobUrl) {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Blob to Base64 변환 오류:', error);
        throw error;
    }
}

async function startStepAnalysis() {
    try {
        hideAllResultElements();
        startProgressDisplay();
        let imageDataUrl = preview.src;
        if (imageDataUrl.startsWith('blob:')) {
            imageDataUrl = await convertBlobToBase64(imageDataUrl);
        }
        const response = await fetch('/desktop/api/step_analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                people_count: seatSelection || 0,
                image_data_url: imageDataUrl,
                scenario: currentScenario
            })
        });
        const result = await response.json();
        if (result.success) {
            window.location.href = '/mobile/progress?scenario=' + encodeURIComponent(currentScenario);
        } else {
            throw new Error(result.error || '분석 시작 실패');
        }
    } catch (error) {
        console.error('단계별 분석 시작 오류:', error);
        stopProgress();
        showFailureDialog('분석 시작 중 오류가 발생했습니다: ' + error.message);
    }
}

// 홈으로 이동
function goToHome() {
    window.location.href = '/mobile/home';
}


