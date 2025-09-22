/**
 * HTTP API Manager - HTTP API 전용 관리자
 * Phase 2: HTTP + SSE 하이브리드 통신 구조
 */

class HttpApiManager {
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
     * 기본 요청 메서드
     */
    async request(method, url, data = null) {
        const config = {
            method,
            url: this.baseUrl + url,
            data: data ? JSON.stringify(data) : null,
            timeout: this.timeout,
            headers: { ...this.headers }
        };

        // 요청 인터셉터 실행
        for (const interceptor of this.requestInterceptors) {
            await interceptor(config);
        }

        try {
            const response = await fetch(config.url, {
                method: config.method,
                body: config.data,
                headers: config.headers,
                timeout: config.timeout
            });

            const result = await response.json();
            
            // 응답 인터셉터 실행
            for (const interceptor of this.responseInterceptors) {
                await interceptor(result, response);
            }
            
            if (!response.ok) {
                throw new Error(result.error || 'Request failed');
            }

            return { data: result, status: response.status };
        } catch (error) {
            console.error('HTTP API Error:', error);
            throw error;
        }
    }

    /**
     * GET 요청
     */
    async get(url) {
        return this.request('GET', url);
    }

    /**
     * POST 요청
     */
    async post(url, data = null) {
        return this.request('POST', url, data);
    }

    /**
     * PUT 요청
     */
    async put(url, data = null) {
        return this.request('PUT', url, data);
    }

    /**
     * DELETE 요청
     */
    async delete(url) {
        return this.request('DELETE', url);
    }

    /**
     * 파일 업로드 요청
     */
    async upload(url, formData) {
        const response = await fetch(this.baseUrl + url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }

        return { data: result, status: response.status };
    }

    // === TETRIS 전용 API 메서드들 ===

    /**
     * 세션 참여
     */
    async joinSession(sessionId, sessionType = 'desktop') {
        return this.post('/desktop/api/join_session', { 
            session_id: sessionId, 
            type: sessionType 
        });
    }

    /**
     * AI 처리 시작
     */
    async startProcessing(sessionId) {
        return this.post('/desktop/api/start_processing', { session_id: sessionId });
    }

    /**
     * 파일 업로드
     */
    async uploadFile(file, peopleCount, sessionId) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('people_count', peopleCount);
        formData.append('session_id', sessionId);

        return this.upload('/mobile/api/upload', formData);
    }

    /**
     * 시스템 초기화
     */
    async resetSystem() {
        return this.post('/desktop/api/reset');
    }

    /**
     * 시스템 상태 조회
     */
    async getStatus() {
        return this.get('/desktop/api/status');
    }

    /**
     * 활성 세션 목록 조회
     */
    async getSessions() {
        return this.get('/desktop/api/sessions');
    }

    /**
     * 특정 세션의 진행 상태 조회
     */
    async getSessionProgress(sessionId) {
        return this.get(`/desktop/api/session/${sessionId}/progress`);
    }

    /**
     * 하드웨어 제어
     */
    async triggerHardware(sessionId, command) {
        return this.post('/desktop/api/trigger_hardware', { 
            session_id: sessionId, 
            command: command 
        });
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
}

// 전역 HTTP API 매니저 인스턴스
window.httpApiManager = new HttpApiManager({
    baseUrl: '',
    timeout: 30000
});

// 요청 인터셉터 추가 (로깅)
window.httpApiManager.addRequestInterceptor((config) => {
    console.log(`HTTP API 요청: ${config.method} ${config.url}`, config.data);
});

// 응답 인터셉터 추가 (로깅)
window.httpApiManager.addResponseInterceptor((data, response) => {
    console.log('HTTP API 응답:', data);
});
