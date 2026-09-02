/**
 * 성장 상태를 계산하고 React(StatusHud, CharacterStage)로 넘긴다.
 *
 * 예전에는 XP 바와 레벨 숫자를 querySelector 로 잡아 직접 고쳤다. 그 노드는 React 가
 * 소유하므로 리렌더에 덮이거나 교체되어, 보상을 받아도 바가 움직이지 않았다.
 * 이제 DOM 참조를 받지 않는다.
 */
export function createLevel({
    initialLevel = 1,
    initialCurrentXp = 0,
    initialRequiredXp = 1
}) {
    let level = Number(initialLevel) || 1;
    let currentXp = Number(initialCurrentXp) || 0;
    let requiredXp = Math.max(1, Number(initialRequiredXp) || 1);

    function showLevelUpCelebration(level) {
        document.querySelector(".level-up-celebration")?.remove();

        const celebration = document.createElement("div");
        const confetti = document.createElement("div");
        const announcement = document.createElement("div");
        const label = document.createElement("span");
        const levelText = document.createElement("strong");

        celebration.className = "level-up-celebration";
        celebration.setAttribute("role", "status");
        celebration.setAttribute("aria-live", "assertive");
        celebration.setAttribute("aria-atomic", "true");

        confetti.className = "level-up-confetti";
        confetti.setAttribute("aria-hidden", "true");

        for (let index = 0; index < 24; index += 1) {
            const piece = document.createElement("i");
            const lane = (index * 37) % 100;

            piece.style.setProperty("--confetti-x", `${lane}%`);
            piece.style.setProperty("--confetti-delay", `${(index % 8) * 45}ms`);
            piece.style.setProperty("--confetti-duration", `${1050 + (index % 5) * 90}ms`);
            piece.style.setProperty("--confetti-drift", `${((index % 7) - 3) * 18}px`);
            piece.style.setProperty("--confetti-rotation", `${220 + (index % 6) * 55}deg`);
            confetti.append(piece);
        }

        announcement.className = "level-up-announcement";
        label.textContent = "LEVEL UP";
        levelText.textContent = `Lv ${level}`;
        announcement.append(label, levelText);
        celebration.append(confetti, announcement);
        document.body.append(celebration);

        window.setTimeout(() => celebration.classList.add("is-leaving"), 1350);
        window.setTimeout(() => celebration.remove(), 1750);
    }

    /**
     * 레벨업 연출.
     *
     * 캐릭터·레벨 배지의 `is-level-up` 클래스는 React 가 소유하는 노드라서 여기서
     * 붙여도 다음 리렌더에 지워진다. 그래서 클래스는 publish() 로 React 에 맡기고,
     * 여기서는 document.body 에 직접 붙이는 축포만 담당한다.
     */
    function playLevelUpEffect(level) {
        showLevelUpCelebration(level);
    }

    /**
     * 성장 상태를 React(StatusHud)로 넘긴다.
     *
     * XP 바와 레벨 숫자는 React 가 그린다. 여기서 querySelector 로 잡아 둔 노드를
     * 직접 고치면 두 가지가 어긋난다. 캐시한 노드가 리렌더로 교체되면 화면에 붙어
     * 있지 않은 노드를 고치게 되고, 같은 노드라도 style 을 props 로 관리하므로
     * 다음 리렌더에 되돌아간다. 그래서 값만 넘기고 그리기는 React 에 맡긴다.
     *
     * React 마운트보다 이 호출이 먼저일 수 있어 전역에도 남긴다.
     */
    function publish(levelUp) {
        const snapshot = {
            level,
            currentExp: currentXp,
            requiredExp: requiredXp,
            progress: Math.min(100, Math.round((currentXp / requiredXp) * 100)),
            levelUp: Boolean(levelUp)
        };
        globalThis.OmagotchiHomeCharacter = snapshot;
        window.dispatchEvent(new CustomEvent("omagotchi:home-character-update", {detail: snapshot}));
    }

    function render() {
        publish(false);
    }

    function update(next = {}) {
        const previousLevel = level;
        level = Number(next.level) || level;
        currentXp = Number(next.currentExp) || 0;
        requiredXp = Math.max(1, Number(next.requiredExp) || requiredXp);

        const leveledUp = level > previousLevel;
        publish(leveledUp);
        if (leveledUp) {
            playLevelUpEffect(level);
        }
    }

    return { render, update };
}
