const homeCharacter = document.querySelector("[data-home-character]");
const homeProfileImage = document.querySelector("[data-home-profile-image]");
const homeUserName = document.querySelector("[data-home-user-name]");
const homeBubble = document.querySelector("[data-home-bubble]");

const fallbackImage = "/images/characters/study/study.png";
const selectedImage = sessionStorage.getItem("omagotchiCharacterImage") || fallbackImage;
const selectedBaseImage = sessionStorage.getItem("omagotchiCharacterBaseImage") || fallbackImage;
const userName = sessionStorage.getItem("omagotchiUserName") || "사용자";
const selectedColorId = sessionStorage.getItem("omagotchiCharacterColorId") || "original";

function applyImage(imageElement) {
    imageElement.onerror = () => {
        imageElement.onerror = null;
        imageElement.src = selectedBaseImage;
    };
    imageElement.src = selectedImage;
}

applyImage(homeCharacter);
applyImage(homeProfileImage);

homeUserName.textContent = userName;

if (selectedColorId === "original") {
    homeBubble.innerHTML = "원래 모습으로<br />실습실 입장!";
} else {
    homeBubble.innerHTML = "준비 완료!<br />실습을 시작해요.";
}
