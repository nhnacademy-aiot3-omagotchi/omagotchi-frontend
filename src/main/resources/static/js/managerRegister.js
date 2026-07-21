// 관리자 회원가입 화면 요소
const form = document.querySelector(".manager-register-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".manager-character-img");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

// 관리자 회원가입 메시지
const managerRegisterMessages = {
    focus: "관리자 정보는<br />정확히 입력해주세요.",
    empty: "아직 입력하지 않은<br />관리자 정보가 있어요!",
    invalidEmail: "이메일 형식을<br />확인해주세요.",
    shortPassword: "비밀번호는 8자리 이상으로<br />입력해주세요.",
    shortUsername: "사용자 이름은 2자 이상으로<br />입력해주세요.",
    shortOrganization: "소속 기관은 2자 이상으로<br />입력해주세요.",
    success: "관리자 로그인 화면으로<br />이동중입니다."
};

// 말풍선 메시지 변경
const showMessage = (message) => {
    bubble.innerHTML = message;
};

// 입력 중 캐릭터 반응
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

// 캐릭터 클릭 시 소속 안내
character.addEventListener("click", () => {
    const organization = form.organ.value.trim() || sessionStorage.getItem("omagotchiManagerOrganization");

    if (!organization) {
        showMessage("소속 기관을 입력하면<br />여기에 보여드릴게요.");
        return;
    }

    showMessage(`관리자 소속은<br />${organization} 입니다.`);
});

// 관리자 회원가입 목업 검증
form.addEventListener("submit", (event) => {
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const username = form.username.value.trim();
    const organization = form.organ.value.trim();

    if (!email || !password || !username || !organization) {
        event.preventDefault();
        showMessage(managerRegisterMessages.empty);
        shakeCard();
        return;
    }

    if (!email.includes("@")) {
        event.preventDefault();
        showMessage(managerRegisterMessages.invalidEmail);
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
    sessionStorage.setItem("omagotchiManagerEmail", email);
    sessionStorage.setItem("omagotchiManagerName", username);
    sessionStorage.setItem("omagotchiManagerOrganization", organization);
    sessionStorage.removeItem("omagotchiManagerRole");
    sessionStorage.removeItem("omagotchiManagerCohort");
    showMessage(managerRegisterMessages.success);
    setTimeout(() => {
        window.location.href = "/managerLogin";
    }, 800);
});

// 카드 흔들림 피드백
function shakeCard() {
    card.classList.add("shake");
    setTimeout(() => {
        card.classList.remove("shake");
    }, 350);
}
