// 비밀번호 변경 화면 요소
const form = document.querySelector(".password-change-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector("[data-auth-feedback]") || document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");
const checkUserButton = document.querySelector("[data-check-user-button]");
const lookupStep = document.querySelector("[data-password-step='lookup']");
const changeStep = document.querySelector("[data-password-step='change']");
const passwordTitle = document.querySelector("[data-password-title]");

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

// 사용자 확인 단계
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

    // TODO: 백엔드 연동 시 사용자 존재 여부 확인 API로 교체한다.
    lookupStep.classList.remove("is-active");
    changeStep.classList.add("is-active");
    changeStep.removeAttribute("aria-hidden");
    if (passwordTitle) {
        passwordTitle.textContent = "비밀번호 변경";
    }
    setFeedback("새 비밀번호를 입력하세요");
    form.newPassword.focus();
});

// 새 비밀번호 변경 단계
form.addEventListener("submit", (event) => {
    event.preventDefault();

    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    if (!newPassword || !confirmPassword) {
        setFeedback("새 비밀번호를 모두 입력해주세요.");
        shakeCard();
        return;
    }

    if (newPassword.length < 8) {
        setFeedback("비밀번호는 8자리 이상으로 입력해주세요.");
        shakeCard();
        return;
    }

    if (newPassword !== confirmPassword) {
        setFeedback("비밀번호 확인이 일치하지 않아요.");
        shakeCard();
        return;
    }

    // TODO: 백엔드 연동 시 비밀번호 변경 API 호출로 교체한다.
    setFeedback("비밀번호 변경 완료. 로그인 화면으로 이동할게요.");

    setTimeout(() => {
        window.location.href = "/login";
    }, 800);
});

// 카드 흔들림 피드백
function shakeCard() {
    card.classList.add("shake");

    setTimeout(() => {
        card.classList.remove("shake");
    }, 350);
}
