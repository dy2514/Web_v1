/**
 * DOM Utilities
 * TETRIS Web Interface - DOM 조작 유틸리티
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 */

class DOMUtils {
    /**
     * 요소 안전 조회 (null 체크 포함)
     * @param {string} selector - CSS 선택자
     * @returns {Element|null} 찾은 요소 또는 null
     */
    static getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ 요소를 찾을 수 없음: #${id}`);
        }
        return element;
    }

    /**
     * 선택자로 요소 안전 조회
     * @param {string} selector - CSS 선택자
     * @returns {Element|null} 찾은 요소 또는 null
     */
    static querySelector(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`⚠️ 요소를 찾을 수 없음: ${selector}`);
        }
        return element;
    }

    /**
     * 여러 요소 안전 조회
     * @param {string} selector - CSS 선택자
     * @returns {NodeList} 찾은 요소들
     */
    static querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * 텍스트 내용 안전 업데이트
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} text - 새로운 텍스트
     * @returns {boolean} 업데이트 성공 여부
     */
    static updateTextContent(selector, text) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.textContent !== text) {
            element.textContent = text;
            return true;
        }
        return false;
    }

    /**
     * HTML 내용 안전 업데이트 (XSS 방지)
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} html - 새로운 HTML
     * @returns {boolean} 업데이트 성공 여부
     */
    static updateInnerHTML(selector, html) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (!element) return false;

        // XSS 방지를 위한 기본 검증
        if (window.ValidationUtils && !window.ValidationUtils.isSafeHtmlInput(html)) {
            console.warn('⚠️ 안전하지 않은 HTML 입력이 감지되어 업데이트를 건너뜁니다.');
            return false;
        }

        if (element.innerHTML !== html) {
            element.innerHTML = html;
            return true;
        }
        return false;
    }

    /**
     * 속성 안전 업데이트
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} attribute - 속성 이름
     * @param {string} value - 속성 값
     * @returns {boolean} 업데이트 성공 여부
     */
    static updateAttribute(selector, attribute, value) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.getAttribute(attribute) !== value) {
            element.setAttribute(attribute, value);
            return true;
        }
        return false;
    }

    /**
     * 클래스 안전 추가
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} className - 클래스 이름
     * @returns {boolean} 추가 성공 여부
     */
    static addClass(selector, className) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
            return true;
        }
        return false;
    }

    /**
     * 클래스 안전 제거
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} className - 클래스 이름
     * @returns {boolean} 제거 성공 여부
     */
    static removeClass(selector, className) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
            return true;
        }
        return false;
    }

    /**
     * 클래스 토글
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} className - 클래스 이름
     * @returns {boolean} 토글 후 클래스 존재 여부
     */
    static toggleClass(selector, className) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element) {
            return element.classList.toggle(className);
        }
        return false;
    }

    /**
     * 스타일 안전 업데이트
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} property - CSS 속성
     * @param {string} value - CSS 값
     * @returns {boolean} 업데이트 성공 여부
     */
    static updateStyle(selector, property, value) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.style[property] !== value) {
            element.style[property] = value;
            return true;
        }
        return false;
    }

    /**
     * 여러 스타일 일괄 업데이트
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {Object} styles - 스타일 객체
     * @returns {boolean} 업데이트 성공 여부
     */
    static updateStyles(selector, styles) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (!element) return false;

        let updated = false;
        for (const [property, value] of Object.entries(styles)) {
            if (element.style[property] !== value) {
                element.style[property] = value;
                updated = true;
            }
        }
        return updated;
    }

    /**
     * 요소 표시/숨김
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {boolean} visible - 표시 여부
     * @returns {boolean} 업데이트 성공 여부
     */
    static setVisible(selector, visible) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element) {
            const currentDisplay = getComputedStyle(element).display;
            const isCurrentlyVisible = currentDisplay !== 'none';
            
            if (isCurrentlyVisible !== visible) {
                element.style.display = visible ? '' : 'none';
                return true;
            }
        }
        return false;
    }

    /**
     * 요소 활성화/비활성화
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {boolean} enabled - 활성화 여부
     * @returns {boolean} 업데이트 성공 여부
     */
    static setEnabled(selector, enabled) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.disabled !== !enabled) {
            element.disabled = !enabled;
            return true;
        }
        return false;
    }

    /**
     * 이벤트 리스너 안전 추가 (메모리 누수 방지)
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} event - 이벤트 타입
     * @param {Function} handler - 이벤트 핸들러
     * @param {Object} [options] - 이벤트 옵션
     * @returns {boolean} 추가 성공 여부
     */
    static addEventListener(selector, event, handler, options = {}) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler, options);
            
            // 메모리 매니저에 등록 (있는 경우)
            if (window.performanceOptimizer?.memoryManager) {
                window.performanceOptimizer.memoryManager.addEventListener(
                    element, event, handler, options
                );
            }
            
            return true;
        }
        return false;
    }

    /**
     * 이벤트 리스너 제거
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} event - 이벤트 타입
     * @param {Function} handler - 이벤트 핸들러
     * @param {Object} [options] - 이벤트 옵션
     * @returns {boolean} 제거 성공 여부
     */
    static removeEventListener(selector, event, handler, options = {}) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && typeof handler === 'function') {
            element.removeEventListener(event, handler, options);
            return true;
        }
        return false;
    }

    /**
     * 요소 생성 및 설정
     * @param {string} tagName - 태그 이름
     * @param {Object} [options={}] - 설정 옵션
     * @returns {Element} 생성된 요소
     */
    static createElement(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        // 속성 설정
        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                element.setAttribute(key, value);
            }
        }
        
        // 스타일 설정
        if (options.styles) {
            for (const [key, value] of Object.entries(options.styles)) {
                element.style[key] = value;
            }
        }
        
        // 클래스 설정
        if (options.className) {
            element.className = options.className;
        }
        
        // 텍스트 내용 설정
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        // HTML 내용 설정 (XSS 검증 포함)
        if (options.innerHTML) {
            if (!window.ValidationUtils || 
                window.ValidationUtils.isSafeHtmlInput(options.innerHTML)) {
                element.innerHTML = options.innerHTML;
            } else {
                console.warn('⚠️ 안전하지 않은 HTML이 감지되어 textContent로 설정합니다.');
                element.textContent = options.innerHTML;
            }
        }
        
        return element;
    }

    /**
     * 요소 안전 제거
     * @param {string|Element} selector - 선택자 또는 요소
     * @returns {boolean} 제거 성공 여부
     */
    static removeElement(selector) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            return true;
        }
        return false;
    }

    /**
     * 요소 위치 정보 조회
     * @param {string|Element} selector - 선택자 또는 요소
     * @returns {Object|null} 위치 정보 또는 null
     */
    static getElementPosition(selector) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element) {
            const rect = element.getBoundingClientRect();
            return {
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right,
                width: rect.width,
                height: rect.height,
                x: rect.x,
                y: rect.y
            };
        }
        return null;
    }

    /**
     * 스크롤 위치 조회
     * @returns {Object} 스크롤 위치 정보
     */
    static getScrollPosition() {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    }

    /**
     * 부드러운 스크롤
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {Object} [options={}] - 스크롤 옵션
     */
    static smoothScrollTo(selector, options = {}) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: options.block || 'start',
                inline: options.inline || 'nearest'
            });
        }
    }

    /**
     * 폼 데이터 수집
     * @param {string|Element} formSelector - 폼 선택자 또는 요소
     * @returns {Object} 폼 데이터 객체
     */
    static getFormData(formSelector) {
        const form = typeof formSelector === 'string' ? 
            this.querySelector(formSelector) : formSelector;
            
        if (!form || form.tagName !== 'FORM') {
            console.warn('⚠️ 유효한 폼 요소가 아닙니다.');
            return {};
        }

        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    /**
     * 폼 검증
     * @param {string|Element} formSelector - 폼 선택자 또는 요소
     * @returns {boolean} 검증 통과 여부
     */
    static validateForm(formSelector) {
        const form = typeof formSelector === 'string' ? 
            this.querySelector(formSelector) : formSelector;
            
        if (!form || form.tagName !== 'FORM') {
            return false;
        }

        return form.checkValidity();
    }

    /**
     * 로딩 상태 표시
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {boolean} loading - 로딩 상태
     * @param {string} [loadingText='로딩 중...'] - 로딩 텍스트
     */
    static setLoading(selector, loading, loadingText = '로딩 중...') {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (!element) return;

        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
            
            // 원본 텍스트 저장
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.textContent;
            }
            
            element.textContent = loadingText;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
            
            // 원본 텍스트 복원
            if (element.dataset.originalText) {
                element.textContent = element.dataset.originalText;
                delete element.dataset.originalText;
            }
        }
    }

    /**
     * 요소 애니메이션 (CSS 클래스 기반)
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} animationClass - 애니메이션 클래스
     * @param {number} [duration=300] - 애니메이션 지속 시간 (ms)
     * @returns {Promise<void>} 애니메이션 완료 Promise
     */
    static animate(selector, animationClass, duration = 300) {
        const element = typeof selector === 'string' ? 
            this.querySelector(selector) : selector;
            
        if (!element) return Promise.resolve();

        return new Promise((resolve) => {
            const cleanup = () => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', cleanup);
                element.removeEventListener('transitionend', cleanup);
            };

            element.addEventListener('animationend', cleanup, { once: true });
            element.addEventListener('transitionend', cleanup, { once: true });
            
            element.classList.add(animationClass);
            
            // 타임아웃으로 보장
            setTimeout(() => {
                cleanup();
                resolve();
            }, duration);
        });
    }

    /**
     * 클립보드에 텍스트 복사
     * @param {string} text - 복사할 텍스트
     * @returns {Promise<boolean>} 복사 성공 여부
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 폴백 방법
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            return false;
        }
    }
}

// 전역 exports
if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
}
