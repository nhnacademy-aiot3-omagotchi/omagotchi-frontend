const errorBackButton = document.querySelector("[data-error-back]");
const errorReloadButton = document.querySelector("[data-error-reload]");

// 이전 방문 기록이 없으면 초기 화면으로 이동합니다.
errorBackButton?.addEventListener("click", () => {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    window.location.assign("/");
});

// 현재 주소를 다시 요청합니다.
errorReloadButton?.addEventListener("click", () => {
    window.location.reload();
});
