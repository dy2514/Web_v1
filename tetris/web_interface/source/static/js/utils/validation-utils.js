/**
 * Validation Utilities
 * TETRIS Web Interface - 유효성 검사 유틸리티
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 */

class ValidationUtils {
    /**
     * 세션 ID 유효성 검사
     * @param {string} sessionId - 세션 ID
     * @returns {boolean} 유효 여부
     */
    static isValidSessionId(sessionId) {
        return typeof sessionId === 'string' && 
               sessionId.length > 10 && 
               sessionId.startsWith('session_');
    }

    /**
     * 진행률 유효성 검사
     * @param {number} progress - 진행률 (0-100)
     * @returns {boolean} 유효 여부
     */
    static isValidProgress(progress) {
        return typeof progress === 'number' && 
               progress >= 0 && 
               progress <= 100 && 
               !isNaN(progress);
    }

    /**
     * 파일 유효성 검사
     * @param {File} file - 파일 객체
     * @returns {boolean} 유효 여부
     */
    static isValidFile(file) {
        if (!(file instanceof File)) {
            return false;
        }

        const config = window.CONFIG || {};
        const maxSize = config.RASPBERRY_PI?.FILE_SIZE_LIMIT || (5 * 1024 * 1024); // 5MB
        
        return file.type.startsWith('image/') && 
               file.size > 0 && 
               file.size <= maxSize;
    }

    /**
     * 인원 수 유효성 검사
     * @param {number} peopleCount - 인원 수
     * @returns {boolean} 유효 여부
     */
    static isValidPeopleCount(peopleCount) {
        return typeof peopleCount === 'number' && 
               Number.isInteger(peopleCount) && 
               peopleCount >= 0 && 
               peopleCount <= 4;
    }

    /**
     * URL 유효성 검사
     * @param {string} url - URL
     * @returns {boolean} 유효 여부
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 이메일 유효성 검사
     * @param {string} email - 이메일 주소
     * @returns {boolean} 유효 여부
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return typeof email === 'string' && emailRegex.test(email);
    }

    /**
     * 상태 코드 유효성 검사
     * @param {string} status - 상태 코드
     * @returns {boolean} 유효 여부
     */
    static isValidStatus(status) {
        const validStatuses = [
            'idle', 'connected', 'uploading', 'uploaded',
            'processing', 'analyzing', 'generating', 'finalizing',
            'completed', 'error', 'timeout', 'cancelled'
        ];
        
        return typeof status === 'string' && validStatuses.includes(status);
    }

    /**
     * JSON 문자열 유효성 검사
     * @param {string} jsonString - JSON 문자열
     * @returns {boolean} 유효 여부
     */
    static isValidJson(jsonString) {
        if (typeof jsonString !== 'string') {
            return false;
        }

        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 객체 스키마 검증
     * @param {Object} obj - 검증할 객체
     * @param {Object} schema - 스키마 정의
     * @returns {Object} 검증 결과 { valid: boolean, errors: string[] }
     */
    static validateSchema(obj, schema) {
        const errors = [];

        if (!obj || typeof obj !== 'object') {
            return { valid: false, errors: ['객체가 아닙니다.'] };
        }

        for (const [key, rules] of Object.entries(schema)) {
            const value = obj[key];

            // 필수 필드 검사
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`${key}는 필수 필드입니다.`);
                continue;
            }

            // 값이 없고 필수가 아니면 건너뛰기
            if (value === undefined || value === null) {
                continue;
            }

            // 타입 검사
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${key}의 타입이 올바르지 않습니다. 예상: ${rules.type}, 실제: ${typeof value}`);
                continue;
            }

            // 최소값 검사
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${key}는 ${rules.min} 이상이어야 합니다.`);
            }

            // 최대값 검사
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${key}는 ${rules.max} 이하여야 합니다.`);
            }

            // 최소 길이 검사
            if (rules.minLength !== undefined && value.length < rules.minLength) {
                errors.push(`${key}는 최소 ${rules.minLength}자 이상이어야 합니다.`);
            }

            // 최대 길이 검사
            if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                errors.push(`${key}는 최대 ${rules.maxLength}자 이하여야 합니다.`);
            }

            // 패턴 검사
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${key}의 형식이 올바르지 않습니다.`);
            }

            // 열거값 검사
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${key}는 다음 중 하나여야 합니다: ${rules.enum.join(', ')}`);
            }

            // 커스텀 검증 함수
            if (rules.validator && typeof rules.validator === 'function') {
                const customResult = rules.validator(value);
                if (customResult !== true) {
                    errors.push(typeof customResult === 'string' ? customResult : `${key}가 유효하지 않습니다.`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 파일 이름 안전성 검사
     * @param {string} filename - 파일 이름
     * @returns {boolean} 안전 여부
     */
    static isSafeFilename(filename) {
        if (typeof filename !== 'string' || filename.length === 0) {
            return false;
        }

        // 위험한 문자들 체크
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

        return !dangerousChars.test(filename) && 
               !reservedNames.test(filename) &&
               filename.length <= 255;
    }

    /**
     * HTML/XSS 입력 안전성 검사
     * @param {string} input - 입력 문자열
     * @returns {boolean} 안전 여부
     */
    static isSafeHtmlInput(input) {
        if (typeof input !== 'string') {
            return false;
        }

        // 기본적인 XSS 패턴 검사
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
        ];

        return !xssPatterns.some(pattern => pattern.test(input));
    }

    /**
     * 데이터 무결성 검사 (체크섬)
     * @param {string} data - 데이터
     * @param {string} expectedChecksum - 예상 체크섬
     * @returns {Promise<boolean>} 무결성 여부
     */
    static async validateChecksum(data, expectedChecksum) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex === expectedChecksum;
        } catch (error) {
            console.error('체크섬 검증 실패:', error);
            return false;
        }
    }

    /**
     * 라즈베리파이5 리소스 제한 검사
     * @param {Object} resource - 리소스 사용량
     * @returns {Object} 검사 결과
     */
    static validateRaspberryPiResources(resource) {
        const config = window.CONFIG?.RASPBERRY_PI || {};
        const result = {
            valid: true,
            warnings: [],
            errors: []
        };

        // 메모리 사용량 검사
        if (resource.memoryPercent > (config.MEMORY_THRESHOLD || 90)) {
            result.errors.push(`메모리 사용량이 임계값을 초과했습니다: ${resource.memoryPercent}%`);
            result.valid = false;
        } else if (resource.memoryPercent > 70) {
            result.warnings.push(`메모리 사용량이 높습니다: ${resource.memoryPercent}%`);
        }

        // CPU 사용량 검사
        if (resource.cpuPercent > (config.CPU_THRESHOLD || 80)) {
            result.errors.push(`CPU 사용량이 임계값을 초과했습니다: ${resource.cpuPercent}%`);
            result.valid = false;
        } else if (resource.cpuPercent > 60) {
            result.warnings.push(`CPU 사용량이 높습니다: ${resource.cpuPercent}%`);
        }

        // 디스크 사용량 검사
        if (resource.diskPercent > (config.DISK_THRESHOLD || 85)) {
            result.errors.push(`디스크 사용량이 임계값을 초과했습니다: ${resource.diskPercent}%`);
            result.valid = false;
        } else if (resource.diskPercent > 70) {
            result.warnings.push(`디스크 사용량이 높습니다: ${resource.diskPercent}%`);
        }

        return result;
    }
}

// 전역 exports
if (typeof window !== 'undefined') {
    window.ValidationUtils = ValidationUtils;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}
