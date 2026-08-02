export function createCharacter({
    image,
    stage,
    interaction,
    bubble,
    nameElement,
    selectedName,
    selectedImage,
    animatedImage
}) {
    let bubbleTimer = null;
    let clickCount = 0;
    let clickResetTimer = null;
    let studying = false;
    // 메시지 띄우기
    // [UI-KEEP] 캐릭터 기본 대사 -> 유지
    function getIdleMessage() {
        return studying ? "집중하고 있어요!" : "오늘도 같이 공부해요!";
    }

    function showMessage(message, resetDelay = 2200) {
        if (!bubble) {
            return;
        }

        window.clearTimeout(bubbleTimer);
        bubble.textContent = message;
        bubble.classList.remove("is-changing");

        window.requestAnimationFrame(() => {
            bubble.classList.add("is-changing");
        });

        bubbleTimer = window.setTimeout(() => {
            bubble.textContent = getIdleMessage();
            bubble.classList.remove("is-changing");
        }, resetDelay);
    }

    function setStudyState(isStudying) {
        studying = isStudying;
        stage?.classList.toggle("is-studying", isStudying);
    }
    // [UI-KKEEP] 캐릭터 클릭 반응 -> 유지
    function handleCharacterClick() {
        clickCount += 1;
        const messages = ["좋아요!", "같이 공부해요!", "한 번 더!", "오늘도 성장 중!"];

        interaction.classList.remove("is-reacting");
        window.requestAnimationFrame(() => interaction.classList.add("is-reacting"));

        if (clickCount === 10) {
            showMessage("그만 눌러!", 5000);
            clickResetTimer = window.setTimeout(() => {
                clickCount = 0;
                clickResetTimer = null;
            }, 5000);
            return;
        }

        if (!clickResetTimer) {
            showMessage(messages[Math.floor(Math.random() * messages.length)]);
        }
    }

    function init() {
        if (image) {
            image.onerror = () => {
                image.onerror = null;
                image.src = selectedImage;
            };
            image.src = animatedImage;
        }

        if (nameElement) {
            nameElement.textContent = selectedName;
        }

        interaction?.addEventListener("click", handleCharacterClick);
        interaction?.addEventListener("animationend", (event) => {
            if (event.animationName === "character-play-hop") {
                interaction.classList.remove("is-reacting");
            }
        });
    }

    return { init, showMessage, setStudyState };
}
