// 로그인 화면 요소
const form = document.querySelector(".login-form");
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
        setFeedback("입력 중이에요. 천천히 해도 괜찮아요.");
    });

    input.addEventListener("input", () => {
        character?.classList.add("happy");

        setTimeout(() => {
            character?.classList.remove("happy");
        }, 600);
    });
});

// [Mock] 실제 서비스에서는 필요하지 않은 임시 로그인 처리입니다. 1~18
// 로그인 목업 처리
form.addEventListener("submit", async (event) => {
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
        event.preventDefault();

        setFeedback("이메일과 비밀번호를 다시 확인해주세요.");

        card.classList.add("shake");

        setTimeout(() => {
            card.classList.remove("shake");
        }, 350);

        return;
    }

    event.preventDefault();
    setFeedback("좋아요. 실습실로 이동할게요.");
    const session = await window.OmagotchiApi?.auth?.login?.({ email, password });
    const user = session?.user || session;
    const nextUrl = session?.redirectUrl;
    sessionStorage.setItem("omagotchiEmail", email);
    sessionStorage.setItem("omagotchiLoginPassword", password);
    const username = user?.name || user?.username;
    if (username) {
        sessionStorage.setItem("omagotchiUsername", username);
    } else {
        const storedUsername = localStorage.getItem(`omagotchiUsername:${email}`);
        if (storedUsername) {
            sessionStorage.setItem("omagotchiUsername", storedUsername);
        }
    }
    localStorage.setItem("omagotchiLastEmail", email);

    if (!localStorage.getItem(`omagotchiPassword:${email}`)) {
        localStorage.setItem(`omagotchiPassword:${email}`, password);
    }

    setTimeout(() => {
        const hasSelectedCharacter = localStorage.getItem(`omagotchiHasCharacter:${email}`) === "true";
            window.location.href = nextUrl || (hasSelectedCharacter ? "/check-in" : "/character-selector");
    }, 700);
});
