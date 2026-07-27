// 프론트엔드 공통 준비 상태
document.documentElement.dataset.frontendReady = "true";

// 인덱스 시작 버튼과 캐릭터 진입 모션
const indexLanding = document.querySelector(".index-landing");
const indexActions = document.querySelector(".index-actions");
const indexStartButton = document.querySelector(".index-growth-button");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (indexLanding && indexActions && indexStartButton) {
    indexActions.addEventListener("submit", (event) => {
        if (reducedMotion.matches || indexLanding.classList.contains("is-starting")) {
            return;
        }

        event.preventDefault();
        indexLanding.classList.add("is-starting");
        indexStartButton.disabled = true;
        indexStartButton.setAttribute("aria-busy", "true");

        window.setTimeout(() => {
            window.location.assign(indexActions.action);
        }, 450);
    });
}
