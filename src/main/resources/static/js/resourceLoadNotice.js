(() => {
    let noticeShown = false;

    // 페이지 초기화 실패의 공통 안내. 업무 API 오류 처리와 자동 재시도는 제외.
    function showResourceLoadNotice() {
        if (noticeShown) {
            return;
        }
        noticeShown = true;

        const notice = document.createElement("aside");
        notice.id = "resource-load-notice";
        notice.setAttribute("role", "alert");
        notice.innerHTML = `
            <p>화면 일부를 불러오지 못했습니다.</p>
            <p>작성 중인 내용과 진행 중인 AI 응답을 확인한 뒤 새로고침해 주세요.</p>
            <button type="button">새로고침</button>`;
        notice.querySelector("button").addEventListener("click", () => {
            globalThis.location.reload();
        });

        // Head의 CSS 로딩 실패처럼 Body 생성 전에 발생한 오류의 표시 대기.
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => document.body.append(notice), {once: true});
        } else {
            document.body.append(notice);
        }
    }

    globalThis.OmagotchiResourceLoadNotice = {show: showResourceLoadNotice};

    // 캡처 단계에서 앱 파일의 로딩 실패만 안내. 외부 통계·이미지·API 오류는 제외.
    globalThis.addEventListener("error", (event) => {
        const resource = event.target;
        let resourceAddress;
        if (resource instanceof HTMLScriptElement) {
            resourceAddress = resource.src;
        } else if (resource instanceof HTMLLinkElement && resource.relList.contains("stylesheet")) {
            resourceAddress = resource.href;
        } else {
            return;
        }

        // DOM의 절대 주소로 출처·경로 확인. 잘못된 주소로 인한 추가 예외 방지.
        let resourceUrl;
        try {
            resourceUrl = new URL(resourceAddress);
        } catch {
            return;
        }

        if (resourceUrl.origin === globalThis.location.origin
            && (resourceUrl.pathname.startsWith("/js/") || resourceUrl.pathname.startsWith("/css/"))) {
            showResourceLoadNotice();
        }
    }, true);

    // Vite가 불러오는 후속 모듈의 실패 안내. 기존 오류 전달은 유지.
    globalThis.addEventListener("vite:preloadError", showResourceLoadNotice);
})();
