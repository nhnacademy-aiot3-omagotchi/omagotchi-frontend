export function createLevel({
    levelElement,
    xpFill,
    currentXpLabel,
    nextLevelLabel,
    characterImage,
    storageKey,
    xpPerLevel = 50
}) {
    let renderedLevel = null;

    function getStoredXp() {
        const storedXp = Number(localStorage.getItem(storageKey));
        return Number.isFinite(storedXp) && storedXp > 0 ? storedXp : 0;
    }
    // 레벨업 이펙트
    function playLevelUpEffect() {
        const badge = levelElement?.closest(".character-badge");

        badge?.classList.remove("is-level-up");
        characterImage?.classList.remove("is-level-up");

        window.requestAnimationFrame(() => {
            badge?.classList.add("is-level-up");
            characterImage?.classList.add("is-level-up");
        });

        window.setTimeout(() => {
            badge?.classList.remove("is-level-up");
            characterImage?.classList.remove("is-level-up");
        }, 1200);
    }

    function render(options = {}) {
        const totalXp = getStoredXp();
        const level = Math.floor(totalXp / xpPerLevel) + 1;
        const xpInLevel = totalXp % xpPerLevel;
        const progress = Math.min(100, Math.round((xpInLevel / xpPerLevel) * 100));
        const shouldAnimate = options.animate && renderedLevel !== null && level > renderedLevel;

        if (levelElement) levelElement.textContent = `Lv ${level}`;
        if (xpFill) xpFill.style.width = `${progress}%`;
        if (currentXpLabel) currentXpLabel.textContent = `${xpInLevel}xp`;
        if (nextLevelLabel) nextLevelLabel.textContent = `다음 레벨까지 ${xpPerLevel - xpInLevel}xp`;

        if (shouldAnimate) {
            playLevelUpEffect();
        }
        renderedLevel = level;
    }
    // 경험치 +
    function addXp(amount) {
        localStorage.setItem(storageKey, String(getStoredXp() + amount));
        render({ animate: true });
    }

    return { render, addXp };
}
