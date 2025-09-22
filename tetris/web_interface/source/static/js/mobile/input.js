/**
 * 모바일 입력 페이지 JavaScript
 * Phase 2.2: 기본 폼 검증 및 UI 상호작용
 */

class InputController {
    constructor() {
        this.selectedPeople = null;
        this.selectedFile = null;
        this.form = document.getElementById('inputForm');
        this.peopleChips = document.getElementById('peopleChips');
        this.photoInput = document.getElementById('photoInput');
        this.photoPreview = document.getElementById('photoPreview');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.submitBtn = document.getElementById('submitBtn');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateSubmitButton();
    }
    
    bindEvents() {
        // 인원 선택 이벤트
        this.peopleChips.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip')) {
                this.selectPeople(e.target);
            }
        });
        
        // 파일 업로드 이벤트
        this.uploadBtn.addEventListener('click', () => {
            this.photoInput.click();
        });
        
        this.photoInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // 폼 제출 이벤트
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
    }
    
    selectPeople(chip) {
        // 모든 칩에서 선택 상태 제거
        this.peopleChips.querySelectorAll('.chip').forEach(c => {
            c.classList.remove('selected');
        });
        
        // 선택된 칩에 선택 상태 추가
        chip.classList.add('selected');
        this.selectedPeople = chip.dataset.value;
        
        this.updateSubmitButton();
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
            this.showError('이미지 파일만 업로드 가능합니다.');
            return;
        }
        
        // 파일 크기 검증 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('파일 크기는 10MB 이하여야 합니다.');
            return;
        }
        
        this.selectedFile = file;
        this.displayImagePreview(file);
        this.updateSubmitButton();
    }
    
    displayImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.photoPreview.innerHTML = `
                <img src="${e.target.result}" alt="업로드된 이미지">
                <button type="button" class="remove-btn" onclick="inputController.removeImage()">×</button>
            `;
            this.uploadBtn.textContent = '사진 다시 촬영';
        };
        
        reader.readAsDataURL(file);
    }
    
    removeImage() {
        this.selectedFile = null;
        this.photoPreview.innerHTML = '';
        this.uploadBtn.textContent = '사진 촬영';
        this.photoInput.value = '';
        this.updateSubmitButton();
    }
    
    updateSubmitButton() {
        const isValid = this.selectedPeople !== null && this.selectedFile !== null;
        
        if (isValid) {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.add('enabled');
            this.submitBtn.textContent = '분석 시작';
        } else {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.remove('enabled');
            this.submitBtn.textContent = '인원과 사진을 선택해주세요';
        }
    }
    
    submitForm() {
        if (!this.validateForm()) {
            return;
        }
        
        // 로딩 상태 표시
        this.setLoading(true);
        
        // 공통 업로드 매니저 사용
        if (window.fileUploadManager) {
            this.uploadWithCommonManager();
        } else {
            // 폴백: 기존 방식
            this.simulateApiCall();
        }
    }

    async uploadWithCommonManager() {
        try {
            const additionalData = {
                people_count: this.selectedPeople
            };

            // 업로드 진행률 표시
            window.fileUploadManager.onProgress = (progress) => {
                this.updateUploadProgress(progress);
            };

            // 업로드 성공 처리
            window.fileUploadManager.onSuccess = (response) => {
                console.log('업로드 성공:', response);
                this.handleUploadSuccess(response);
            };

            // 업로드 오류 처리
            window.fileUploadManager.onError = (error) => {
                console.error('업로드 오류:', error);
                this.handleUploadError(error);
            };

            // 실제 업로드 실행
            await window.fileUploadManager.uploadFile('/mobile/api/upload', this.selectedFile, additionalData);

        } catch (error) {
            this.handleUploadError(error);
        }
    }

    updateUploadProgress(progress) {
        const progressText = this.submitBtn.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `업로드 중... ${Math.round(progress)}%`;
        }
    }

    handleUploadSuccess(response) {
        this.setLoading(false);
        
        // 시뮬레이션 매니저를 통한 업로드 완료 이벤트 발생
        if (window.simulationManager) {
            window.simulationManager.simulateUploadComplete(this.selectedFile);
        }
        
        // progress 페이지로 이동
        setTimeout(() => {
            window.location.href = '/mobile/progress';
        }, 1000);
    }

    handleUploadError(error) {
        this.setLoading(false);
        this.showError(`업로드 실패: ${error.message}`);
    }
    
    validateForm() {
        if (this.selectedPeople === null) {
            this.showError('탑승 인원을 선택해주세요.');
            return false;
        }
        
        if (this.selectedFile === null) {
            this.showError('짐 사진을 업로드해주세요.');
            return false;
        }
        
        return true;
    }
    
    simulateApiCall(formData) {
        // Phase 4에서 실제 WebSocket 통신으로 교체
        console.log('FormData:', formData);
        
        // WebSocket을 통한 체인 시작 이벤트 전송
        if (window.wsManager && window.wsManager.isConnected) {
            window.wsManager.emit('chain_start', {
                total_chains: 4,
                timestamp: new Date().toISOString()
            });
        }
        
        // 2초 후 progress 페이지로 이동
        setTimeout(() => {
            this.setLoading(false);
            window.location.href = '/mobile/progress';
        }, 2000);
    }
    
    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = '처리중...';
            this.submitBtn.classList.add('loading');
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = '분석 시작';
            this.submitBtn.classList.remove('loading');
        }
    }
    
    showError(message) {
        // 간단한 에러 표시 (향후 토스트 메시지로 개선 예정)
        alert(message);
    }
    
    showSuccess(message) {
        // 간단한 성공 표시 (향후 토스트 메시지로 개선 예정)
        alert(message);
    }
}

// 전역 변수로 인스턴스 생성
let inputController;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    inputController = new InputController();
});

// WebSocket 연동을 위한 기본 구조 (Phase 4에서 구현 예정)
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
    }
    
    connect() {
        // Phase 4에서 구현 예정
        console.log('WebSocket 연결 준비됨');
    }
    
    disconnect() {
        // Phase 4에서 구현 예정
        console.log('WebSocket 연결 해제됨');
    }
    
    sendMessage(type, data) {
        // Phase 4에서 구현 예정
        console.log('WebSocket 메시지 전송:', type, data);
    }
}

// 전역 WebSocket 매니저 인스턴스
window.wsManager = new WebSocketManager();