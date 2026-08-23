import React, { useState } from "react";

export function AiAssistantPanel({ open = false, setOpen = () => {} }) {
  const [touchStartX, setTouchStartX] = useState(null);

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
        <div className="home-ai-conversation" aria-live="polite">
          <div className="home-ai-message is-assistant">
            <span className="home-ai-message-author">AI 도우미</span>
            <p>MCP 연결을 준비하고 있습니다.</p>
            <p>연결이 완료되면 이곳에서 학습 기록과 출석 정보를 질문할 수 있어요.</p>
          </div>
        </div>
        <footer className="home-ai-panel-footer">
          <span className="home-ai-panel-status">준비 중</span>
          <p>현재는 메시지를 보내거나 답변을 생성하지 않습니다.</p>
        </footer>
      </div>
    </section>
  );
}
