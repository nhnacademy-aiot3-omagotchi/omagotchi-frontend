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

// 시작 화면의 캐릭터 저작권과 외부 폰트 라이선스 안내
const creditsBackdrop = document.querySelector("[data-credits-backdrop]");
const creditsDialog = creditsBackdrop?.querySelector(".credits-dialog");
const creditsOpenButton = document.querySelector("[data-open-credits]");
const creditsCloseButton = document.querySelector("[data-close-credits]");
let creditsTrigger = null;

function openCredits() {
    if (!creditsBackdrop) {
        return;
    }

    creditsTrigger = document.activeElement;
    creditsBackdrop.hidden = false;
    document.body.classList.add("has-open-dialog");
    creditsDialog?.focus();
}

function closeCredits() {
    if (!creditsBackdrop) {
        return;
    }

    creditsBackdrop.hidden = true;
    document.body.classList.remove("has-open-dialog");
    creditsTrigger?.focus();
}

creditsOpenButton?.addEventListener("click", openCredits);
creditsCloseButton?.addEventListener("click", closeCredits);

creditsBackdrop?.addEventListener("click", (event) => {
    if (event.target === creditsBackdrop) {
        closeCredits();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && creditsBackdrop && !creditsBackdrop.hidden) {
        closeCredits();
    }
});
