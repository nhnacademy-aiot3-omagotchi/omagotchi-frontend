import { streakWingSrc } from "./characterWing.js";

export function createCharacter({
    image,
    wing,
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

    function showMessage(message, resetDelay = 3000) {
        if (!bubble) {
            return;
        }

        window.clearTimeout(bubbleTimer);
        bubble.hidden = false;
        bubble.textContent = message;
        bubble.classList.remove("is-changing");

        window.requestAnimationFrame(() => {
            bubble.classList.add("is-changing");
        });

        bubbleTimer = window.setTimeout(() => {
            bubble.hidden = true;
            bubble.classList.remove("is-changing");
        }, resetDelay);
    }

    function setStudyState(isStudying) {
        studying = isStudying;
        stage?.classList.toggle("is-studying", isStudying);
    }

    function setAttendanceStreak(count = 0) {
        if (!wing) return;

        const nextWing = streakWingSrc(count);

        if (!nextWing) {
            wing.hidden = true;
            wing.removeAttribute("src");
            stage?.classList.remove("has-streak-wing");
            return;
        }

        if (!wing.src.endsWith(nextWing)) {
            wing.src = nextWing;
        }
        wing.hidden = false;
        stage?.classList.add("has-streak-wing");
    }

    function handleCharacterClick() {
        clickCount += 1;
        const messages = ["좋아요!", "같이 공부해요!", "한 번 더!", "오늘도 성장 중!"];

        interaction.classList.remove("is-reacting");
        stage?.classList.remove("is-reacting");
        window.requestAnimationFrame(() => {
            interaction.classList.add("is-reacting");
            stage?.classList.add("is-reacting");
        });

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
                stage?.classList.remove("is-reacting");
            }
        });
    }

    return { init, showMessage, setStudyState, setAttendanceStreak };
}
