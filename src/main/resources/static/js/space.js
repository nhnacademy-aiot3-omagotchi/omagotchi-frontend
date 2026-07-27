// 공간 화면의 탭, 페이지 표시, 이동 버튼 요소
const spaceTabs = document.querySelectorAll("[data-space-tab]");
const spaceViews = document.querySelectorAll("[data-space-view]");
const spaceCaption = document.querySelector("[data-space-caption]");
const spacePage = document.querySelector("[data-space-page]");
const spacePrev = document.querySelector("[data-space-prev]");
const spaceNext = document.querySelector("[data-space-next]");
const spaceCharacter = document.querySelector("[data-space-character]");

const spaces = ["lab", "meeting", "library"];
const captions = {
    lab: "입실하면 실습실에 자동으로 참여한 상태가 됩니다.",
    meeting: "회의실 사용 현황을 보고 사용, 참여, 알림을 선택합니다.",
    library: "도서관 좌석 현황을 확인하고 입장 또는 퇴장합니다."
};

// 캐릭터 선택 화면에서 저장한 캐릭터를 공간 화면에도 동일하게 표시
const currentUserEmail = sessionStorage.getItem("omagotchiEmail")
    || localStorage.getItem("omagotchiLastEmail")
    || "guest";
const selectedCharacterId = sessionStorage.getItem("omagotchiCharacterId")
    || localStorage.getItem(`omagotchiCharacterId:${currentUserEmail}`);
const selectedCharacterColorId = sessionStorage.getItem("omagotchiCharacterColorId")
    || localStorage.getItem(`omagotchiCharacterColorId:${currentUserEmail}`)
    || "original";
const selectedCharacterImage = sessionStorage.getItem("omagotchiCharacterImage")
    || localStorage.getItem(`omagotchiCharacterImage:${currentUserEmail}`)
    || "/images/characters/default/omagotchi.png";
const selectedCharacterAnimatedImage = sessionStorage.getItem("omagotchiCharacterAnimatedImage")
    || localStorage.getItem(`omagotchiCharacterAnimatedImage:${currentUserEmail}`)
    || (selectedCharacterId
        ? window.OmagotchiCharacterAssets.getEyeGif(selectedCharacterId, selectedCharacterColorId)
        : "/images/characters/default/omagotchi_eye.gif");

if (spaceCharacter) {
    spaceCharacter.onerror = () => {
        spaceCharacter.onerror = null;
        spaceCharacter.src = selectedCharacterImage;
    };
    spaceCharacter.src = selectedCharacterAnimatedImage;
}

// 실습실, 회의실, 도서관 중 선택한 공간만 표시
function setActiveSpace(spaceName) {
    const nextSpace = spaces.includes(spaceName) ? spaceName : "lab";
    const nextIndex = spaces.indexOf(nextSpace);

    spaceTabs.forEach((tab) => {
        const isActive = tab.dataset.spaceTab === nextSpace;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });

    spaceViews.forEach((view) => {
        const isActive = view.dataset.spaceView === nextSpace;
        view.classList.toggle("is-active", isActive);
        view.hidden = !isActive;
    });

    if (spaceCaption) {
        spaceCaption.textContent = captions[nextSpace];
    }

    if (spacePage) {
        spacePage.textContent = `page ${nextIndex + 1} / ${spaces.length}`;
    }

    if (location.hash.slice(1) !== nextSpace) {
        history.replaceState(null, "", `#${nextSpace}`);
    }
}

// 공간 탭과 이전/다음 페이지 이동
spaceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        setActiveSpace(tab.dataset.spaceTab);
    });
});

spacePrev?.addEventListener("click", () => {
    const currentIndex = spaces.indexOf(location.hash.slice(1));
    const nextIndex = currentIndex <= 0 ? spaces.length - 1 : currentIndex - 1;
    setActiveSpace(spaces[nextIndex]);
});

spaceNext?.addEventListener("click", () => {
    const currentIndex = spaces.indexOf(location.hash.slice(1));
    const nextIndex = currentIndex >= spaces.length - 1 ? 0 : currentIndex + 1;
    setActiveSpace(spaces[nextIndex]);
});

// API 연동 전 공간 버튼의 처리 결과를 임시로 표시
document.querySelectorAll("[data-room-action]").forEach((button) => {
    button.addEventListener("click", () => {
        const originalText = button.textContent;
        button.textContent = "처리됨";
        button.disabled = true;

        window.setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 900);
    });
});

// URL 해시를 기준으로 공간 화면 초기화
setActiveSpace(location.hash.slice(1) || "lab");
