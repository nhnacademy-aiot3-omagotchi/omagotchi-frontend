export function createLevel({
    levelElement,
    xpFill,
    currentXpLabel,
    nextLevelLabel,
    characterImage,
    characterStage,
    storageKey,
    xpPerLevel = 50
}) {
    // [API-REPLACE] 서버에서 사용자 레벨 경험치를 조회하도록 교체
    function getStoredXp() {
        const storedXp = Number(localStorage.getItem(storageKey));
        return Number.isFinite(storedXp) && storedXp > 0 ? storedXp : 0;
    }
    // [POLICY-CHECK] 레벨 계산을 프론트에서 할지 서버에서 할지 결정
    function getLevel(totalXp) {
        return Math.floor(totalXp / xpPerLevel) + 1;
    }

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
        const totalXp = getStoredXp();
        const level = getLevel(totalXp);
        const xpInLevel = totalXp % xpPerLevel;
        const progress = Math.min(100, Math.round((xpInLevel / xpPerLevel) * 100));

        if (levelElement) levelElement.textContent = String(level);
        if (xpFill) xpFill.style.width = `${progress}%`;
        if (currentXpLabel) currentXpLabel.textContent = `${xpInLevel}xp`;
        if (nextLevelLabel) nextLevelLabel.textContent = `${xpInLevel}  /  ${xpPerLevel}`;
    }

    // 경험치 +
    // [API-REPLACE] 클라이언트에서 경험치를 직접 증가시키면 안 됨.
    // 퀘스트 출석 결과를 서버에서 검증한 뒤 경험치를 반영해야 함
    function addXp(amount) {
        const earnedXp = Number(amount);

        if (!Number.isFinite(earnedXp) || earnedXp <= 0) {
            render();
            return;
        }

        const currentXp = getStoredXp();
        const nextXp = currentXp + earnedXp;
        const previousLevel = getLevel(currentXp);
        const nextLevel = getLevel(nextXp);

        localStorage.setItem(storageKey, String(nextXp));
        render();

        if (nextLevel > previousLevel) {
            playLevelUpEffect(nextLevel);
        }
    }

    return { render, addXp };
}
