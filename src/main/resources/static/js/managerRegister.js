const form = document.querySelector(".manager-register-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".manager-character-img");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

const managerRegisterMessages = {
    focus: "관리자 정보는<br />정확히 입력해주세요.",
    empty: "아직 입력하지 않은<br />관리자 정보가 있어요!",
    shortLoginId: "아이디는 4자 이상으로<br />입력해주세요.",
    shortPassword: "비밀번호는 8자리 이상으로<br />입력해주세요.",
    shortUsername: "사용자 이름은 2자 이상으로<br />입력해주세요.",
    shortOrganization: "소속 기관은 2자 이상으로<br />입력해주세요.",
    success: "관리자 로그인 화면으로<br />이동중입니다."
};

const showMessage = (message) => {
    bubble.innerHTML = message;
};

inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        showMessage(managerRegisterMessages.focus);
    });

    input.addEventListener("input", () => {
        character.classList.add("happy");

        setTimeout(() => {
            character.classList.remove("happy");
        }, 600);
    });
});

form.addEventListener("submit", (event) => {
    const loginId = form.loginId.value.trim();
    const password = form.password.value.trim();
    const username = form.username.value.trim();
    const organization = form.organ.value.trim();

    if (!loginId || !password || !username || !organization) {
        event.preventDefault();
        showMessage(managerRegisterMessages.empty);
        shakeCard();
        return;
    }

    if (loginId.length < 4) {
        event.preventDefault();
        showMessage(managerRegisterMessages.shortLoginId);
        shakeCard();
        return;
    }

    if (password.length < 8) {
        event.preventDefault();
        showMessage(managerRegisterMessages.shortPassword);
        shakeCard();
        return;
    }

    if (username.length < 2) {
        event.preventDefault();
        showMessage(managerRegisterMessages.shortUsername);
        shakeCard();
        return;
    }

    if (organization.length < 2) {
        event.preventDefault();
        showMessage(managerRegisterMessages.shortOrganization);
        shakeCard();
        return;
    }

    event.preventDefault();
    showMessage(managerRegisterMessages.success);
    setTimeout(() => {
        window.location.href = "/managerLogin";
    }, 800);
});

function shakeCard() {
    card.classList.add("shake");
    setTimeout(() => {
        card.classList.remove("shake");
    }, 350);
}
