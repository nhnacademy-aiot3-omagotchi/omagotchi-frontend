// Learning Service 게임 프로필 연동 전 캐릭터 표시명 목업
const usernameForm = document.querySelector(".username-form");
const usernameCard = document.querySelector(".login-card");
const usernameFeedback = document.querySelector("[data-auth-feedback]");
// 화면 확인용 임시 입력 제한, Learning Service Domain 정책 아님
const USERNAME_PATTERN = /^[0-9A-Za-z가-힣]{2,16}$/;

function setUsernameFeedback(message) {
    usernameFeedback.textContent = message;
}

function shakeUsernameCard() {
    usernameCard.classList.add("shake");
    setTimeout(() => usernameCard.classList.remove("shake"), 350);
}

usernameForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameForm.username.value.trim();
    if (!USERNAME_PATTERN.test(username)) {
        setUsernameFeedback("2~16자의 한글·영문·숫자만 사용할 수 있습니다.");
        shakeUsernameCard();
        return;
    }

    // Learning 연동 전 현재 Browser Session에서만 사용하는 목업 표시명
    sessionStorage.setItem("omagotchiUsername", username);
    window.location.href = "/character-selector";
});
