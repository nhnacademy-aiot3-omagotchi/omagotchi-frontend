import React from "react";

/**
 * @param levelUp 레벨업 직후 잠깐 true. 연출 클래스를 React 가 붙여야 리렌더에 지워지지 않는다.
 */
export function StatusHud({
  level = 1,
  characterName = "오마고치",
  currentXp = 0,
  nextLevelXp = 50,
  progress = 0,
  presence = "online",
  levelUp = false
}) {
  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <section className="home-status-cluster" aria-label="캐릭터 성장 상태">
      <div className="character-badge" data-presence={presence}>
        <strong className={levelUp ? "is-level-up" : undefined} data-character-level>{level}</strong>
        <span data-character-name>{characterName}</span>
      </div>
      <div className="xp-area" aria-label="경험치">
        <div className="xp-bar">
          <span data-xp-fill style={{ width: `${normalizedProgress}%` }}></span>
        </div>
        <div className="xp-labels">
          <span data-current-xp>{currentXp}xp</span>
          <span data-next-level>다음 레벨까지 {nextLevelXp}xp</span>
        </div>
      </div>
    </section>
  );
}
