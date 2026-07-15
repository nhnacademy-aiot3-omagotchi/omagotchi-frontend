const homeCharacter = document.querySelector("[data-home-character]");
const homeProfileImage = document.querySelector("[data-home-profile-image]");
const homeUserName = document.querySelector("[data-home-user-name]");
const homeBubble = document.querySelector("[data-home-bubble]");
const menuButton = document.querySelector("[data-menu-button]");
const menuOverlay = document.querySelector("[data-menu-overlay]");

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

function setMenuOpen(isOpen) {
    menuOverlay.classList.toggle("is-open", isOpen);
    menuOverlay.setAttribute("aria-hidden", String(!isOpen));
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
}

menuButton.addEventListener("click", () => {
    setMenuOpen(!menuOverlay.classList.contains("is-open"));
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setMenuOpen(false);
    }
});
