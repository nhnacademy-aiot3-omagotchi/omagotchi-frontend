// 캐릭터
const characters = [
    {
        id: "study",
        name: "[공부쟁이]",
        bubble: "오늘도 집중!",
        baseImage: "/images/characters/study/study.png"
    },
    {
        id: "debug",
        name: "[디버깅이]",
        bubble: "버그 잡자!",
        baseImage: "/images/characters/debug/debug.png"
    },
    {
        id: "sprout",
        name: "[새싹이]",
        bubble: "말풍선",
        baseImage: "/images/characters/sprout/sprout.png"
    },
    {
        id: "server",
        name: "[서버지킴이]",
        bubble: "응답 정상!",
        baseImage: "/images/characters/server/server.png"
    },
    {
        id: "night",
        name: "[야간반]",
        bubble: "조금만 더!",
        baseImage: "/images/characters/night/night.png"
    },
    {
        id: "kid",
        name: "[잼민이]",
        bubble: "냠!",
        baseImage: "/images/characters/kid/kid.png"
    },
    {
        id: "caffeine",
        name: "[카페인이]",
        bubble: "충전 완료!",
        baseImage: "/images/characters/caffeine/caffeine.png"
    },
    {
        id: "commit",
        name: "[커밋이]",
        bubble: "저장했어?",
        baseImage: "/images/characters/commit/commit.png"
    }
];
// 색상 커스터마이징
const colors = [
    { id: "original", name: "Original", value: null },
    { id: "pistachio", name: "Pistachio", value: "#8fd16a" },
    { id: "cyan", name: "Cyan", value: "#69c7e8" },
    { id: "cream_can", name: "Cream Can", value: "#f6c45d" },
    { id: "light_coral", name: "Light Coral", value: "#f27f7f" },
    { id: "light_purple", name: "Light Purple", value: "#b99cff" },
    { id: "white", name: "White", value: "#f1f1f1" },
    { id: "dark_gray", name: "Dark Gray", value: "#3f3f3f" }
];

const root = document.documentElement;
// DOM 요소
const characterGrid = document.querySelector("[data-character-grid]");
const colorRow = document.querySelector("[data-color-row]");
const selectedName = document.querySelector("[data-selected-name]");
const selectedBubble = document.querySelector("[data-selected-bubble]");
const selectedImage = document.querySelector("[data-selected-image]");
const enterButton = document.querySelector("[data-enter-button]");

let selectedCharacter = characters[0];
let selectedColor = colors[0];

// 선택 이미지 경로
function getCharacterImage(characterId, colorId) {
    return `/images/characters/${characterId}/${colorId}.png`;
}

function getSelectedImagePath() {
    return selectedColor.id === "original"
        ? selectedCharacter.baseImage
        : getCharacterImage(selectedCharacter.id, selectedColor.id);
}

// 캐릭터 목록 렌더링
function renderCharacters() {
    characterGrid.innerHTML = characters
        .map((character) => `
            <button
                    class="character-option"
                    type="button"
                    data-character-id="${character.id}"
                    aria-label="${character.name} 선택"
            >
                <img src="${character.baseImage}" alt="" />
            </button>
        `)
        .join("");
}

// 색상 목록 렌더링
function renderColors() {
    colorRow.innerHTML = colors
        .map((color) => `
            <button
                    class="color-option ${color.id === "original" ? "is-original" : ""}"
                    type="button"
                    data-color-id="${color.id}"
                    style="${color.value ? `--swatch-color: ${color.value}` : ""}"
                    aria-label="${color.name} 색상 선택"
            ></button>
        `)
        .join("");
}

// 선택 미리보기 갱신
function updateSelectedView() {
    const selectedImagePath = getSelectedImagePath();

    root.style.setProperty("--selected-color", selectedColor.value || "#ffffff");
    selectedName.textContent = selectedCharacter.name;
    selectedBubble.textContent = selectedCharacter.bubble;
    selectedImage.onerror = () => {
        selectedImage.onerror = null;
        selectedImage.src = selectedCharacter.baseImage;
    };
    selectedImage.src = selectedImagePath;
    selectedImage.alt = `${selectedCharacter.name} 캐릭터 이미지`;

    document.querySelectorAll(".character-option").forEach((button) => {
        const isSelected = button.dataset.characterId === selectedCharacter.id;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    document.querySelectorAll(".color-option").forEach((button) => {
        const isSelected = button.dataset.colorId === selectedColor.id;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

// 캐릭터 선택
characterGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".character-option");

    if (!button) {
        return;
    }

    selectedCharacter = characters.find((character) => character.id === button.dataset.characterId);
    updateSelectedView();
});

// 색상 선택
colorRow.addEventListener("click", (event) => {
    const button = event.target.closest(".color-option");

    if (!button) {
        return;
    }

    selectedColor = colors.find((color) => color.id === button.dataset.colorId);
    updateSelectedView();
});

// 캐릭터 선택 완료
enterButton.addEventListener("click", () => {
    const selectedImagePath = getSelectedImagePath();
    const loginId = sessionStorage.getItem("omagotchiLoginId") || localStorage.getItem("omagotchiLastLoginId") || "user01";

    sessionStorage.setItem("omagotchiCharacterId", selectedCharacter.id);
    sessionStorage.setItem("omagotchiCharacterName", selectedCharacter.name);
    sessionStorage.setItem("omagotchiCharacterImage", selectedImagePath);
    sessionStorage.setItem("omagotchiCharacterBaseImage", selectedCharacter.baseImage);
    sessionStorage.setItem("omagotchiCharacterColorId", selectedColor.id);
    sessionStorage.setItem("omagotchiCharacterColorName", selectedColor.name);
    sessionStorage.setItem("omagotchiCharacterColor", selectedColor.value || "");
    localStorage.setItem(`omagotchiHasCharacter:${loginId}`, "true");
    localStorage.setItem(`omagotchiCharacterId:${loginId}`, selectedCharacter.id);
    localStorage.setItem(`omagotchiCharacterName:${loginId}`, selectedCharacter.name);
    localStorage.setItem(`omagotchiCharacterImage:${loginId}`, selectedImagePath);
    localStorage.setItem(`omagotchiCharacterBaseImage:${loginId}`, selectedCharacter.baseImage);
    localStorage.setItem(`omagotchiCharacterColorId:${loginId}`, selectedColor.id);
    localStorage.setItem(`omagotchiCharacterColorName:${loginId}`, selectedColor.name);
    localStorage.setItem(`omagotchiCharacterColor:${loginId}`, selectedColor.value || "");

    selectedBubble.textContent = "입장!";
    selectedImage.classList.add("happy");

    setTimeout(() => {
        selectedImage.classList.remove("happy");
        window.location.href = "/lab";
    }, 600);
});

renderCharacters();
renderColors();
updateSelectedView();
