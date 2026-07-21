// 로그인 화면 요소
const form = document.querySelector(".login-form");
const card = document.querySelector(".login-card");
const character = document.querySelector(".omagotchi-character");
const bubble = document.querySelector(".speech-bubble");
const inputs = document.querySelectorAll(".input-group input");

// 입력 중 캐릭터 반응
inputs.forEach((input) => {
    input.addEventListener("focus", () => {
        bubble.innerHTML = "입력 중이에요!<br />천천히 해도 괜찮아요.";
    });

    input.addEventListener("input", () => {
        character.classList.add("happy");

        setTimeout(() => {
            character.classList.remove("happy");
        }, 600);
    });
});

// 로그인 목업 처리
form.addEventListener("submit", (event) => {
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
        event.preventDefault();

        bubble.innerHTML = "이메일과 비밀번호를<br />다시 확인해주세요!";

        card.classList.add("shake");

        setTimeout(() => {
            card.classList.remove("shake");
        }, 350);

        return;
    }

    event.preventDefault();
    bubble.innerHTML = "좋아요!<br />실습실로 이동할게요.";
    sessionStorage.setItem("omagotchiEmail", email);
    sessionStorage.setItem("omagotchiLoginPassword", password);
    localStorage.setItem("omagotchiLastEmail", email);

    if (!localStorage.getItem(`omagotchiPassword:${email}`)) {
        localStorage.setItem(`omagotchiPassword:${email}`, password);
    }

    setTimeout(() => {
        const hasSelectedCharacter = localStorage.getItem(`omagotchiHasCharacter:${email}`) === "true";
        window.location.href = hasSelectedCharacter ? "/lab" : "/characterSelector";
    }, 700);
});
