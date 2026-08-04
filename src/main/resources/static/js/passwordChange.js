// 비밀번호 변경 화면 요소
const form = document.querySelector(".password-change-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector("[data-auth-feedback]") || document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");
const checkUserButton = document.querySelector("[data-check-user-button]");

function setFeedback(message) {
    if (bubble) {
        bubble.innerHTML = message;
    }
}

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        setFeedback("계정 정보를 확인할게요.");
    });

    input.addEventListener("input", () => {
        character?.classList.add("happy");

        setTimeout(() => {
            character?.classList.remove("happy");
        }, 600);
    });
});

// 미구현 비밀번호 재설정 기능 안내
checkUserButton.addEventListener("click", () => {
    const email = form.email.value.trim();

    if (!email) {
        setFeedback("사용자 이메일을 입력해주세요.");
        shakeCard();
        return;
    }

    if (!email.includes("@")) {
        setFeedback("이메일 형식을 확인해주세요.");
        shakeCard();
        return;
    }

    setFeedback("비밀번호 재설정 기능은 아직 준비 중입니다.");
});

// 미구현 비밀번호 재설정 제출 안내
form.addEventListener("submit", (event) => {
    event.preventDefault();
    setFeedback("비밀번호 재설정 기능은 아직 준비 중입니다.");
});

// 카드 흔들림 피드백
function shakeCard() {
    card.classList.add("shake");

    setTimeout(() => {
        card.classList.remove("shake");
    }, 350);
}
