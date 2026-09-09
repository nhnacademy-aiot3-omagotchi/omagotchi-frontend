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

    // 버블링하지 않는 파일 로딩 오류의 포착. 이미지·API·일반 실행 오류는 제외.
    globalThis.addEventListener("error", (event) => {
        const resource = event.target;
        if (resource instanceof HTMLScriptElement
            || (resource instanceof HTMLLinkElement && resource.relList.contains("stylesheet"))) {
            showResourceLoadNotice();
        }
    }, true);

    // Vite가 불러오는 후속 모듈의 실패 안내. 기존 오류 전달은 유지.
    globalThis.addEventListener("vite:preloadError", showResourceLoadNotice);
})();
