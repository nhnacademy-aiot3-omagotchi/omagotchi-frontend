// 로그인 화면 요소
const form = document.querySelector(".login-form");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector("[data-auth-feedback]") || document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

function setFeedback(message) {
    if (bubble) {
        bubble.textContent = message;
        bubble.classList.remove("auth-error");
    }
}

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        setFeedback("입력 중이에요. 천천히 해도 괜찮아요.");
    });

    input.addEventListener("input", () => {
        character?.classList.add("happy");
        setTimeout(() => character?.classList.remove("happy"), 600);
    });
});

// Server Form 제출 중 중복 입력 방지
form?.addEventListener("submit", () => {
    const submitButton = form.querySelector("[type='submit']");
    if (submitButton) {
        submitButton.disabled = true;
    }
    setFeedback("로그인 정보를 확인하고 있어요.");
});
