/**
 * TETRIS Control Dashboard - Status Management
 * 상태 관리 및 업데이트 기능
 */

// 상태 업데이트 함수
function updateStatus(data) {
    // 모바일 연결 상태 업데이트
    if (data.mobile_connected !== undefined) {
        updateMobileConnectionStatus(data.mobile_connected);
    }
    
    // 이미지 업로드 상태 업데이트
    if (data.image_uploaded !== undefined) {
        updateImageUploadStatus(data.image_uploaded);
    }
    
    // 실행 트리거 상태 업데이트
    if (data.execution_triggered !== undefined) {
        updateExecutionTriggerStatus(data.execution_triggered);
    }
    
    // AI 처리 진행률 업데이트
    if (data.processing) {
        updateAIProgress(
            data.processing.current_step || 1,
            data.processing.progress || 0,
            data.processing.status || 'processing',
            data.processing.message || '처리 중...'
        );
    }
    
    // 시스템 상태 업데이트
    if (data.system) {
        updateSystemStatus(data.system);
    }
}

// 모바일 연결 상태 업데이트
function updateMobileConnectionStatus(connected) {
    const statusElement = document.getElementById('mobileConnectionStatus');
    const rowElement = document.getElementById('mobileConnectionRow');
    
    if (statusElement && rowElement) {
        if (connected) {
            statusElement.textContent = '연결됨';
            statusElement.className = 'krds-badge krds-badge--success';
            rowElement.setAttribute('data-status', 'connected');
        } else {
            statusElement.textContent = '접속 없음';
            statusElement.className = 'krds-badge krds-badge--secondary';
            rowElement.setAttribute('data-status', 'disconnected');
        }
    }
}

// 이미지 업로드 상태 업데이트
function updateImageUploadStatus(uploaded) {
    const statusElement = document.getElementById('imageUploadStatus');
    const rowElement = document.getElementById('imageUploadRow');
    
    if (statusElement && rowElement) {
        if (uploaded) {
            statusElement.textContent = '업로드됨';
            statusElement.className = 'krds-badge krds-badge--success';
            rowElement.setAttribute('data-status', 'uploaded');
        } else {
            statusElement.textContent = '대기중';
            statusElement.className = 'krds-badge krds-badge--secondary';
            rowElement.setAttribute('data-status', 'waiting');
        }
    }
}

// 실행 트리거 상태 업데이트
function updateExecutionTriggerStatus(triggered) {
    const statusElement = document.getElementById('executionTriggerStatus');
    const rowElement = document.getElementById('executionTriggerRow');
    
    if (statusElement && rowElement) {
        if (triggered) {
            statusElement.textContent = '활성';
            statusElement.className = 'krds-badge krds-badge--success';
            rowElement.setAttribute('data-status', 'active');
        } else {
            statusElement.textContent = '비활성';
            statusElement.className = 'krds-badge krds-badge--secondary';
            rowElement.setAttribute('data-status', 'inactive');
        }
    }
}

// 시스템 상태 업데이트
function updateSystemStatus(systemData) {
    // 라즈베리파이 상태 업데이트
    if (systemData.raspberry_pi) {
        updateRaspberryPiStatus(
            systemData.raspberry_pi.cpu || 0,
            systemData.raspberry_pi.memory || 0,
            systemData.raspberry_pi.session || 0,
            systemData.raspberry_pi.network || '활성'
        );
    }
    
    // 아두이노 연결 상태 업데이트
    if (systemData.arduino) {
        updateArduinoStatus(systemData.arduino);
    }
}

// 아두이노 상태 업데이트
function updateArduinoStatus(arduinoData) {
    for (let i = 1; i <= 4; i++) {
        const statusElement = document.getElementById(`port${i}Status`);
        if (statusElement) {
            const connected = arduinoData[`port${i}`] || false;
            if (connected) {
                statusElement.textContent = '연결됨';
                statusElement.className = 'krds-badge krds-badge--success';
            } else {
                statusElement.textContent = '연결 끊김';
                statusElement.className = 'krds-badge krds-badge--danger';
            }
        }
    }
}

// 전역 함수 노출
window.updateStatus = updateStatus;
window.updateMobileConnectionStatus = updateMobileConnectionStatus;
window.updateImageUploadStatus = updateImageUploadStatus;
window.updateExecutionTriggerStatus = updateExecutionTriggerStatus;
window.updateSystemStatus = updateSystemStatus;
window.updateArduinoStatus = updateArduinoStatus;