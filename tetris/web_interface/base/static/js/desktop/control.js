/**
 * 데스크탑 관제 화면 JavaScript
 * SSE 연동 및 실제 API 호출 기반 구현
 */

class ControlController {
    constructor() {
        this.currentStep = 0;
        this.isProcessing = false;
        this.hardwareConnected = false;
        this.sessionId = null;
        this.eventSource = null;
        
        // DOM 요소들
        this.mobileConnectionStatus = document.getElementById('mobileConnectionStatus');
        this.imageUploadStatus = document.getElementById('imageUploadStatus');
        this.executionTriggerStatus = document.getElementById('executionTriggerStatus');
        
        // 하드웨어 상태 요소들
        this.cpuStatus = document.getElementById('cpuStatus');
        this.memoryStatus = document.getElementById('memoryStatus');
        this.sessionStatus = document.getElementById('sessionStatus');
        this.networkStatus = document.getElementById('networkStatus');
        this.port1Status = document.getElementById('port1Status');
        this.port2Status = document.getElementById('port2Status');
        this.port3Status = document.getElementById('port3Status');
        this.port4Status = document.getElementById('port4Status');
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupSSE();
        await this.initializeSession();
        await this.loadInitialStatus();
        this.loadQRCode();
        
        console.log('🚀 데스크탑 관제 화면 초기화 완료');
    }
    
    // 초기 상태 로드
    async loadInitialStatus() {
        try {
            const statusUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.STATUS || '/desktop/api/status';
            const response = await fetch(statusUrl);
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('📊 초기 상태 로드:', result.data);
                this.updateSystemStatus(result.data);
            }
        } catch (error) {
            console.error('초기 상태 로드 오류:', error);
            // 오류 시 기본 상태로 초기화
            this.resetUI();
        }
    }
    
    bindEvents() {
        // 시스템 제어 버튼 이벤트 (전역 함수로 호출됨)
        window.refreshStatus = () => this.refreshSystemStatus();
        window.resetSystem = () => this.resetSystem();
        
        // 아코디언 클릭 이벤트 추가
        this.setupAccordionEvents();
        
        // 팝업 모달 이벤트 추가
        this.setupModalEvents();
        
        // QR 코드 모달 이벤트 추가
        this.setupQRModalEvents();
        
        // QR 코드 새로고침 (5분마다)
        setInterval(() => {
            this.refreshQRCode();
        }, 300000);
    }
    
    
    // 아코디언 이벤트 설정
    setupAccordionEvents() {
        const accordionButtons = document.querySelectorAll('.btn-accordion');
        accordionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // e.preventDefault();
                e.stopPropagation();
                if (button.querySelector('.accordion-step-status.completed')) {
                    // 분석 완료된 경우에만 아코디언 토글
                    this.toggleAccordion(button);
                }
            }, { capture: true }); // 캡처 단계에서 먼저 실행
        });
        
        // MutationObserver로 아코디언 상태 변화 감지 및 스크롤
        this.setupAccordionScrollObserver();
    }
    
    // 아코디언 스크롤 옵저버 설정 (active 클래스는 toggleAccordion에서 관리)
    setupAccordionScrollObserver() {
        const accordionCollapses = document.querySelectorAll('.accordion-collapse');
        
        accordionCollapses.forEach(collapse => {
            let scrollTimeout = null;
            let lastExpandedState = false;
            
            const observer = new MutationObserver((mutations) => {
                // 아코디언 버튼과 아이템 찾기
                const button = document.querySelector(`[aria-controls="${collapse.id}"]`);
                const accordionItem = collapse.closest('.accordion-item');
                
                // 버튼의 aria-expanded 속성으로 열림/닫힘 상태 확인
                const isExpanded = button && button.getAttribute('aria-expanded') === 'true';
                
                // 상태가 닫힘 -> 열림으로 변경되었을 때만 스크롤
                if (isExpanded && !lastExpandedState) {
                    // 이전 타임아웃 취소
                    if (scrollTimeout) {
                        clearTimeout(scrollTimeout);
                    }
                    
                    // 새로운 스크롤 예약
                    scrollTimeout = setTimeout(() => {
                        const accordionBody = collapse.querySelector('.accordion-body');
                        if (accordionBody && collapse.classList.contains('show')) {
                            // 아코디언 헤더를 기준으로 스크롤 (본문보다 헤더로 스크롤하면 더 위로 올라감)
                            const targetElement = accordionItem || accordionBody;
                            
                            targetElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                                inline: 'nearest'
                            });
                            
                            // 추가로 약간 위로 스크롤 (헤더 여유 공간)
                            setTimeout(() => {
                                window.scrollBy({
                                    top: -20,
                                    behavior: 'smooth'
                                });
                            }, 300);
                        }
                        scrollTimeout = null;
                    }, 200); // 애니메이션이 끝난 후 스크롤
                }
                
                lastExpandedState = isExpanded;
            });
            
            // collapse의 클래스와 스타일 속성 변화 감지
            observer.observe(collapse, {
                attributes: true,
                attributeFilter: ['class', 'style', 'aria-hidden']
            });
            
            // 버튼의 aria-expanded 속성도 감시
            const button = document.querySelector(`[aria-controls="${collapse.id}"]`);
            if (button) {
                const buttonObserver = new MutationObserver((mutations) => {
                    observer.takeRecords(); // collapse observer 트리거
                });
                
                buttonObserver.observe(button, {
                    attributes: true,
                    attributeFilter: ['aria-expanded']
                });
            }
        });
    }
    
    setupModalEvents() {
        // 세부 정보 보기 버튼 이벤트
        const showDetailsBtn = document.getElementById('showDetailsBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const modal = document.getElementById('detailsModal');
        
        if (showDetailsBtn) {
            showDetailsBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // 모달 배경 클릭 시 닫기
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                this.closeModal();
            }
        });
    }
    
    setupQRModalEvents() {
        // QR 코드 컨테이너 클릭 이벤트
        const qrContainer = document.getElementById('qrCodeContainer');
        const qrModal = document.getElementById('qrModal');
        const closeQrModalBtn = document.getElementById('closeQrModalBtn');
        const qrModalImage = document.getElementById('qrModalImage');
        
        if (qrContainer) {
            qrContainer.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openQRModal();
            });
        } else {
            console.error('❌ QR 코드 컨테이너를 찾을 수 없습니다');
        }
        
        if (closeQrModalBtn) {
            closeQrModalBtn.addEventListener('click', () => {
                this.closeQRModal();
            });
        }
        
        // QR 모달 배경 클릭 시 닫기
        if (qrModal) {
            qrModal.addEventListener('click', (e) => {
                if (e.target === qrModal) {
                    this.closeQRModal();
                }
            });
        }
        
        // ESC 키로 QR 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const qrModal = document.getElementById('qrModal');
                if (qrModal && qrModal.classList.contains('show')) {
                    this.closeQRModal();
                }
            }
        });
    }
    
    openModal() {
        const modal = document.getElementById('detailsModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
            console.log('📋 세부 정보 팝업 열림');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('detailsModal');
        if (modal) {
            // 모든 스크롤 복원
            document.querySelectorAll(".analysis-result-json-container, .analysis-result-container").forEach((item) => {
                item.scrollTop = 0;
                item.scrollLeft = 0;
            });

            // 모든 열려있는 아코디언 닫기
            document.querySelectorAll('.accordion-item.active').forEach(item => {
                item.classList.remove('active');
            });

            document.querySelectorAll('.accordion-collapse.show').forEach(collapse => {
                collapse.classList.remove('show');
                collapse.setAttribute('aria-hidden', 'true');
                collapse.style.display = '';
                collapse.style.height = '';
                
                // 관련 버튼의 aria-expanded 업데이트 및 active 제거
                const relatedButton = document.querySelector(`[aria-controls="${collapse.id}"]`);
                if (relatedButton) {
                    relatedButton.setAttribute('aria-expanded', 'false');
                    
                    // 화살표 회전 초기화
                    const arrow = relatedButton.querySelector('.accordion-arrow');
                    if (arrow) {
                        arrow.style.transform = 'rotate(0deg)';
                    }
                }
                
                // accordion-item의 active 클래스 제거
                const accordionItem = collapse.closest('.accordion-item');
                if (accordionItem) {
                    accordionItem.classList.remove('active');
                }
            });
            
            modal.style.display = 'none';
        }
    }
    
    openQRModal() {
        const qrModal = document.getElementById('qrModal');
        const qrModalImage = document.getElementById('qrModalImage');
        const qrCodeImage = document.getElementById('qrCodeImage');
        
        if (qrModal && qrModalImage && qrCodeImage) {
            // 모달 이미지에 원본 QR 코드 이미지 소스 설정
            qrModalImage.src = qrCodeImage.src;
            qrModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        } else {
            console.error('❌ QR 모달 요소를 찾을 수 없습니다:', {
                qrModal: !!qrModal,
                qrModalImage: !!qrModalImage,
                qrCodeImage: !!qrCodeImage
            });
        }
    }
    
    closeQRModal() {
        const qrModal = document.getElementById('qrModal');
        
        if (qrModal) {
            qrModal.classList.remove('show');
            document.body.style.overflow = ''; // 스크롤 복원
        } else {
            console.error('❌ QR 모달 요소를 찾을 수 없습니다');
        }
    }
    
    // 단계별 분석 결과 존재 여부 확인
    checkStepHasResult(statusData, step) {
        if (!statusData.analysis_result) return false;
        
        const stepResults = {
            1: statusData.analysis_result.chain1_out,
            2: statusData.analysis_result.chain2_out,
            3: statusData.analysis_result.chain3_out,
            4: statusData.analysis_result.chain4_out
        };
        
        return !!(stepResults[step] && stepResults[step].trim());
    }
    
    // 단계별 상세 정보 복원
    restoreStepDetailInfo(detailInfo, step) {
        const stepDescriptions = {
            1: '업로드된 이미지에서 좌석과 승객 인식',
            2: '인식된 데이터를 구조화하고 분석',
            3: 'AI 알고리즘으로 최적 좌석 배치 생성'
        };
        
        const stepLabels = {
            1: '사용자 입력 분석 진행률',
            2: '최적 배치 생성 진행률',
            3: '시트 동작 계획 진행률'
        };
        
        const description = stepDescriptions[step] || '분석 진행 중';
        const label = stepLabels[step] || '진행률';
        
        detailInfo.innerHTML = `
            <p class="krds-text">${description}</p>
            <div class="step-progress-section">
                <div class="krds-progress" role="progressbar" aria-label="${label}" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${label}: 100%">
                    <div class="krds-progress__bar" id="step${step}Progress" style="width: 100%"></div>
                </div>
                <span class="krds-text krds-text--small" id="step${step}ProgressText">100%</span>
            </div>
        `;
    }
    
    // 아코디언 토글 기능
    toggleAccordion(button) {
        const targetId = button.getAttribute('aria-controls');
        const targetCollapse = document.getElementById(targetId);
        const accordionItem = targetCollapse?.closest('.accordion-item');
        
        // 현재 상태 확인 (show 클래스 기준으로 판단)
        const isCurrentlyExpanded = targetCollapse && targetCollapse.classList.contains('show');
        console.log('🔍 아코디언 상태 확인:', {
            targetId,
            isCurrentlyExpanded,
            ariaExpanded: button.getAttribute('aria-expanded'),
            hasShowClass: targetCollapse?.classList.contains('show')
        });
        
        if (targetCollapse) {
            // 다른 아코디언들 닫기
            document.querySelectorAll('.accordion-collapse.show').forEach(collapse => {
                if (collapse.id !== targetId) {
                    collapse.classList.remove('show');
                    collapse.setAttribute('aria-hidden', 'true');
                    // KRDS/기타 스크립트가 남긴 인라인 스타일 초기화
                    collapse.style.display = '';
                    collapse.style.height = '';
                    const relatedButton = document.querySelector(`[aria-controls="${collapse.id}"]`);
                    if (relatedButton) {
                        relatedButton.setAttribute('aria-expanded', 'false');
                        relatedButton.classList.remove('active');
                        // 화살표 회전 초기화
                        const arrow = relatedButton.querySelector('.accordion-arrow');
                        if (arrow) {
                            arrow.style.transform = 'rotate(0deg)';
                        }
                    }
                    // accordion-item의 active 클래스도 제거
                    const otherAccordionItem = collapse.closest('.accordion-item');
                    if (otherAccordionItem) {
                        otherAccordionItem.classList.remove('active');
                    }
                }
            });
            
            // 현재 아코디언 토글
            if (isCurrentlyExpanded) {
                // 닫기
                targetCollapse.classList.remove('show');
                targetCollapse.setAttribute('aria-hidden', 'true');
                targetCollapse.style.display = '';
                targetCollapse.style.height = '';
                button.setAttribute('aria-expanded', 'false');
                
                // active 클래스 제거
                button.classList.remove('active');
                if (accordionItem) {
                    accordionItem.classList.remove('active');
                }
                
                console.log('📁 아코디언 닫기:', targetId);
                
                // 화살표 회전 초기화
                const arrow = button.querySelector('.accordion-arrow');
                if (arrow) {
                    arrow.style.transform = 'rotate(0deg)';
                }
            } else {
                // 열기
                targetCollapse.classList.add('show');
                targetCollapse.setAttribute('aria-hidden', 'false');
                targetCollapse.style.display = 'block';
                targetCollapse.style.height = 'auto';
                targetCollapse.style.maxHeight = '500px';
                targetCollapse.style.overflow = 'visible';
                button.setAttribute('aria-expanded', 'true');
                
                // active 클래스 추가
                button.classList.add('active');
                if (accordionItem) {
                    accordionItem.classList.add('active');
                }
                
                console.log('📂 아코디언 열기:', targetId);
                
                // 아코디언 내용 가시성 확인 및 강제 설정
                const accordionBody = targetCollapse.querySelector('.accordion-body');
                if (accordionBody) {
                    accordionBody.style.display = 'block';
                    accordionBody.style.visibility = 'visible';
                    accordionBody.style.opacity = '1';
                }
                
                // 화살표 회전
                const arrow = button.querySelector('.accordion-arrow');
                if (arrow) {
                    arrow.style.transform = 'rotate(180deg)';
                }
                
                // 스크롤은 MutationObserver에서 자동 처리됨
            }
        }
    }
    
    // 세션 초기화
    async initializeSession() {
        try {
            this.sessionId = this.generateSessionId();
            console.log(`📱 세션 초기화: ${this.sessionId}`);
            
            const joinSessionUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.JOIN_SESSION || '/desktop/api/join_session';
            const response = await fetch(joinSessionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    type: 'desktop'
                })
            });
            
            // 응답 상태 확인
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ 세션 등록 완료');
                this.updateSessionStatus('connected');
            } else {
                console.error('❌ 세션 등록 실패:', result.error);
            }
        } catch (error) {
            console.error('세션 초기화 오류:', error);
        }
    }
    
    // SSE 연결 설정
    setupSSE() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        // 데스크탑용 SSE 엔드포인트 사용
        const statusStreamUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.STATUS_STREAM || '/api/status_stream';
        this.eventSource = new EventSource(statusStreamUrl);
        
        this.eventSource.onmessage = async (event) => {
            try {
                // 빈 메시지나 유효하지 않은 데이터 체크
                if (!event.data || event.data.trim() === '') {
                    console.log('📡 SSE 빈 메시지 수신, 무시');
                    return;
                }
                
                const data = JSON.parse(event.data);
                console.log('📡 SSE 메시지 수신:', data);
                console.log('📡 SSE 메시지 타입:', typeof data, 'keys:', Object.keys(data));
                
                // 실시간 업데이트 강화
                await this.handleSSEMessage(data);
                
                // UI 즉시 업데이트 확인
                console.log('📡 SSE 메시지 처리 완료');
            } catch (error) {
                console.error('SSE 메시지 파싱 오류:', error, '데이터:', event.data);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('SSE 연결 오류:', error);
            console.log('SSE 오류 또는 종료:', error);
            console.log('SSE 연결 상태:', this.eventSource.readyState);
            
            // 연결 상태 확인
            if (this.eventSource.readyState === EventSource.CLOSED) {
                console.log('SSE 연결이 종료되었습니다. 재연결을 시도합니다...');
                // 재연결 시도 전에 기존 연결 정리
                try {
                    this.eventSource.close();
                } catch (closeError) {
                    console.warn('SSE 연결 종료 중 오류:', closeError);
                }
                setTimeout(() => {
                    console.log('🔄 SSE 재연결 시도...');
                    // 재연결 시도 시에도 CONFIG 미초기화 대비
                    this.setupSSE();
                }, 3000);
            } else if (this.eventSource.readyState === EventSource.CONNECTING) {
                console.log('SSE 연결 중...');
            } else if (this.eventSource.readyState === EventSource.OPEN) {
                console.log('SSE 연결이 열려있습니다.');
            }
        };
        
        console.log('✅ SSE 연결 설정 완료');
    }
    
    // SSE 메시지 처리
    async handleSSEMessage(data) {
        if (data.event === 'connected') {
            console.log('✅ SSE 연결 확인');
            return;
        }
        
        console.log('📡 SSE 메시지 처리 시작:', data);
        
        // AI 처리 상태 업데이트 - 모든 관련 데이터 확인
        if (data.current_step !== undefined || data.progress !== undefined || data.status) {
            console.log('🎯 AI 진행률 업데이트 트리거:', {
                current_step: data.current_step,
                progress: data.progress,
                status: data.status
            });
            await this.updateAIProgress(data);
            
            // 분석 시작 시 첫 번째 단계 표시
            if (data.current_step === 0 && data.status === 'running') {
                console.log('🎯 1단계 분석 시작 - 상태 업데이트');
                if (window.updateAIProgress) {
                    window.updateAIProgress(1, 25, 'running', '사용자 입력 분석 중입니다...');
                }
                if (window.updateAccordionStatus) {
                    window.updateAccordionStatus(1, 'active');
                }
            }
        }
        
        // 분석 결과가 있는 경우 즉시 표시
        if (data.analysis_result || data.chain1_out || data.chain2_out || data.chain3_out || data.chain4_out) {
            console.log('🎯 분석 결과 업데이트 트리거:', data);
            if (window.handleAIStatusData) {
                await window.handleAIStatusData(data);
            }
        }
        
        // 하드웨어 제어 상태 업데이트
        if (data.event && data.event.startsWith('hardware_')) {
            this.updateHardwareStatus(data);
        }
        
        // 시스템 상태 업데이트 (모든 SSE 메시지에 대해)
        this.updateSystemStatus(data);
        
        console.log('📡 SSE 메시지 처리 완료');
    }
    
    // AI 진행률 업데이트
    async updateAIProgress(data) {
        console.log('🎯 updateAIProgress 호출됨:', data);
        
        const step = data.current_step || data.processing?.current_step;
        const progress = data.progress || data.processing?.progress;
        const message = data.message || data.processing?.message;
        const status = data.status || data.system?.status || 'running';
        
        console.log('🎯 추출된 값들:', { step, progress, message, status });
        
        if (step !== undefined && step !== null) {
            console.log('🎯 단계 업데이트:', step);
            this.currentStep = step;
            
            // AI 진행률 표시 함수 호출 (control-ai.js의 함수)
            if (window.updateAIProgress) {
                console.log('🎯 window.updateAIProgress 호출');
                window.updateAIProgress(step, progress || 0, status, message);
            }
            if (window.updateStepIndicator) {
                console.log('🎯 window.updateStepIndicator 호출');
                window.updateStepIndicator(step);
            }
        }
        
        // 진행률만 있는 경우에도 업데이트
        if (progress !== undefined && progress !== null) {
            console.log('🎯 진행률만 업데이트:', progress);
            if (window.updateAIProgress && this.currentStep) {
                window.updateAIProgress(this.currentStep, progress, status, message);
            }
        }
        
        // 단계별 결과 처리
        if (window.handleAIStatusData) {
            console.log('🎯 window.handleAIStatusData 호출');
            await window.handleAIStatusData(data);
        }
        
        console.log('🎯 updateAIProgress 완료');
    }
    
    // 하드웨어 상태 업데이트
    updateHardwareStatus(data) {
        console.log('🔧 하드웨어 상태 업데이트:', data);
        
        switch (data.event) {
            case 'hardware_start':
                this.updateHardwareConnectionStatus('connecting');
                break;
            case 'hardware_progress':
                this.updateHardwareConnectionStatus('connected');
                break;
            case 'hardware_complete':
                this.updateHardwareConnectionStatus('connected');
                this.hardwareConnected = true;
                break;
            case 'hardware_error':
                this.updateHardwareConnectionStatus('error');
                break;
        }
    }
    
    
    // 시스템 상태 업데이트
    updateSystemStatus(data = {}) {
        try {
            // 모바일 연결 상태 업데이트 - SSE 메시지에서 모바일 세션 감지
            if (this.mobileConnectionStatus) {
                // 모바일에서 분석이 시작되었거나 진행 중인 경우 "접속중"으로 표시
                if (data.current_step !== undefined || data.progress !== undefined || data.status === 'running' || data.upload?.uploaded_file) {
                    this.updateStatusBadge(this.mobileConnectionStatus, 'connected', '접속중');
                } else if (data.system?.status === 'idle' || data.status === 'idle') {
                    this.updateStatusBadge(this.mobileConnectionStatus, 'disconnected', '대기중');
                }
            }
            
            // 이미지 업로드 상태 업데이트
            if (this.imageUploadStatus) {
                // upload 객체에서 uploaded_file 확인 (우선순위 높음)
                const uploadedFile = data.upload?.uploaded_file;
                // 최상위 레벨의 image_uploaded 또는 uploaded_file도 확인 (폴백)
                const topLevelUploaded = data.image_uploaded ?? data.uploaded_file;
                
                // 실제 업로드 상태 결정
                const isUploaded = uploadedFile ?? topLevelUploaded;
                
                console.log('📸 이미지 업로드 상태 체크:', {
                    'data.upload?.uploaded_file': uploadedFile,
                    'data.image_uploaded': data.image_uploaded,
                    'data.uploaded_file': data.uploaded_file,
                    'isUploaded': isUploaded
                });
                
                if (isUploaded === true) {
                    console.log('📸 이미지 업로드 상태 감지 - 업로드됨');
                    this.updateStatusBadge(this.imageUploadStatus, 'uploaded', '업로드됨');
                } else {
                    console.log('📸 이미지 업로드 상태 감지 - 대기중');
                    this.updateStatusBadge(this.imageUploadStatus, 'waiting', '대기중');
                }
            }
            
            // 실행 트리거 상태 업데이트 (개선)
            if (this.executionTriggerStatus) {
                const processingStatus = data.processing?.status || data.status || data.system?.status;
                console.log('🔄 실행 트리거 상태 확인:', processingStatus);
                
                if (processingStatus === 'running' || processingStatus === 'processing') {
                    console.log('🔄 실행 트리거 상태 업데이트: 실행중');
                    this.updateStatusBadge(this.executionTriggerStatus, 'active', '실행중');
                    this.isProcessing = true;
                } else if (processingStatus === 'completed' || processingStatus === 'done') {
                    console.log('🔄 실행 트리거 상태 업데이트: 완료');
                    this.updateStatusBadge(this.executionTriggerStatus, 'completed', '완료');
                    this.isProcessing = false;
                } else if (processingStatus === 'idle' || processingStatus === 'waiting') {
                    console.log('🔄 실행 트리거 상태 업데이트: 대기중');
                    this.updateStatusBadge(this.executionTriggerStatus, 'waiting', '대기중');
                    this.isProcessing = false;
                } else if (processingStatus === 'error' || processingStatus === 'cancelled') {
                    console.log('🔄 실행 트리거 상태 업데이트: 오류');
                    this.updateStatusBadge(this.executionTriggerStatus, 'error', '오류');
                    this.isProcessing = false;
                }
            }
            
            // 하드웨어 연결 상태 시뮬레이션
            this.updateHardwareStatusIndicators();
            
            // 시스템 리소스 상태 업데이트
            this.updateSystemResourceStatus(data);
        } catch (error) {
            console.error('시스템 상태 업데이트 오류:', error);
        }
    }
    
    // 상태 배지 업데이트
    updateStatusBadge(element, status, text) {
        if (!element) {
            console.warn('상태 배지 요소가 존재하지 않습니다:', element);
            return;
        }
        
        element.className = `krds-badge krds-badge--${this.getStatusColor(status)}`;
        element.setAttribute('data-status', status);
        
        const statusTextElement = element.querySelector('.status-text');
        if (statusTextElement) {
            statusTextElement.textContent = text;
        } else {
            console.warn('상태 텍스트 요소를 찾을 수 없습니다:', element);
        }
        
        const indicator = element.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
    }
    
    // 상태에 따른 색상 반환
    getStatusColor(status) {
        const colorMap = {
            'connected': 'success',
            'uploaded': 'success',
            'active': 'warning',
            'completed': 'success',
            'error': 'danger',
            'disconnected': 'secondary',
            'waiting': 'secondary'
        };
        return colorMap[status] || 'secondary';
    }
    
    // 하드웨어 상태 표시기 업데이트
    updateHardwareStatusIndicators() {
        // 시뮬레이션된 하드웨어 연결 상태
        const ports = [this.port1Status, this.port2Status, this.port3Status, this.port4Status];
        ports.forEach((port, index) => {
            if (port) {
                const isConnected = Math.random() > 0.3; // 70% 확률로 연결됨
                const status = isConnected ? 'connected' : 'disconnected';
                const text = isConnected ? '연결됨' : '끊김';
                this.updateStatusBadge(port, status, text);
            } else {
                console.warn(`포트 ${index + 1} 상태 요소를 찾을 수 없습니다`);
            }
        });
    }
    
    // 시스템 리소스 상태 업데이트
    updateSystemResourceStatus(data) {
        // CPU 상태 시뮬레이션
        if (this.cpuStatus) {
            const cpuUsage = Math.random() * 100;
            const cpuStatus = cpuUsage > 80 ? 'error' : cpuUsage > 60 ? 'warning' : 'success';
            this.updateStatusBadge(this.cpuStatus, cpuStatus, `${Math.round(cpuUsage)}%`);
        }
        
        // 메모리 상태 시뮬레이션
        if (this.memoryStatus) {
            const memoryUsage = Math.random() * 100;
            const memoryStatus = memoryUsage > 85 ? 'error' : memoryUsage > 70 ? 'warning' : 'success';
            this.updateStatusBadge(this.memoryStatus, memoryStatus, `${Math.round(memoryUsage)}%`);
        }
        
        // 세션 상태
        if (this.sessionStatus) {
            this.updateStatusBadge(this.sessionStatus, 'connected', '활성');
        }
        
        // 네트워크 상태
        if (this.networkStatus) {
            this.updateStatusBadge(this.networkStatus, 'connected', '정상');
        }
    }
    
    // 하드웨어 연결 상태 업데이트
    updateHardwareConnectionStatus(status) {
        console.log(`🔧 하드웨어 연결 상태: ${status}`);
        // 하드웨어 관련 UI 업데이트 로직 추가
    }
    
    // 세션 상태 업데이트
    updateSessionStatus(status) {
        console.log(`📱 세션 상태: ${status}`);
        // 세션 관련 UI 업데이트 로직 추가
    }

    // 세션 ID 생성
    generateSessionId() {
        return 'desktop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 시스템 상태 새로고침
    async refreshSystemStatus() {
        console.log('🔄 시스템 상태 새로고침');
        try {
            location.reload(true);
            // SSE를 통해 실시간으로 상태를 받고 있으므로 별도 폴링 불필요
            console.log('✅ SSE를 통한 실시간 상태 업데이트 중');
        } catch (error) {
            console.error('❌ 시스템 상태 새로고침 실패:', error);
        }
    }
    
    // 시스템 초기화
    async resetSystem() {
        if (!confirm('시스템을 초기화하시겠습니까?')) {
            return;
        }
        
        console.log('🔄 시스템 초기화 시작');
        try {
            const resetUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.RESET || '/desktop/api/reset';
            const response = await fetch(resetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ 시스템 초기화 완료');
                this.resetUI();
            } else {
                console.error('❌ 시스템 초기화 실패:', result.error);
                alert('시스템 초기화에 실패했습니다: ' + result.error);
            }
        } catch (error) {
            console.error('시스템 초기화 오류:', error);
            alert('시스템 초기화 중 오류가 발생했습니다.');
        }
    }
    
    // UI 초기화
    resetUI() {
        // AI 진행률 초기화
        this.currentStep = 0;
        this.progressValue = 0;
        this.isProcessing = false;
        
        // AI 관련 UI 초기화 (0%로 초기화)
        if (window.updateAIProgress) {
            window.updateAIProgress(this.currentStep, this.progressValue, 'waiting', '시스템 준비됨');
        }
        if (window.updateStepIndicator) {
            window.updateStepIndicator(this.currentStep);
        }
        
        // 상태 배지 초기화
        if (this.imageUploadStatus) {
            this.updateStatusBadge(this.imageUploadStatus, 'waiting', '대기중');
        }
        if (this.executionTriggerStatus) {
            this.updateStatusBadge(this.executionTriggerStatus, 'waiting', '대기중');
        }
        if (this.mobileConnectionStatus) {
            this.updateStatusBadge(this.mobileConnectionStatus, 'disconnected', '대기중');
        }
        
        // 하드웨어 상태 초기화
        this.hardwareConnected = false;
        
        console.log('✅ UI 초기화 완료');
    }
    
    // QR 코드 로드
    loadQRCode() {
        const qrImage = document.getElementById('qrCodeImage');
        if (qrImage) {
            // CONFIG에서 QR 코드 경로 가져오기
            const qrPath = window.CONFIG?.ENDPOINTS?.DESKTOP?.QR_PNG || '/desktop/qr.png';
            qrImage.src = qrPath;
            console.log('📱 QR 코드 로드:', qrPath);
            
            // 이미지 로드 성공/실패 이벤트 처리
            qrImage.onload = () => {
                console.log('✅ QR 코드 로드 성공');
            };
            
            qrImage.onerror = () => {
                console.error('❌ QR 코드 로드 실패:', qrPath);
                // 기본 이미지나 대체 텍스트 표시
                qrImage.alt = 'QR 코드를 불러올 수 없습니다';
                qrImage.style.display = 'none';
                const container = document.getElementById('qrCodeContainer');
                if (container && !container.querySelector('.qr-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'qr-error';
                    errorDiv.textContent = 'QR 코드를 불러올 수 없습니다';
                    errorDiv.style.cssText = 'text-align: center; color: #dc3545; padding: 20px;';
                    container.appendChild(errorDiv);
                }
            };
        }
    }
    
    // QR 코드 새로고침
    refreshQRCode() {
        const qrImage = document.getElementById('qrCodeImage');
        if (qrImage) {
            // CONFIG에서 QR 코드 경로 가져오기
            const qrPath = window.CONFIG?.ENDPOINTS?.DESKTOP?.QR_PNG || '/desktop/qr.png';
            qrImage.src = qrPath + '?t=' + Date.now();
            console.log('🔄 QR 코드 새로고침:', qrPath);
        }
    }
    
    // 하드웨어 제어 실행
    async triggerHardwareControl() {
        if (!this.isProcessing) {
            alert('먼저 AI 분석을 완료해주세요.');
            return;
        }
        
        console.log('🔧 하드웨어 제어 실행');
        try {
            const triggerHardwareUrl = window.CONFIG?.ENDPOINTS?.DESKTOP?.TRIGGER_HARDWARE || '/desktop/api/trigger_hardware';
            const response = await fetch(triggerHardwareUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    command: 'execute'
                })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ 하드웨어 제어 시작');
                this.updateStatusBadge(this.executionTriggerStatus, 'active', '실행중');
            } else {
                console.error('❌ 하드웨어 제어 실패:', result.error);
                alert('하드웨어 제어에 실패했습니다: ' + result.error);
            }
        } catch (error) {
            console.error('하드웨어 제어 오류:', error);
            alert('하드웨어 제어 중 오류가 발생했습니다.');
        }
    }

}

// 전역 변수로 인스턴스 생성
let controlController;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    controlController = new ControlController();
    
        // AI 분석 스트림은 control-ai.js에서 처리
    
    console.log('🎯 데스크탑 관제 화면 로딩 완료');
});

// 페이지 언로드 시 SSE 연결 정리
window.addEventListener('beforeunload', () => {
    if (controlController && controlController.eventSource) {
        try {
            controlController.eventSource.close();
            console.log('✅ SSE 연결 정리 완료');
        } catch (error) {
            console.warn('SSE 연결 정리 중 오류:', error);
        }
    }
});

// 페이지 숨김 시 SSE 연결 정리 (모바일 브라우저 대응)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && controlController && controlController.eventSource) {
        try {
            controlController.eventSource.close();
            console.log('✅ 페이지 숨김으로 인한 SSE 연결 정리');
        } catch (error) {
            console.warn('SSE 연결 정리 중 오류:', error);
        }
    }
});

// 전역 함수들 (HTML에서 호출)
window.triggerHardwareControl = () => {
    if (controlController) {
        controlController.triggerHardwareControl();
    }
};

// 전역 인스턴스 노출
window.controlController = controlController;