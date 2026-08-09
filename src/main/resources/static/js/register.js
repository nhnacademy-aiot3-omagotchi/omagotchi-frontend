// 회원가입 화면 요소
const form = document.querySelector(".register-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector("[data-auth-feedback]") || document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

function setFeedback(message) {
    if (bubble) {
        bubble.innerHTML = message;
    }
}

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        setFeedback("나만의 오마고치를 생성중입니다.");
    });

    input.addEventListener("input", () => {
        character?.classList.add("happy");

        setTimeout(() => {
            character?.classList.remove("happy");
        }, 600);
    });
});

// [Mock] 실제 서비스에서는 필요하지 않은 임시 회원가입 검증입니다. 1~28
// 회원가입 목업 검증
form.addEventListener("submit", async (event) => {
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
        event.preventDefault();
        setFeedback("아직 입력하지 않은 정보가 있어요.");
        shakeCard();
        return;

    }
    if (!email.includes("@")) {
        event.preventDefault();
        setFeedback("이메일 형식을 확인해주세요.");
        shakeCard();
        return;
    }
    if (password.length < 8 ) {
        event.preventDefault();
        setFeedback("비밀번호는 8자리 이상으로 입력해주세요.");
        shakeCard();
        return;
    }
    event.preventDefault();
    setFeedback("사용자 이름을 설정하러 이동중입니다.");
    const session = await window.OmagotchiApi?.auth?.register?.({ email, password });
    sessionStorage.setItem("omagotchiRegisterEmail", email);
    sessionStorage.setItem("omagotchiRegisterPassword", password);

    setTimeout(() => {
        window.location.href = session?.redirectUrl || "/username";
    }, 800);
});

// 카드 흔들림 피드백
function shakeCard() {
    card.classList.add("shake");
    setTimeout(()=> {
        card.classList.remove("shake");
    }, 350);
}
