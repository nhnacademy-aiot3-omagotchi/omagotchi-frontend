import React from "react";

export function CharacterStage({
  characterSrc = "/images/characters/default/omagotchi.png",
  characterAlt = "오마고치 캐릭터",
  interactionLabel = "오마고치와 놀아주기",
  wingSrc = "",
  message = ""
}) {
  return (
    <section className="companion-panel" aria-label="캐릭터 상태">
      <div className="home-character-stage" data-character-stage>
        <img
          className="home-character-wing"
          data-character-wing
          src={wingSrc || undefined}
          alt=""
          aria-hidden="true"
          hidden={!wingSrc}
        />
        <div className="home-character-anchor">
          <p className="character-speech-bubble" data-character-bubble aria-live="polite" hidden={!message}>
            {message}
          </p>
          <button className="home-character-button" type="button" data-character-interaction aria-label={interactionLabel}>
            <img className="home-character" data-home-character src={characterSrc} alt={characterAlt} />
          </button>
        </div>
      </div>
    </section>
  );
}
