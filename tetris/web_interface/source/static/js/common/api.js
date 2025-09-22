/**
 * 공통 API 통신 관리 (DEPRECATED - HTTP + SSE 하이브리드로 대체됨)
 * Phase 2.4: 기본 API 호출 구조 구현
 * 
 * 새로운 통신 구조를 사용하려면:
 * - http-api-manager.js
 * - sse-manager.js  
 * - communication-manager.js
 * 를 사용하세요.
 */

class ApiManager {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.timeout = options.timeout || 30000;
        this.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // 요청/응답 인터셉터
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    /**
     * GET 요청
     */
    async get(url, options = {}) {
        return this.request('GET', url, null, options);
    }

    /**
     * POST 요청
     */
    async post(url, data = null, options = {}) {
        return this.request('POST', url, data, options);
    }

    /**
     * PUT 요청
     */
    async put(url, data = null, options = {}) {
        return this.request('PUT', url, data, options);
    }

    /**
     * DELETE 요청
     */
    async delete(url, options = {}) {
        return this.request('DELETE', url, null, options);
    }

    /**
     * 파일 업로드 요청
     */
    async upload(url, formData, options = {}) {
        const uploadOptions = {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers
            }
        };
        
        // Content-Type 제거 (FormData가 자동으로 설정)
        delete uploadOptions.headers['Content-Type'];
        
        return this.request('POST', url, formData, uploadOptions);
    }

    /**
     * 기본 요청 메서드
     */
    async request(method, url, data = null, options = {}) {
        const config = {
            method,
            url: this.baseUrl + url,
            data,
            timeout: this.timeout,
            headers: { ...this.headers, ...options.headers },
            ...options
        };

        // 요청 인터셉터 실행
        for (const interceptor of this.requestInterceptors) {
            await interceptor(config);
        }

        try {
            const response = await this.executeRequest(config);
            
            // 응답 인터셉터 실행
            for (const interceptor of this.responseInterceptors) {
                await interceptor(response);
            }

            return response;
        } catch (error) {
            // 에러 응답 인터셉터 실행
            for (const interceptor of this.responseInterceptors) {
                await interceptor(null, error);
            }
            throw error;
        }
    }

    /**
     * 실제 요청 실행
     */
    async executeRequest(config) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open(config.method, config.url);
            
            // 헤더 설정
            Object.keys(config.headers).forEach(key => {
                xhr.setRequestHeader(key, config.headers[key]);
            });

            // 타임아웃 설정
            xhr.timeout = config.timeout;

            // 응답 처리
            xhr.onload = () => {
                try {
                    let responseData = xhr.responseText;
                    
                    // JSON 응답 파싱 시도
                    if (xhr.getResponseHeader('Content-Type')?.includes('application/json')) {
                        responseData = JSON.parse(responseData);
                    }

                    const response = {
                        data: responseData,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: this.parseHeaders(xhr.getAllResponseHeaders())
                    };

                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    } else {
                        reject(new ApiError('Request failed', response));
                    }
                } catch (error) {
                    reject(new ApiError('Response parsing failed', { status: xhr.status, error }));
                }
            };

            // 에러 처리
            xhr.onerror = () => {
                reject(new ApiError('Network error', { status: xhr.status }));
            };

            xhr.ontimeout = () => {
                reject(new ApiError('Request timeout', { status: 408 }));
            };

            // 데이터 전송
            if (config.data instanceof FormData) {
                xhr.send(config.data);
            } else if (config.data) {
                xhr.send(JSON.stringify(config.data));
            } else {
                xhr.send();
            }
        });
    }

    /**
     * 헤더 파싱
     */
    parseHeaders(headersString) {
        const headers = {};
        headersString.split('\r\n').forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) {
                headers[key] = value;
            }
        });
        return headers;
    }

    /**
     * 요청 인터셉터 추가
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * 응답 인터셉터 추가
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * 시뮬레이션 모드 설정
     */
    setSimulationMode(enabled) {
        this.simulationMode = enabled;
    }

    /**
     * 시뮬레이션 응답 생성
     */
    async simulateRequest(method, url, data, options = {}) {
        console.log(`시뮬레이션 API 요청: ${method} ${url}`, data);
        
        // 시뮬레이션 지연
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        // URL별 시뮬레이션 응답
        const simulationResponses = {
            '/api/upload': {
                success: true,
                file_id: 'sim_' + Math.random().toString(36).substr(2, 9),
                filename: data?.name || 'test.jpg',
                size: data?.size || 1024000,
                url: '/static/uploads/sample.jpg',
                timestamp: new Date().toISOString()
            },
            '/api/start_chain': {
                success: true,
                chain_id: Math.floor(Math.random() * 1000),
                status: 'started',
                timestamp: new Date().toISOString()
            },
            '/api/chain_status': {
                success: true,
                chain_id: 1,
                status: 'running',
                progress: Math.floor(Math.random() * 100),
                current_step: Math.floor(Math.random() * 4) + 1,
                timestamp: new Date().toISOString()
            },
            '/api/get_progress': {
                success: true,
                overall_progress: Math.floor(Math.random() * 100),
                current_step: Math.floor(Math.random() * 4) + 1,
                steps: [
                    { id: 1, name: '이미지 분석', status: 'completed', progress: 100 },
                    { id: 2, name: '데이터 처리', status: 'running', progress: 75 },
                    { id: 3, name: '결과 생성', status: 'pending', progress: 0 },
                    { id: 4, name: '하드웨어 코드 생성', status: 'pending', progress: 0 }
                ],
                timestamp: new Date().toISOString()
            },
            '/api/trigger_hw': {
                success: true,
                hardware_id: 'sim_hw_' + Math.random().toString(36).substr(2, 9),
                status: 'started',
                timestamp: new Date().toISOString()
            }
        };

        const response = simulationResponses[url] || {
            success: true,
            message: '시뮬레이션 응답',
            timestamp: new Date().toISOString()
        };

        return {
            data: response,
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
        };
    }
}

/**
 * API 에러 클래스
 */
class ApiError extends Error {
    constructor(message, response) {
        super(message);
        this.name = 'ApiError';
        this.response = response;
    }
}

// 전역 API 매니저 인스턴스
window.apiManager = new ApiManager({
    baseUrl: '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 시뮬레이션 모드 설정 (Phase 3까지 사용)
window.apiManager.setSimulationMode(true);

// 요청 인터셉터 추가 (로깅)
window.apiManager.addRequestInterceptor((config) => {
    console.log(`API 요청: ${config.method} ${config.url}`, config.data);
});

// 응답 인터셉터 추가 (로깅)
window.apiManager.addResponseInterceptor((response, error) => {
    if (error) {
        console.error('API 오류:', error);
    } else {
        console.log('API 응답:', response.data);
    }
});

// 시뮬레이션 모드에서 실제 요청을 시뮬레이션으로 대체
const originalRequest = window.apiManager.request.bind(window.apiManager);
window.apiManager.request = async function(method, url, data, options) {
    if (this.simulationMode) {
        return this.simulateRequest(method, url, data, options);
    }
    return originalRequest(method, url, data, options);
};

// 편의 함수들
window.api = {
    /**
     * 파일 업로드
     */
    async uploadFile(file, additionalData = {}) {
        const formData = new FormData();
        formData.append('photo', file);
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });
        
        return window.apiManager.upload('/api/upload', formData);
    },

    /**
     * 체인 시작
     */
    async startChain(data) {
        return window.apiManager.post('/api/start_chain', data);
    },

    /**
     * 체인 상태 조회
     */
    async getChainStatus(chainId) {
        return window.apiManager.get(`/api/chain_status/${chainId}`);
    },

    /**
     * 진행상황 조회
     */
    async getProgress() {
        return window.apiManager.get('/api/get_progress');
    },

    /**
     * 하드웨어 제어
     */
    async triggerHardware(data) {
        return window.apiManager.post('/api/trigger_hw', data);
    },

    /**
     * 세션 목록 조회
     */
    async getSessions() {
        return window.apiManager.get('/api/sessions');
    }
};


