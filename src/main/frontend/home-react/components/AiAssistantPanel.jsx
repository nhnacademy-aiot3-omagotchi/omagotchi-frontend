import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

export function AiAssistantPanel({
  open = false,
  setOpen = () => {},
  characterImage = "",
  characterName = ""
}) {
  const [touchStartX, setTouchStartX] = useState(null);
  const [currentCharacter, setCurrentCharacter] = useState({
    image: characterImage,
    name: characterName
  });

  useEffect(() => {
    const character = document.querySelector("[data-home-character]");
    const name = document.querySelector("[data-character-name]");

    const syncCurrentCharacter = () => {
      setCurrentCharacter({
        image: characterImage || character?.getAttribute("src") || "",
        name: characterName || name?.textContent?.trim() || "오마고치"
      });
    };

    syncCurrentCharacter();

    const observer = new MutationObserver(syncCurrentCharacter);
    if (!characterImage && character) {
      observer.observe(character, { attributes: true, attributeFilter: ["src"] });
    }
    if (!characterName && name) {
      observer.observe(name, { characterData: true, childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [characterImage, characterName]);

  const handleTouchEnd = (event) => {
    if (touchStartX == null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (open && deltaX > 46) setOpen(false);
    setTouchStartX(null);
  };

  return (
    <section
      className={open ? "home-ai-drawer is-open" : "home-ai-drawer"}
      aria-label="AI 도우미"
      data-ai-assistant-open={open ? "true" : "false"}
      onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="home-ai-panel"
        id="home-ai-assistant-panel"
        aria-hidden={!open}
      >
        <header className="home-ai-panel-heading">
          <span className="home-ai-panel-icon" aria-hidden="true">
            <img src="/images/app/commu.png" alt="" />
          </span>
          <span className="home-ai-panel-title">
            <strong>AI 도우미</strong>
            <small>학습을 돕는 오마고치 AI</small>
          </span>
          <button
            className="home-ai-panel-close"
            type="button"
            aria-label="AI 도우미 닫기"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="home-ai-conversation">
          <div className="home-ai-character-reply">
            <span className="home-ai-character-avatar" aria-hidden="true">
              {currentCharacter.image ? (
                <img src={currentCharacter.image} alt="" />
              ) : (
                <span className="home-ai-character-placeholder">AI</span>
              )}
            </span>
            <div
              className="home-ai-thinking-bubble"
              role="status"
              aria-live="polite"
              aria-label={`${currentCharacter.name}가 답변을 준비하고 있습니다.`}
            >
              <span className="home-ai-thinking-label">답변 준비 중</span>
              <span className="home-ai-thinking-dots" aria-hidden="true">
                <span className="home-ai-thinking-dot"></span>
                <span className="home-ai-thinking-dot"></span>
                <span className="home-ai-thinking-dot"></span>
              </span>
            </div>
          </div>
          <div className="home-ai-message is-assistant">
            <span className="home-ai-message-author">{currentCharacter.name}</span>
            <p>MCP 연결을 준비하고 있습니다.</p>
            <p>연결이 완료되면 학습 기록과 출석 정보를 함께 확인해 드릴게요.</p>
          </div>
        </div>
        <form className="home-ai-composer" onSubmit={(event) => event.preventDefault()}>
          <label className="home-ai-composer-label" htmlFor="home-ai-prompt">
            AI 도우미에게 질문하기
          </label>
          <textarea
            id="home-ai-prompt"
            rows="2"
            placeholder="MCP 연결 후 메시지를 입력할 수 있습니다."
            disabled
          ></textarea>
          <div className="home-ai-composer-actions">
            <button className="home-ai-model-select" type="button" disabled>
              <span>모델</span>
              <strong>연결 후 선택</strong>
              <span aria-hidden="true">⌄</span>
            </button>
            <span className="home-ai-panel-status">준비 중</span>
            <button className="home-ai-send" type="submit" aria-label="메시지 전송" disabled>
              ↑
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

AiAssistantPanel.propTypes = {
  open: PropTypes.bool,
  setOpen: PropTypes.func,
  characterImage: PropTypes.string,
  characterName: PropTypes.string
};
