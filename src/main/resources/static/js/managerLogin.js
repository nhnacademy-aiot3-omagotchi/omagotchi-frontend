const form = document.querySelector(".login-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".manager-character-img");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

const managerMessages = {
    emptyAll: "음... 관리자 계정이<br />둘 다 비어있는데요?",
    emptyId: "아이디가 빠졌어요.<br />infra에 올려둔 계정 다시 봐봐요.",
    emptyPassword: "비밀번호가 빠졌어요.<br />curriculum 쪽 다시 확인해봐요.",
    success: "관리자 승인 완료<br />대시보드로 이동합니다."
};

const showManagerMessage = (message) => {
    bubble.innerHTML = message;
};

inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        showManagerMessage("천천히 입력하세요.<br />근데 로그는 다 봅니다.");
    });

    input.addEventListener("input", () => {
        character.classList.add("happy");

        setTimeout(() => {
            character.classList.remove("happy");
        }, 600);
    });
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const loginId = form.loginId.value.trim();
    const password = form.password.value.trim();

    if (!loginId || !password) {
        if (!loginId && !password) {
            showManagerMessage(managerMessages.emptyAll);
        } else if (!loginId) {
            showManagerMessage(managerMessages.emptyId);
        } else {
            showManagerMessage(managerMessages.emptyPassword);
        }

        card.classList.add("shake");

        setTimeout(() => {
            card.classList.remove("shake");
        }, 350);

        return;
    }

    showManagerMessage(managerMessages.success);

    window.setTimeout(() => {
        window.location.href = "/managerDashboard";
    }, 450);
});
