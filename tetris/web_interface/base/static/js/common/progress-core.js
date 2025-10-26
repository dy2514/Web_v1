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
                0: '분석 시작 대기중입니다',
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
<svg width="18" height="20" viewBox="0 0 18 20" fill="#000000" xmlns="http://www.w3.org/2000/svg">
    <path fill="#000000" clip-rule="evenodd" d="M3.44141 6.52374C4.50762 6.86303 5.28 7.86127 5.28 9.0399C5.28 10.2185 4.50762 11.2168 3.44141 11.5561L3.44141 19.2002C3.44141 19.642 3.08323 20.0002 2.64141 20.0002C2.19958 20.0002 1.84141 19.642 1.84141 19.2002L1.84141 11.557C0.773737 11.2185 0 10.2196 0 9.0399C0 7.86023 0.773737 6.86128 1.84141 6.52284L1.84141 0.8C1.84141 0.358172 2.19958 0 2.64141 0C3.08323 0 3.44141 0.358172 3.44141 0.8V6.52374ZM2.64 10.0799C2.06562 10.0799 1.6 9.61428 1.6 9.0399C1.6 8.46553 2.06562 7.9999 2.64 7.9999C3.21438 7.9999 3.68 8.46553 3.68 9.0399C3.68 9.61428 3.21438 10.0799 2.64 10.0799Z" fill="#33363D"/>
    <path fill="#000000" clip-rule="evenodd" d="M7.8414 19.2002L7.84141 15.1571C6.77374 14.8186 6 13.8197 6 12.64C6 11.4603 6.77374 10.4614 7.84141 10.1229V0.8C7.84141 0.358172 8.19958 0 8.64141 0C9.08323 0 9.44141 0.358172 9.44141 0.8L9.44141 10.1238C10.5076 10.4631 11.28 11.4614 11.28 12.64C11.28 13.8186 10.5076 14.8169 9.44141 15.1562V19.2002C9.44141 19.642 9.08323 20.0002 8.64141 20.0002C8.19958 20.0002 7.8414 19.642 7.8414 19.2002ZM7.6 12.64C7.6 13.2144 8.06562 13.68 8.64 13.68C9.21438 13.68 9.68 13.2144 9.68 12.64C9.68 12.0656 9.21438 11.6 8.64 11.6C8.06562 11.6 7.6 12.0656 7.6 12.64Z" fill="#33363D"/>
    <path fill="#000000" clip-rule="evenodd" d="M13.8414 4.12294V0.8C13.8414 0.358172 14.1996 0 14.6414 0C15.0832 0 15.4414 0.358172 15.4414 0.8V4.12383C16.5076 4.46313 17.28 5.46137 17.28 6.64C17.28 7.81863 16.5076 8.81687 15.4414 9.15617L15.4414 19.2002C15.4414 19.642 15.0832 20.0002 14.6414 20.0002C14.1996 20.0002 13.8414 19.642 13.8414 19.2002V9.15706C12.7737 8.81862 12 7.81967 12 6.64C12 5.46033 12.7737 4.46138 13.8414 4.12294ZM14.64 7.68C14.0656 7.68 13.6 7.21438 13.6 6.64C13.6 6.06562 14.0656 5.6 14.64 5.6C15.2144 5.6 15.68 6.06562 15.68 6.64C15.68 7.21438 15.2144 7.68 14.64 7.68Z" fill="#33363D"/>
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


