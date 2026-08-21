const usernameForm = document.querySelector(".username-form");
const usernameCard = document.querySelector(".login-card");
const usernameFeedback = document.querySelector("[data-auth-feedback]");
const USERNAME_PATTERN = /^[0-9A-Za-z가-힣]{2,12}$/;

function setUsernameFeedback(message) {
    usernameFeedback.textContent = message;
}

function shakeUsernameCard() {
    usernameCard.classList.add("shake");
    setTimeout(() => usernameCard.classList.remove("shake"), 350);
}

usernameForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameForm.username.value.trim();
    if (!USERNAME_PATTERN.test(username)) {
        setUsernameFeedback("2~12자의 한글·영문·숫자만 사용할 수 있습니다.");
        shakeUsernameCard();
        return;
    }

    const submitButton = usernameForm.querySelector("button[type='submit']");
    submitButton.disabled = true;

    try {
        await window.OmagotchiApi.profile.updateNickname(username.normalize("NFC"));
        window.location.href = "/home";
    } catch (error) {
        setUsernameFeedback(error.message || "닉네임을 저장하지 못했습니다.");
        shakeUsernameCard();
        submitButton.disabled = false;
    }
});
