/**
 * ProgressCore - 공통 진행률/결과 표시 유틸
 * - mobile/progress.js, desktop/control-ai.js 간 공통 로직 통합
 * - DOM 의존 최소화, 필요 값은 컨텍스트/콜백으로 주입
 */

(function () {
    const ProgressCore = {
        safeJsonParse(data) {
            if (data && typeof data === 'object') {
                return data;
            }
            if (typeof data !== 'string') {
                return null;
            }
            let s = data.trim();
            if (s.startsWith('```')) {
                s = s
                    .replace(/^```json\s*/i, '')
                    .replace(/^```/i, '')
                    .replace(/```$/i, '')
                    .trim();
            }
            s = s.replace(/```json\s*|```/gi, '').trim();
            if (!(s.startsWith('{') || s.startsWith('['))) {
                return null;
            }
            try {
                return JSON.parse(s);
            } catch (_) {
                return null;
            }
        },

        getCurrentStepMessage(step) {
            const messages = {
                0: '분석 대기중입니다',
                1: '사용자 입력 분석 중입니다',
                2: '최적 배치 생성 중입니다',
                3: '시트 동작 계획 중입니다',
                4: '하드웨어 구동 중입니다',
                5: '결과 검증 및 완료 중입니다'
            };
            return messages[step] || '분석을 시작하고 있습니다';
        },

        computeProgressForStep(step) {
            switch (step) {
                case 0:
                    return 25;
                case 1:
                    return 0;
                case 2:
                    return 50;
                case 4:
                    return 75;
                case 5:
                    return 100;
                default:
                    return 0;
            }
        },

        updateStepIcon(currentStep, stepNumber) {
            const iconElement = document.getElementById(`step${stepNumber}-icon`);
            if (!iconElement) {
                console.warn(`아이콘 요소를 찾을 수 없습니다: step${stepNumber}-icon`);
                return;
            }
            iconElement.classList.remove('info', 'warning', 'success', 'error');

            if (currentStep >= 4 || currentStep > stepNumber) {
                iconElement.classList.add('success');
                iconElement.innerHTML = `
<svg width="30" height="30" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 30 0 30)" fill="#228738"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
</svg>`;
            } else if (currentStep === stepNumber || (currentStep === 0 && stepNumber === 1)) {
                iconElement.classList.add('warning');
                iconElement.innerHTML = `
<svg width="30" height="30" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8.5" stroke="#D9D9D9" stroke-width="2" fill="none"/>
    <circle cx="10" cy="10" r="8.5" stroke="#3B82F6" stroke-width="2" fill="none" stroke-dasharray="28.57" stroke-dashoffset="9.42" stroke-linecap="round"/>
</svg>`;
            } else {
                iconElement.classList.add('info');
                iconElement.innerHTML = `
<svg width="30" height="30" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 30 0 30)" fill="#0B78CB"/>
    <path d="M9.89922 7.44102C10.562 7.44102 11.0992 6.90376 11.0992 6.24102C11.0992 5.57827 10.562 5.04102 9.89922 5.04102C9.23648 5.04102 8.69922 5.57827 8.69922 6.24102C8.69922 6.90376 9.23648 7.44102 9.89922 7.44102Z" fill="white"/>
    <path d="M8.39922 8.43115C8.28876 8.43115 8.19922 8.5207 8.19922 8.63115V9.43115C8.19922 9.54161 8.28876 9.63115 8.39922 9.63115H9.10078C9.21124 9.63115 9.30078 9.7207 9.30078 9.83115V13.5938H8.2C8.08954 13.5938 8 13.6833 8 13.7938V14.5937C8 14.7042 8.08954 14.7937 8.2 14.7937H11.8C11.9105 14.7937 12 14.7042 12 14.5937V13.7937C12 13.6833 11.9105 13.5938 11.8 13.5938H11.1008V8.63115C11.1008 8.5207 11.0112 8.43115 10.9008 8.43115H8.39922Z" fill="white"/>
</svg>`;
            }
        },

        updateAllStepIconsToSuccess() {
            for (let i = 1; i <= 4; i++) {
                const iconElement = document.getElementById(`step${i}-icon`);
                if (!iconElement) continue;
                iconElement.classList.remove('info', 'warning', 'error');
                iconElement.classList.add('success');
                iconElement.innerHTML = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#228738"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7528 6.33951C14.1176 6.58879 14.2113 7.08659 13.962 7.45138L9.86198 13.4514C9.72769 13.6479 9.51286 13.7744 9.27586 13.7966C9.03886 13.8187 8.80432 13.7341 8.63596 13.5659L6.13439 11.0659C5.82188 10.7536 5.82172 10.247 6.13404 9.93452C6.44636 9.622 6.95289 9.62184 7.26541 9.93417L9.08495 11.7526L12.6409 6.54868C12.8902 6.18388 13.388 6.09024 13.7528 6.33951Z" fill="white"/>
</svg>`;
            }
        },

        updateCurrentStepIconToError(currentStep) {
            if (currentStep < 1 || currentStep > 4) return;
            const iconElement = document.getElementById(`step${currentStep}-icon`);
            if (!iconElement) return;
            iconElement.classList.remove('info', 'warning', 'success');
            iconElement.classList.add('error');
            iconElement.innerHTML = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" rx="10" transform="matrix(1 0 0 -1 0 20)" fill="#DC2626"/>
    <path d="M13.5 6.5L6.5 13.5M6.5 6.5L13.5 13.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>`;
        }
    };

    window.ProgressCore = ProgressCore;
})();


