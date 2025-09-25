/**
 * TETRIS Control Dashboard - Core Functions
 * 핵심 기능 및 상태 관리
 */

// 전역 변수
let streamActive = false;
let streamSource = null;
let sessionId = null;
let logsPaused = false;
let statusUpdateInterval = null;
let simulationInterval = null;

// QR 코드 로딩
function loadQRCode() {
    const qrImage = document.getElementById('qrCodeImage');
    const qrText = document.getElementById('qrCodeText');
    
    if (qrImage && qrText) {
        qrImage.onload = function() {
            qrText.style.display = 'none';
            qrImage.style.display = 'block';
        };
        
        qrImage.onerror = function() {
            qrText.textContent = 'QR 코드 로딩 실패';
            qrText.style.display = 'block';
            qrImage.style.display = 'none';
        };
        
        const timestamp = new Date().getTime();
        qrImage.src = '/desktop/qr.png?t=' + timestamp;
    }
}

// 통계 색상 업데이트
function updateStatColor(element, value, type) {
    if (!element) return;
    
    element.style.color = value > 80 ? 'var(--color-error)' : 
                         value > 60 ? 'var(--color-warning)' : 
                         'var(--color-success)';
}

// 라즈베리파이 상태 업데이트
function updateRaspberryPiStatus(cpu, memory, session, network) {
    const cpuElement = document.getElementById('cpuStatusValue');
    const memoryElement = document.getElementById('memoryStatusValue');
    const sessionElement = document.getElementById('sessionStatusValue');
    const networkElement = document.getElementById('networkStatusValue');
    
    if (cpuElement) cpuElement.textContent = `${cpu}%`;
    if (memoryElement) memoryElement.textContent = `${memory}%`;
    if (sessionElement) sessionElement.textContent = session;
    if (networkElement) networkElement.textContent = network || '활성';
    
    updateStatColor(cpuElement, cpu, 'cpu');
    updateStatColor(memoryElement, memory, 'memory');
}

// 전역 함수 노출
window.loadQRCode = loadQRCode;
window.updateRaspberryPiStatus = updateRaspberryPiStatus;