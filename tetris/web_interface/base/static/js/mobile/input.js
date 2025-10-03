const photo = document.querySelector('#photo');
const submit = document.querySelector('#submit');
const preview = document.querySelector('#photo-preview');
const btnPhotoIn = document.querySelector('#btnPhotoIn');

let previewURL = null;
let currentScenario = null;
let imagePath = null;

/* 탑승 인원 선택 */
const chips = document.querySelectorAll('.chip');
let seatSelection = null;
chips.forEach(ch => {
    ch.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        ch.classList.add('selected');
        seatSelection = ch.dataset.seats;

        // 선택 변경 시 초기화 및 숨김 처리
        const container = document.getElementById('photoBoxContainer');
        if (container) { 
            fadeIn(container);
            photo.value = '';
            preview.src = '';
            preview.style.display = 'none';
            btnPhotoIn.style.display = 'block';
            previewURL = null;
            currentScenario = null;
        }
        if (submit) {
            submit.disabled = true;
            submit.classList.remove('active');
            submit.style.display = 'none';
        }
    });
});

/* 파일/업로드/미리보기 */
const notice = document.querySelector('#notice');
const photoBox = document.querySelector('.photo-box');
const sheet = document.getElementById('photoSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetNoIssue = document.getElementById('sheetNoIssue');
const sheetGallery = document.getElementById('sheetGallery');
const sheetCamera = document.getElementById('sheetCamera');

function fadeIn(el, display) {
    if (!el) return;
    const targetDisplay = display || 'block';
    el.style.display = targetDisplay;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity .25s ease, transform .25s ease';
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
}

function fadeOut(el) {
    if (!el) return;
    el.style.transition = 'opacity .2s ease, transform .2s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.addEventListener('transitionend', function handler(e) {
        if (e.propertyName && e.propertyName !== 'opacity') return;
        el.style.display = 'none';
        el.removeEventListener('transitionend', handler);
    }, { once: true });
}

function showNotice(msg) {
    notice.textContent = msg;
    notice.classList.remove('show');
    void notice.offsetWidth;
    notice.classList.add('show');
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
        imagePath = `/uploads/${d.data?.filename}`
        btnPhotoIn.style.display = 'none';
        showNotice('사진이 업로드 되었습니다!');
        closePhotoSheet();
        fadeIn(document.getElementById('submit'));
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
        image_path: imagePath,
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

// 홈으로 이동
function goToHome() {
    window.location.href = '/mobile/home';
}


