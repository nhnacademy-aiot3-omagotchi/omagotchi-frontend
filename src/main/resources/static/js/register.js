// 회원가입 화면 요소
const form = document.querySelector(".register-form");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector("[data-auth-feedback]") || document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

function setFeedback(message) {
    if (bubble) {
        bubble.textContent = message;
        bubble.classList.remove("auth-error", "auth-success");
    }
}

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        setFeedback("나만의 오마고치를 생성 중입니다.");
    });

    input.addEventListener("input", () => {
        character?.classList.add("happy");
        setTimeout(() => character?.classList.remove("happy"), 600);
    });
});

// Server Form 제출 중 중복 입력 방지
form?.addEventListener("submit", () => {
    const submitButton = form.querySelector("[type='submit']");
    submitButton.disabled = true;
    setFeedback("계정을 생성하고 있어요.");
});
