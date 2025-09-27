/**
 * Performance Optimizer
 * TETRIS Web Interface - 성능 최적화 시스템
 * 라즈베리파이5 16GB 최적화 전용
 * 
 * @author 웹 인터페이스 전문가
 * @date 2025-09-23
 * @version 1.0.0
 */

class PerformanceOptimizer {
    constructor(options = {}) {
        this.config = window.CONFIG || {};
        this.raspberryPiConfig = this.config.RASPBERRY_PI || {};
        this.uiConfig = this.config.UI || {};
        
        // 성능 메트릭
        this.metrics = {
            domUpdates: 0,
            skippedUpdates: 0,
            memoryUsage: 0,
            renderTime: 0,
            fpsHistory: [],
            lastFrameTime: 0
        };
        
        // DOM 업데이트 최적화
        this.domUpdater = new SmartDOMUpdater();
        this.adaptivePoller = new AdaptivePoller();
        this.memoryManager = new MemoryManager();
        
        // 성능 모니터링
        this.performanceObserver = null;
        this.isMonitoring = false;
        
        // 쓰로틀링 및 디바운싱
        this.throttledFunctions = new Map();
        this.debouncedFunctions = new Map();
        
        this.init();
    }

    /**
     * 성능 최적화 시스템 초기화
     */
    init() {
        this.setupPerformanceObserver();
        this.startMemoryMonitoring();
        this.optimizeEventListeners();
        
        console.log('⚡ PerformanceOptimizer 초기화 완료 (라즈베리파이5 최적화)');
    }

    /**
     * 성능 관찰자 설정
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processPerformanceEntry(entry);
                }
            });

            // 다양한 성능 메트릭 관찰
            try {
                this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
                this.isMonitoring = true;
            } catch (error) {
                console.warn('⚠️ Performance Observer 설정 실패:', error);
            }
        }
    }

    /**
     * 성능 엔트리 처리
     * @param {PerformanceEntry} entry - 성능 엔트리
     */
    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'paint':
                if (entry.name === 'first-contentful-paint') {
                    console.log(`🎨 FCP: ${entry.startTime.toFixed(2)}ms`);
                }
                break;
                
            case 'navigation':
                console.log(`🌐 페이지 로드: ${entry.loadEventEnd.toFixed(2)}ms`);
                break;
                
            case 'measure':
                this.metrics.renderTime = entry.duration;
                break;
        }
    }

    /**
     * 메모리 모니터링 시작
     */
    startMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
                
                // 라즈베리파이5 메모리 임계값 확인
                const threshold = this.raspberryPiConfig.MEMORY_THRESHOLD || 90;
                const totalMemory = memory.totalJSHeapSize / 1024 / 1024;
                const memoryPercent = (this.metrics.memoryUsage / totalMemory) * 100;
                
                if (memoryPercent > threshold) {
                    console.warn(`⚠️ 메모리 사용량 높음: ${memoryPercent.toFixed(1)}%`);
                    this.triggerMemoryCleanup();
                }
            }, 30000); // 30초마다 체크
        }
    }

    /**
     * 메모리 정리 트리거
     */
    triggerMemoryCleanup() {
        console.log('🧹 메모리 정리 시작...');
        
        // 가비지 컬렉션 힌트 (Chrome에서만 동작)
        if (window.gc) {
            window.gc();
        }
        
        // 캐시 정리
        this.clearCaches();
        
        // 메모리 매니저를 통한 정리
        this.memoryManager.cleanup();
        
        console.log('✅ 메모리 정리 완료');
    }

    /**
     * 캐시 정리
     */
    clearCaches() {
        // 함수 캐시 정리
        this.throttledFunctions.clear();
        this.debouncedFunctions.clear();
        
        // DOM 업데이터 캐시 정리
        this.domUpdater.clearCache();
    }

    /**
     * 이벤트 리스너 최적화
     */
    optimizeEventListeners() {
        // 패시브 이벤트 리스너 사용
        const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];
        
        passiveEvents.forEach(eventType => {
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (passiveEvents.includes(type) && typeof options !== 'object') {
                    options = { passive: true };
                } else if (typeof options === 'object' && options.passive === undefined) {
                    options.passive = true;
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        });
    }

    /**
     * 함수 쓰로틀링
     * @param {Function} func - 쓰로틀할 함수
     * @param {number} delay - 지연 시간 (ms)
     * @param {string} [key] - 캐시 키
     * @returns {Function} 쓰로틀된 함수
     */
    throttle(func, delay, key = null) {
        const cacheKey = key || func.toString();
        
        if (this.throttledFunctions.has(cacheKey)) {
            return this.throttledFunctions.get(cacheKey);
        }

        let lastCall = 0;
        const throttledFunc = (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };

        this.throttledFunctions.set(cacheKey, throttledFunc);
        return throttledFunc;
    }

    /**
     * 함수 디바운싱
     * @param {Function} func - 디바운스할 함수
     * @param {number} delay - 지연 시간 (ms)
     * @param {string} [key] - 캐시 키
     * @returns {Function} 디바운스된 함수
     */
    debounce(func, delay, key = null) {
        const cacheKey = key || func.toString();
        
        if (this.debouncedFunctions.has(cacheKey)) {
            return this.debouncedFunctions.get(cacheKey);
        }

        let timeoutId;
        const debouncedFunc = (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };

        this.debouncedFunctions.set(cacheKey, debouncedFunc);
        return debouncedFunc;
    }

    /**
     * requestAnimationFrame 기반 배치 처리
     * @param {Function} callback - 실행할 콜백
     */
    batchUpdate(callback) {
        this.domUpdater.addToBatch(callback);
    }

    /**
     * 성능 메트릭 조회
     * @returns {Object} 성능 메트릭
     */
    getMetrics() {
        return {
            ...this.metrics,
            memoryUsageMB: this.metrics.memoryUsage.toFixed(2),
            domUpdateRate: this.metrics.domUpdates / (this.metrics.domUpdates + this.metrics.skippedUpdates),
            averageFPS: this.calculateAverageFPS()
        };
    }

    /**
     * 평균 FPS 계산
     * @returns {number} 평균 FPS
     */
    calculateAverageFPS() {
        if (this.metrics.fpsHistory.length === 0) return 0;
        
        const sum = this.metrics.fpsHistory.reduce((a, b) => a + b, 0);
        return sum / this.metrics.fpsHistory.length;
    }

    /**
     * FPS 모니터링 시작
     */
    startFPSMonitoring() {
        let frames = 0;
        let startTime = performance.now();

        const countFrame = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= startTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - startTime));
                this.metrics.fpsHistory.push(fps);
                
                // 최근 10개 프레임만 유지
                if (this.metrics.fpsHistory.length > 10) {
                    this.metrics.fpsHistory.shift();
                }
                
                frames = 0;
                startTime = currentTime;
            }
            
            requestAnimationFrame(countFrame);
        };

        requestAnimationFrame(countFrame);
    }

    /**
     * 성능 최적화 정리
     */
    cleanup() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        this.clearCaches();
        this.memoryManager.cleanup();
        
        console.log('🧹 PerformanceOptimizer 정리 완료');
    }
}

/**
 * 스마트 DOM 업데이터
 * 변경사항이 있을 때만 DOM을 업데이트하고 배치 처리를 수행
 */
class SmartDOMUpdater {
    constructor() {
        this.updateQueue = [];
        this.isUpdating = false;
        this.lastValues = new Map();
        this.updateCount = 0;
        this.skipCount = 0;
    }

    /**
     * 요소 업데이트 (스마트 감지)
     * @param {string|Element} selector - 선택자 또는 요소
     * @param {string} newValue - 새로운 값
     * @param {string} [property='textContent'] - 업데이트할 속성
     * @returns {boolean} 업데이트 여부
     */
    updateElement(selector, newValue, property = 'textContent') {
        const element = typeof selector === 'string' ? 
            document.querySelector(selector) : selector;
            
        if (!element) {
            console.warn(`⚠️ 요소를 찾을 수 없음: ${selector}`);
            return false;
        }

        const key = this.getElementKey(element, property);
        const currentValue = element[property];

        // 값이 변경되지 않았다면 스킵
        if (currentValue === newValue) {
            this.skipCount++;
            return false;
        }

        // 배치 큐에 추가
        this.addToBatch(() => {
            element[property] = newValue;
            this.lastValues.set(key, newValue);
            this.updateCount++;
        });

        return true;
    }

    /**
     * 요소 키 생성
     * @param {Element} element - DOM 요소
     * @param {string} property - 속성
     * @returns {string} 고유 키
     */
    getElementKey(element, property) {
        const id = element.id || element.className || element.tagName;
        return `${id}_${property}`;
    }

    /**
     * 배치에 추가
     * @param {Function} updateFunction - 업데이트 함수
     */
    addToBatch(updateFunction) {
        this.updateQueue.push(updateFunction);
        
        if (!this.isUpdating) {
            this.scheduleBatchUpdate();
        }
    }

    /**
     * 배치 업데이트 스케줄링
     */
    scheduleBatchUpdate() {
        this.isUpdating = true;
        
        requestAnimationFrame(() => {
            this.flushUpdates();
            this.isUpdating = false;
        });
    }

    /**
     * 배치 업데이트 실행
     */
    flushUpdates() {
        const startTime = performance.now();
        
        // 배치 크기 제한 (라즈베리파이5 최적화)
        const batchSize = window.CONFIG?.UI?.UPDATE_BATCH_SIZE || 10;
        const batch = this.updateQueue.splice(0, batchSize);
        
        batch.forEach(updateFunction => {
            try {
                updateFunction();
            } catch (error) {
                console.error('❌ DOM 업데이트 오류:', error);
            }
        });

        const duration = performance.now() - startTime;
        
        // 성능 측정
        if (window.performanceOptimizer) {
            window.performanceOptimizer.metrics.renderTime = duration;
            window.performanceOptimizer.metrics.domUpdates += batch.length;
        }

        // 남은 업데이트가 있다면 다음 프레임에서 처리
        if (this.updateQueue.length > 0) {
            this.scheduleBatchUpdate();
        }
    }

    /**
     * 캐시 정리
     */
    clearCache() {
        this.lastValues.clear();
        this.updateQueue = [];
    }

    /**
     * 통계 조회
     * @returns {Object} 업데이트 통계
     */
    getStats() {
        return {
            updateCount: this.updateCount,
            skipCount: this.skipCount,
            efficiency: this.updateCount / (this.updateCount + this.skipCount),
            queueLength: this.updateQueue.length
        };
    }
}

/**
 * 적응형 폴러
 * 시스템 상태에 따라 폴링 간격을 동적으로 조정
 */
class AdaptivePoller {
    constructor() {
        this.config = window.CONFIG?.UI?.POLLING_INTERVAL || {
            ACTIVE: 2000,
            IDLE: 10000,
            ERROR: 30000
        };
        
        this.currentState = 'IDLE';
        this.currentInterval = this.config.IDLE;
        this.pollingTimer = null;
        this.callbacks = [];
    }

    /**
     * 폴링 시작
     * @param {Function} callback - 폴링 콜백
     */
    start(callback) {
        if (callback) {
            this.callbacks.push(callback);
        }
        
        if (!this.pollingTimer) {
            this.scheduleNext();
        }
    }

    /**
     * 폴링 중지
     */
    stop() {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    /**
     * 상태 변경
     * @param {string} newState - 새로운 상태 (ACTIVE, IDLE, ERROR)
     */
    setState(newState) {
        if (this.currentState !== newState) {
            console.log(`🔄 폴링 상태 변경: ${this.currentState} → ${newState}`);
            
            this.currentState = newState;
            const newInterval = this.config[newState] || this.config.IDLE;
            
            if (newInterval !== this.currentInterval) {
                this.currentInterval = newInterval;
                this.restart();
            }
        }
    }

    /**
     * 폴링 재시작
     */
    restart() {
        this.stop();
        this.scheduleNext();
    }

    /**
     * 다음 폴링 스케줄링
     */
    scheduleNext() {
        this.pollingTimer = setTimeout(async () => {
            try {
                // 모든 콜백 실행
                await Promise.all(this.callbacks.map(callback => callback()));
                
                // 다음 폴링 스케줄
                this.scheduleNext();
                
            } catch (error) {
                console.error('❌ 폴링 오류:', error);
                this.setState('ERROR');
                this.scheduleNext();
            }
        }, this.currentInterval);
    }

    /**
     * 콜백 추가
     * @param {Function} callback - 폴링 콜백
     */
    addCallback(callback) {
        this.callbacks.push(callback);
    }

    /**
     * 콜백 제거
     * @param {Function} callback - 제거할 콜백
     */
    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }
}

/**
 * 메모리 매니저
 * 이벤트 리스너, 타이머, 옵저버 등의 메모리 누수 방지
 */
class MemoryManager {
    constructor() {
        this.eventListeners = [];
        this.timers = [];
        this.observers = [];
        this.intervals = [];
        this.animationFrames = [];
    }

    /**
     * 이벤트 리스너 추가 (자동 추적)
     * @param {Element} element - 요소
     * @param {string} event - 이벤트 타입
     * @param {Function} handler - 핸들러
     * @param {Object} [options] - 옵션
     */
    addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * 타이머 추가 (자동 추적)
     * @param {Function} callback - 콜백
     * @param {number} delay - 지연 시간
     * @returns {number} 타이머 ID
     */
    setTimeout(callback, delay) {
        const timerId = setTimeout(callback, delay);
        this.timers.push(timerId);
        return timerId;
    }

    /**
     * 인터벌 추가 (자동 추적)
     * @param {Function} callback - 콜백
     * @param {number} interval - 간격
     * @returns {number} 인터벌 ID
     */
    setInterval(callback, interval) {
        const intervalId = setInterval(callback, interval);
        this.intervals.push(intervalId);
        return intervalId;
    }

    /**
     * 애니메이션 프레임 추가 (자동 추적)
     * @param {Function} callback - 콜백
     * @returns {number} 프레임 ID
     */
    requestAnimationFrame(callback) {
        const frameId = requestAnimationFrame(callback);
        this.animationFrames.push(frameId);
        return frameId;
    }

    /**
     * 옵저버 추가 (자동 추적)
     * @param {Object} observer - 옵저버 (MutationObserver, IntersectionObserver 등)
     */
    addObserver(observer) {
        this.observers.push(observer);
    }

    /**
     * 모든 리소스 정리
     */
    cleanup() {
        // 이벤트 리스너 정리
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            try {
                element.removeEventListener(event, handler, options);
            } catch (error) {
                console.warn('⚠️ 이벤트 리스너 제거 실패:', error);
            }
        });

        // 타이머 정리
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));

        // 옵저버 정리
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('⚠️ 옵저버 해제 실패:', error);
            }
        });

        // 배열 초기화
        this.eventListeners = [];
        this.timers = [];
        this.intervals = [];
        this.animationFrames = [];
        this.observers = [];

        console.log('🧹 MemoryManager 정리 완료');
    }

    /**
     * 메모리 사용량 조회
     * @returns {Object} 추적 중인 리소스 수
     */
    getResourceCount() {
        return {
            eventListeners: this.eventListeners.length,
            timers: this.timers.length,
            intervals: this.intervals.length,
            animationFrames: this.animationFrames.length,
            observers: this.observers.length
        };
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.performanceOptimizer = new PerformanceOptimizer();
    window.PerformanceOptimizer = PerformanceOptimizer;
    window.SmartDOMUpdater = SmartDOMUpdater;
    window.AdaptivePoller = AdaptivePoller;
    window.MemoryManager = MemoryManager;

    // FPS 모니터링 시작 (디버그 모드에서만)
    if (window.CONFIG?.DEBUG?.PERFORMANCE_MONITORING) {
        window.performanceOptimizer.startFPSMonitoring();
    }
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PerformanceOptimizer, 
        SmartDOMUpdater, 
        AdaptivePoller, 
        MemoryManager 
    };
}
