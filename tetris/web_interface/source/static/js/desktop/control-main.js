/**
 * TETRIS Control Dashboard - Main Initialization
 * 메인 초기화 및 이벤트 리스너
 */

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('TETRIS Control Dashboard - Initializing...');
    
    // QR 코드 로딩
    loadQRCode();
    
    // 상태 업데이트 시작
    startStatusUpdates();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('TETRIS Control Dashboard - Initialized successfully');
});

// 상태 업데이트 시작
function startStatusUpdates() {
    // 5초마다 상태 업데이트
    statusUpdateInterval = setInterval(fetchStatus, 5000);
    
    // 초기 상태 로드
    fetchStatus();
}

// 상태 정보 가져오기
function fetchStatus() {
    fetch('/desktop/api/status')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                updateStatus(data.data);
            }
        })
        .catch(error => {
            console.error('Status fetch error:', error);
        });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 아코디언 토글 이벤트
    const accordionButtons = document.querySelectorAll('.btn-accordion');
    accordionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('aria-controls');
            const target = document.getElementById(targetId);
            
            if (target) {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !isExpanded);
                target.classList.toggle('show');
                target.setAttribute('aria-hidden', isExpanded);
            }
        });
    });
    
    // 새로고침 버튼 이벤트
    const refreshButton = document.querySelector('[onclick="refreshStatus()"]');
    if (refreshButton) {
        refreshButton.addEventListener('click', function(e) {
            e.preventDefault();
            refreshStatus();
        });
    }
    
    // 초기화 버튼 이벤트
    const resetButton = document.querySelector('[onclick="resetSystem()"]');
    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            resetSystem();
        });
    }
}

// 상태 새로고침
function refreshStatus() {
    console.log('Refreshing status...');
    fetchStatus();
}

// 시스템 초기화
function resetSystem() {
    if (confirm('시스템을 초기화하시겠습니까?')) {
        fetch('/desktop/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('시스템이 초기화되었습니다.');
                location.reload();
            } else {
                alert('초기화에 실패했습니다: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Reset error:', error);
            alert('초기화 중 오류가 발생했습니다.');
        });
    }
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
});

// 전역 함수 노출
window.refreshStatus = refreshStatus;
window.resetSystem = resetSystem;