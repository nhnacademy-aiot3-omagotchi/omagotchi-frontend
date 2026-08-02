// 회원가입 후 사용자 이름을 입력받는 화면 요소
const usernameForm = document.querySelector(".username-form");
const usernameCard = document.querySelector(".login-card");
const usernameFeedback = document.querySelector("[data-auth-feedback]");

function setUsernameFeedback(message) {
    if (usernameFeedback) {
        usernameFeedback.textContent = message;
    }
}

// 잘못된 입력을 카드 흔들림으로 안내
function shakeUsernameCard() {
    usernameCard.classList.add("shake");

    setTimeout(() => {
        usernameCard.classList.remove("shake");
    }, 350);
}

// 이름과 임시 가입 정보를 저장하고 캐릭터 선택 화면으로 이동
usernameForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameForm.username.value.trim();
    const email = sessionStorage.getItem("omagotchiRegisterEmail");
    const password = sessionStorage.getItem("omagotchiRegisterPassword");

    if (username.length < 2) {
        setUsernameFeedback("사용자 이름은 2자 이상으로 입력해주세요.");
        shakeUsernameCard();
        return;
    }

    if (email) {
        await window.OmagotchiApi?.auth?.updateProfile?.({ email, username });
        sessionStorage.setItem("omagotchiEmail", email);
        localStorage.setItem("omagotchiLastEmail", email);
        localStorage.setItem(`omagotchiUsername:${email}`, username);
    }

    if (email && password) {
        localStorage.setItem(`omagotchiPassword:${email}`, password);
    }

    window.location.href = "/character-selector";
});
