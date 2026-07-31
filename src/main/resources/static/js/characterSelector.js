// characters(id, name, bubble, description, baseImage)
const characters = [
    {
        id: "study",
        name: "공부쟁이",
        bubble: "오늘도 집중!",
        description: "기본기가 탄탄한 학습형 오마고치입니다.\n매일의 기록과 퀘스트를 차분하게 쌓아갑니다.",
        baseImage: "/images/characters/study/study.png"
    },
    {
        id: "debug",
        name: "디버깅이",
        bubble: "버그 잡자!",
        description: "문제를 발견하면 끝까지 추적하는 타입입니다.\n에러 로그 앞에서 특히 강해집니다.",
        baseImage: "/images/characters/debug/debug.png"
    },
    {
        id: "sprout",
        name: "새싹이",
        bubble: "쑥쑥 자랄래!",
        description: "처음 시작하는 마음을 가장 잘 아는 성장형 오마고치입니다.\n작은 출석도 크게 반응합니다.",
        baseImage: "/images/characters/sprout/sprout.png"
    },
    {
        id: "server",
        name: "서버지킴이",
        bubble: "응답 정상!",
        description: "조용하지만 안정적인 운영형 오마고치입니다.\n꾸준한 루틴과 긴 집중에 잘 어울립니다.",
        baseImage: "/images/characters/server/server.png"
    },
    {
        id: "night",
        name: "야간반",
        bubble: "조금만 더!",
        description: "늦은 시간에도 집중력을 붙잡는 야간형 오마고치입니다.\n마지막 한 세션에 강합니다.",
        baseImage: "/images/characters/night/night.png"
    },
    {
        id: "kid",
        name: "잼민이",
        bubble: "냠!",
        description: "가볍고 장난기 있는 에너지형 오마고치입니다.\n지루한 공부에 리듬을 만들어줍니다.",
        baseImage: "/images/characters/kid/kid.png"
    },
    {
        id: "caffeine",
        name: "카페인이",
        bubble: "충전 완료!",
        description: "짧고 강한 집중에 특화된 오마고치입니다.\n타이머를 켜는 순간부터 텐션이 올라갑니다.",
        baseImage: "/images/characters/caffeine/caffeine.png"
    },
    {
        id: "commit",
        name: "커밋이",
        bubble: "저장했어?",
        description: "기록과 회고를 좋아하는 습관형 오마고치입니다.\n오늘의 흔적을 남길수록 더 빛납니다.",
        baseImage: "/images/characters/commit/commit.png"
    }
];
// 색상 커스터마이징
const colors = [
    { id: "original", name: "기본", value: null },
    { id: "pistachio", name: "피스타치오", value: "#8fd16a" },
    { id: "cyan", name: "하늘", value: "#69c7e8" },
    { id: "cream_can", name: "크림", value: "#f6c45d" },
    { id: "light_coral", name: "코랄", value: "#f27f7f" },
    { id: "light_purple", name: "라일락", value: "#b99cff" },
    { id: "white", name: "화이트", value: "#f1f1f1" },
    { id: "dark_gray", name: "차콜", value: "#3f3f3f" }
];

const root = document.documentElement;
// DOM 요소
const characterGrid = document.querySelector("[data-character-grid]");
const colorRow = document.querySelector("[data-color-row]");
const selectedName = document.querySelector("[data-selected-name]");
const selectedColorName = document.querySelector("[data-selected-color-name]");
const selectedDescription = document.querySelector("[data-selected-description]");
const selectedSummary = document.querySelector("[data-selected-summary]");
const selectedBubble = document.querySelector("[data-selected-bubble]");
const selectedImage = document.querySelector("[data-selected-image]");
const enterButton = document.querySelector("[data-enter-button]");
const characterAssets = window.OmagotchiCharacterAssets;

let selectedCharacter = characters[0];
let selectedColor = colors[0];

// 선택 이미지 경로
function getCharacterImage(characterId, colorId) {
    return characterAssets.getPng(characterId, colorId);
}

function getSelectedImagePath() {
    return selectedColor.id === "original"
        ? selectedCharacter.baseImage
        : getCharacterImage(selectedCharacter.id, selectedColor.id);
}

function getSelectedAnimatedImagePath() {
    return characterAssets.getEyeGif(selectedCharacter.id, selectedColor.id);
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
    const selectedAnimatedImagePath = getSelectedAnimatedImagePath();

    root.style.setProperty("--selected-color", selectedColor.value || "#ffffff");
    selectedName.textContent = selectedCharacter.name;
    selectedColorName.textContent = selectedColor.name;
    selectedDescription.textContent = selectedCharacter.description;
    selectedSummary.textContent = `${selectedCharacter.name} · ${selectedColor.name}`;
    selectedBubble.textContent = selectedCharacter.bubble;
    selectedImage.onerror = () => {
        selectedImage.onerror = null;
        selectedImage.src = selectedImagePath;
    };
    selectedImage.src = selectedAnimatedImagePath;
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
    const selectedAnimatedImagePath = getSelectedAnimatedImagePath();
    const email = sessionStorage.getItem("omagotchiEmail")
        || localStorage.getItem("omagotchiLastEmail")
        || "user@example.com";

    sessionStorage.setItem("omagotchiCharacterId", selectedCharacter.id);
    sessionStorage.setItem("omagotchiCharacterName", selectedCharacter.name);
    sessionStorage.setItem("omagotchiCharacterImage", selectedImagePath);
    sessionStorage.setItem("omagotchiCharacterAnimatedImage", selectedAnimatedImagePath);
    sessionStorage.setItem("omagotchiCharacterBaseImage", selectedCharacter.baseImage);
    sessionStorage.setItem("omagotchiCharacterColorId", selectedColor.id);
    sessionStorage.setItem("omagotchiCharacterColorName", selectedColor.name);
    sessionStorage.setItem("omagotchiCharacterColor", selectedColor.value || "");
    localStorage.setItem(`omagotchiHasCharacter:${email}`, "true");
    localStorage.setItem(`omagotchiCharacterId:${email}`, selectedCharacter.id);
    localStorage.setItem(`omagotchiCharacterName:${email}`, selectedCharacter.name);
    localStorage.setItem(`omagotchiCharacterImage:${email}`, selectedImagePath);
    localStorage.setItem(`omagotchiCharacterAnimatedImage:${email}`, selectedAnimatedImagePath);
    localStorage.setItem(`omagotchiCharacterBaseImage:${email}`, selectedCharacter.baseImage);
    localStorage.setItem(`omagotchiCharacterColorId:${email}`, selectedColor.id);
    localStorage.setItem(`omagotchiCharacterColorName:${email}`, selectedColor.name);
    localStorage.setItem(`omagotchiCharacterColor:${email}`, selectedColor.value || "");

    selectedBubble.textContent = "입장!";
    selectedImage.classList.add("happy");

    setTimeout(() => {
        selectedImage.classList.remove("happy");
        window.location.href = "/check-in";
    }, 600);
});

renderCharacters();
renderColors();
updateSelectedView();
