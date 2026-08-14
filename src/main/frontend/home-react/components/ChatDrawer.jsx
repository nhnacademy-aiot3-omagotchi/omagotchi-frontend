import React, { useState } from "react";

export function ChatDrawer({ chatOpen = false, setChatOpen = () => {}, disabled = true }) {
  const [touchStartX, setTouchStartX] = useState(null);

  const handleTouchEnd = (event) => {
    if (touchStartX == null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (deltaX > 34) setChatOpen(true);
    if (deltaX < -34) setChatOpen(false);
    setTouchStartX(null);
  };

  return (
    <section
      className={chatOpen ? "home-chat-bar is-open" : "home-chat-bar"}
      aria-label="실시간 채팅"
      data-chat-open={chatOpen ? "true" : "false"}
      onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="home-chat-panel" id="home-chat-input-panel">
        <div className="home-chat-tabs" aria-label="지원 예정 채팅방">
          <span className="is-active">
            <span className="home-chat-tab-icon home-chat-tab-icon-global" aria-hidden="true"></span>
            GLOBAL
          </span>
          <span>COHORT</span>
        </div>
        <label className="home-chat-input">
          <span className="sr-only">채팅 메시지</span>
          <input type="text" placeholder="메시지 입력" disabled={disabled} />
        </label>
      </div>
    </section>
  );
}
