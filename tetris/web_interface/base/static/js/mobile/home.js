// AI TETRIS 홈화면 JavaScript

// 전역 변수
let notificationModal = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeHome();
    setupEventListeners();
    loadUserPreferences();
});

// 홈화면 초기화
function initializeHome() {
    console.log('AI TETRIS 홈화면 초기화');
    
    // 알림 모달 참조
    notificationModal = document.getElementById('notificationModal');
    
    // 애니메이션 효과 적용
    applyEntranceAnimations();
    
    // 사용자 상태 확인
    checkUserStatus();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 뒤로가기 버튼
    const backButton = document.querySelector('.topbar img');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }
    
    // 알림 버튼
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
    }
    
    // 설정 버튼
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
    
    // 시작하기 버튼
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', startTetris);
    }
    
    // 서비스 바로가기 아이템들
    const shortcutItems = document.querySelectorAll('.shortcut-item');
    shortcutItems.forEach(item => {
        item.addEventListener('click', function() {
            const text = this.querySelector('.shortcut-text').textContent;
            handleShortcutClick(text);
        });
    });
    
    // 네비게이션 아이템들
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const label = this.querySelector('.nav-label').textContent;
            handleNavigationClick(label);
        });
    });
    
    // 모달 오버레이 클릭 시 닫기
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeNotificationModal);
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeNotificationModal();
        }
    });
}

// 애니메이션 효과 적용
function applyEntranceAnimations() {
    const elements = [
        '.vehicle-section',
        '.welcome-section', 
        '.start-section',
        '.service-shortcuts'
    ];
    
    elements.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        }
    });
}

// 사용자 상태 확인
function checkUserStatus() {
    // 세션에서 사용자 정보 확인
    const sessionData = sessionStorage.getItem('userSession');
    if (sessionData) {
        try {
            const user = JSON.parse(sessionData);
            console.log('사용자 세션 확인:', user);
            updateWelcomeMessage(user);
        } catch (e) {
            console.warn('사용자 세션 파싱 오류:', e);
        }
    }
}

// 환영 메시지 업데이트
function updateWelcomeMessage(user) {
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && user.name) {
        welcomeTitle.textContent = `${user.name}님, 현대와 함께 편리한 모빌리티 생활을 시작해보세요`;
    }
}

// 뒤로가기
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // 홈화면이 첫 페이지인 경우 메인 페이지로 이동
        window.location.href = '/';
    }
}

// 알림 표시
function showNotifications() {
    if (notificationModal) {
        notificationModal.classList.add('show');
        notificationModal.style.display = 'flex';
        
        // 알림 데이터 로드
        loadNotifications();
    }
}

// 알림 모달 닫기
function closeNotificationModal() {
    if (notificationModal) {
        notificationModal.classList.remove('show');
        setTimeout(() => {
            notificationModal.style.display = 'none';
        }, 300);
    }
}

// 알림 데이터 로드
function loadNotifications() {
    // 실제 구현에서는 서버에서 알림 데이터를 가져옴
    const notifications = [
        {
            icon: '🔔',
            title: 'AI TETRIS 서비스 시작',
            message: '최적의 차량 배치를 위한 AI 분석 서비스를 시작합니다.',
            time: '방금 전'
        },
        {
            icon: '📱',
            title: '새로운 기능 업데이트',
            message: '더욱 정확한 분석을 위한 AI 모델이 업데이트되었습니다.',
            time: '1시간 전'
        }
    ];
    
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-icon">${notification.icon}</div>
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${notification.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// 설정 표시
function showSettings() {
    // 설정 페이지로 이동하거나 설정 모달 표시
    console.log('설정 페이지로 이동');
    // 실제 구현에서는 설정 페이지로 이동
    alert('설정 기능은 준비 중입니다.');
}

// TETRIS 시작
function startTetris() {
    console.log('AI TETRIS 분석 시작');
    
    // 로딩 상태 표시
    showLoadingState();
    
    // 입력 페이지로 이동
    setTimeout(() => {
        window.location.href = '/mobile/input';
    }, 500);
}

// 로딩 상태 표시
function showLoadingState() {
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        const originalText = startButton.innerHTML;
        startButton.innerHTML = '<span class="loading-spinner"></span> <span class="button-text">시작 중...</span>';
        startButton.disabled = true;
        
        // 스피너 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
                margin-right: 8px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 바로가기 클릭 처리
function handleShortcutClick(text) {
    console.log('바로가기 클릭:', text);
    
    switch(text) {
        case 'AI 배치 분석':
            navigateToInput();
            break;
        case '분석 기록':
            showHistory();
            break;
        case '설정':
            showSettings();
            break;
        case '도움말':
            showHelp();
            break;
        default:
            console.log('알 수 없는 바로가기:', text);
    }
}

// 네비게이션 클릭 처리
function handleNavigationClick(label) {
    console.log('네비게이션 클릭:', label);
    
    // 활성 상태 업데이트
    updateActiveNavigation(label);
    
    switch(label) {
        case '홈':
            navigateToHome();
            break;
        case '분석':
            navigateToInput();
            break;
        case '진행':
            navigateToProgress();
            break;
        case '기록':
            navigateToHistory();
            break;
        case '마이':
            navigateToProfile();
            break;
        default:
            console.log('알 수 없는 네비게이션:', label);
    }
}

// 활성 네비게이션 업데이트
function updateActiveNavigation(activeLabel) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const label = item.querySelector('.nav-label').textContent;
        if (label === activeLabel) {
            item.classList.add('active');
        }
    });
}

// 페이지 네비게이션 함수들
function navigateToHome() {
    window.location.href = '/mobile/home';
}

function navigateToInput() {
    window.location.href = '/mobile/input';
}

function navigateToProgress() {
    window.location.href = '/mobile/progress';
}

function navigateToHistory() {
    console.log('분석 기록 페이지로 이동');
    alert('분석 기록 기능은 준비 중입니다.');
}

function navigateToProfile() {
    console.log('마이 페이지로 이동');
    alert('마이 페이지 기능은 준비 중입니다.');
}

// 도움말 표시
function showHelp() {
    console.log('도움말 표시');
    alert('AI TETRIS 도움말\n\n1. 시작하기 버튼을 눌러 분석을 시작하세요\n2. 짐 사진을 촬영하고 탑승 인원을 선택하세요\n3. AI가 최적의 차량 배치를 분석합니다\n4. 결과를 확인하고 하드웨어에 적용하세요');
}

// 분석 기록 표시
function showHistory() {
    console.log('분석 기록 표시');
    alert('분석 기록 기능은 준비 중입니다.');
}

// 사용자 설정 로드
function loadUserPreferences() {
    // 로컬 스토리지에서 사용자 설정 로드
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
        try {
            const prefs = JSON.parse(preferences);
            applyUserPreferences(prefs);
        } catch (e) {
            console.warn('사용자 설정 파싱 오류:', e);
        }
    }
}

// 사용자 설정 적용
function applyUserPreferences(prefs) {
    // 다크 모드 적용
    if (prefs.darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // 폰트 크기 적용
    if (prefs.fontSize) {
        document.documentElement.style.fontSize = prefs.fontSize;
    }
    
    // 기타 설정들...
    console.log('사용자 설정 적용:', prefs);
}

// 터치 제스처 처리
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', function(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // 스와이프 제스처 감지
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
            // 오른쪽 스와이프 - 이전 페이지
            console.log('오른쪽 스와이프');
        } else {
            // 왼쪽 스와이프 - 다음 페이지
            console.log('왼쪽 스와이프');
        }
    }
});

// 페이지 가시성 변경 처리
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('페이지 숨김');
        // 백그라운드 작업 정리
    } else {
        console.log('페이지 표시');
        // 포그라운드 작업 재개
        checkUserStatus();
    }
});

// 네트워크 상태 확인
window.addEventListener('online', function() {
    console.log('네트워크 연결됨');
    showNetworkStatus('연결됨');
});

window.addEventListener('offline', function() {
    console.log('네트워크 연결 끊김');
    showNetworkStatus('연결 끊김');
});

// 네트워크 상태 표시
function showNetworkStatus(status) {
    // 간단한 토스트 메시지 표시
    const toast = document.createElement('div');
    toast.className = 'network-toast';
    toast.textContent = `네트워크: ${status}`;
    toast.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: ${status === '연결됨' ? '#4CAF50' : '#F44336'};
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1000;
        animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 에러 처리
window.addEventListener('error', function(e) {
    console.error('JavaScript 오류:', e.error);
    // 에러 리포팅 (실제 구현에서는 서버로 전송)
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    // 리소스 정리
    if (notificationModal) {
        notificationModal = null;
    }
});

console.log('AI TETRIS 홈화면 JavaScript 로드 완료');

