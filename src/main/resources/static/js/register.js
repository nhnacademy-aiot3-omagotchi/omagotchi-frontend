// 회원가입 화면 요소
const form = document.querySelector(".register-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        bubble.innerHTML = "나만의 오마고치를!<br />생성중입니다!";
    });

    input.addEventListener("input", () => {
        character.classList.add("happy");

        setTimeout(() => {
            character.classList.remove("happy");
        }, 600);
    });
});

// 회원가입 목업 검증
form.addEventListener("submit", (event) => {
    const loginId = form.loginId.value.trim();
    const password = form.password.value.trim();
    const username = form.username.value.trim();

    if (!loginId || !password || !username) {
        event.preventDefault();
        bubble.innerHTML = "아직 입력하지 않은<br />정보가 있어요!";
        shakeCard();
        return;

    }
    if (loginId.length < 4) {
        event.preventDefault();
        bubble.innerHTML = "아이디는 4자 이상으로<br />입력해주세요.";
        shakeCard();
        return;
    }
    if (password.length < 8 ) {
        event.preventDefault();
        bubble.innerHTML = "비밀번호는 8자리 이상으로<br />입력해주세요.";
        shakeCard();
        return;
    }
    if (username.length < 2) {
        event.preventDefault();
        bubble.innerHTML = "사용자 이름은 2자 이상으로<br />입력해주세요.";
        shakeCard();
        return;
    }
    event.preventDefault();
    bubble.innerHTML = "로그인 화면으로<br />이동중입니다.";
    setTimeout(() => {
        window.location.href = "/login";
    }, 800);
});

// 카드 흔들림 피드백
function shakeCard() {
    card.classList.add("shake");
    setTimeout(()=> {
        card.classList.remove("shake");
    }, 350);
}
