// FIXME: 단일 로그인·회원가입 전환 후 제거 예정인 레거시 분리 화면.

// 관리자 로그인 화면 요소
const form = document.querySelector(".login-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".manager-character-img");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

// 관리자 로그인 메시지
const managerMessages = {
    emptyAll: "이메일과 비밀번호를<br />입력해주세요.",
    emptyEmail: "이메일을<br />입력해주세요.",
    emptyPassword: "비밀번호를<br />입력해주세요.",
    success: "배정된 기수를 확인하고<br />대시보드로 이동합니다."
};

// 말풍선 메시지 변경
const showManagerMessage = (message) => {
    bubble.innerHTML = message;
};

// 입력 중 캐릭터 반응
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

// [Mock] 실제 서비스에서는 필요하지 않은 임시 관리자 로그인 처리입니다. 1~27
// 관리자 로그인 목업 처리
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
        if (!email && !password) {
            showManagerMessage(managerMessages.emptyAll);
        } else if (!email) {
            showManagerMessage(managerMessages.emptyEmail);
        } else {
            showManagerMessage(managerMessages.emptyPassword);
        }

        card.classList.add("shake");

        setTimeout(() => {
            card.classList.remove("shake");
        }, 350);

        return;
    }

    const session = await window.OmagotchiApi?.auth?.managerLogin?.({ email, password });
    const manager = session?.manager || session;
    sessionStorage.setItem("omagotchiManagerEmail", email);
    if (!sessionStorage.getItem("omagotchiManagerName")) {
        sessionStorage.setItem("omagotchiManagerName", manager?.name || email.split("@")[0]);
    }
    showManagerMessage(managerMessages.success);

    window.setTimeout(() => {
        window.location.href = session?.redirectUrl || "/manager-dashboard";
    }, 450);
});
