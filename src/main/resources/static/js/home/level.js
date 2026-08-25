export function createLevel({
    levelElement,
    xpFill,
    currentXpLabel,
    nextLevelLabel,
    characterImage,
    characterStage,
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

    // 실제 레벨이 증가했을 때만 캐릭터와 화면 효과를 함께 실행한다.
    function playLevelUpEffect(level) {
        const effectTargets = [levelElement, characterImage, characterStage].filter(Boolean);

        effectTargets.forEach((target) => target.classList.remove("is-level-up"));

        window.requestAnimationFrame(() => {
            effectTargets.forEach((target) => target.classList.add("is-level-up"));
        });

        window.setTimeout(() => {
            effectTargets.forEach((target) => target.classList.remove("is-level-up"));
        }, 1100);

        showLevelUpCelebration(level);
    }

    function render() {
        const progress = Math.min(100, Math.round((currentXp / requiredXp) * 100));

        if (levelElement) levelElement.textContent = String(level);
        if (xpFill) xpFill.style.width = `${progress}%`;
        if (currentXpLabel) currentXpLabel.textContent = `${currentXp}xp`;
        if (nextLevelLabel) nextLevelLabel.textContent = `${currentXp}  /  ${requiredXp}`;
    }

    function update(next = {}) {
        const previousLevel = level;
        level = Number(next.level) || level;
        currentXp = Number(next.currentExp) || 0;
        requiredXp = Math.max(1, Number(next.requiredExp) || requiredXp);
        render();
        if (level > previousLevel) {
            playLevelUpEffect(level);
        }
    }

    return { render, update };
}
