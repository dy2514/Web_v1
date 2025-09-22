/**
 * 공통 파일 업로드 관리
 * Phase 2.4: 기본 업로드 기능 구현
 */

class FileUploadManager {
    constructor(options = {}) {
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.uploadUrl = options.uploadUrl || '/mobile/api/upload';
        this.onProgress = options.onProgress || (() => {});
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});
    }

    /**
     * 파일 검증
     */
    validateFile(file) {
        // 파일 크기 검증
        if (file.size > this.maxFileSize) {
            throw new Error(`파일 크기는 ${this.formatFileSize(this.maxFileSize)} 이하여야 합니다.`);
        }

        // 파일 타입 검증
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error('지원하지 않는 파일 형식입니다. 이미지 파일만 업로드 가능합니다.');
        }

        return true;
    }

    /**
     * 파일 업로드
     */
    async uploadFile(file, additionalData = {}) {
        try {
            // 파일 검증
            this.validateFile(file);

            // FormData 생성
            const formData = new FormData();
            formData.append('photo', file);
            
            // 추가 데이터 추가
            Object.keys(additionalData).forEach(key => {
                formData.append(key, additionalData[key]);
            });

            // XMLHttpRequest로 업로드 (진행률 표시를 위해)
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // 진행률 업데이트
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        this.onProgress(percentComplete);
                    }
                });

                // 응답 처리
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            this.onSuccess(response);
                            resolve(response);
                        } catch (e) {
                            reject(new Error('서버 응답을 파싱할 수 없습니다.'));
                        }
                    } else {
                        reject(new Error(`업로드 실패: ${xhr.status}`));
                    }
                });

                // 오류 처리
                xhr.addEventListener('error', () => {
                    reject(new Error('네트워크 오류가 발생했습니다.'));
                });

                // 업로드 시작
                xhr.open('POST', this.uploadUrl);
                xhr.send(formData);
            });

        } catch (error) {
            this.onError(error);
            throw error;
        }
    }

    /**
     * 시뮬레이션 업로드 (Phase 3까지 사용)
     */
    async simulateUpload(file, additionalData = {}) {
        try {
            // 파일 검증
            this.validateFile(file);

            // 시뮬레이션 진행률 업데이트
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                this.onProgress(progress);
            }, 200);

            // 시뮬레이션 완료 대기
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 시뮬레이션 응답
            const response = {
                success: true,
                file_id: 'sim_' + Math.random().toString(36).substr(2, 9),
                filename: file.name,
                size: file.size,
                url: URL.createObjectURL(file),
                timestamp: new Date().toISOString(),
                ...additionalData
            };

            this.onSuccess(response);
            return response;

        } catch (error) {
            this.onError(error);
            throw error;
        }
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 이미지 미리보기 생성
     */
    createPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 이미지 리사이징 (선택사항)
     */
    async resizeImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 원본 비율 유지하면서 리사이징
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 이미지 그리기
                ctx.drawImage(img, 0, 0, width, height);

                // Blob으로 변환
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    }));
                }, file.type, quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }
}

// 전역 파일 업로드 매니저 인스턴스
window.fileUploadManager = new FileUploadManager({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadUrl: '/mobile/api/upload',
    onProgress: (progress) => {
        console.log(`업로드 진행률: ${Math.round(progress)}%`);
    },
    onSuccess: (response) => {
        console.log('업로드 성공:', response);
    },
    onError: (error) => {
        console.error('업로드 오류:', error);
    }
});

// 유틸리티 함수들
window.fileUploadUtils = {
    /**
     * 드래그 앤 드롭 이벤트 바인딩
     */
    bindDragDrop(element, callback) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                callback(files[0]);
            }
        });
    },

    /**
     * 파일 선택 이벤트 바인딩
     */
    bindFileSelect(inputElement, callback) {
        inputElement.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                callback(file);
            }
        });
    },

    /**
     * 이미지 압축 및 업로드
     */
    async compressAndUpload(file, options = {}) {
        try {
            // 이미지 리사이징
            const resizedFile = await window.fileUploadManager.resizeImage(
                file, 
                options.maxWidth || 1920, 
                options.maxHeight || 1080, 
                options.quality || 0.8
            );

            // 업로드
            return await window.fileUploadManager.simulateUpload(resizedFile, options.additionalData);
        } catch (error) {
            console.error('압축 및 업로드 오류:', error);
            throw error;
        }
    }
};


