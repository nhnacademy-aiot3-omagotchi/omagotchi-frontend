import React from "react";

const STATUS_LABELS = {
  present: "재실",
  away: "부재중",
  meeting: "회의중",
  offline: "퇴실"
};

function PresenceUsers({ users }) {
  if (!users.length) return <p className="presence-panel-empty">검색 결과가 없습니다.</p>;

  return Object.keys(STATUS_LABELS).map((status) => {
    const groupUsers = users.filter((user) => user.status === status);
    if (!groupUsers.length) return null;
    return (
      <section className="presence-group" data-status={status} key={status}>
        <h3>{STATUS_LABELS[status]} · {groupUsers.length}</h3>
        <ul>
          {groupUsers.map((user) => (
            <li className={`presence-user${status === "offline" ? " is-offline" : ""}`} key={user.id || user.email}>
              <span className="presence-user-avatar"><img src={user.characterImage} alt="" /></span>
              <span className="presence-user-copy">
                <strong>{user.name}{user.current ? " · 나" : ""}</strong>
                <span>{user.email}</span>
              </span>
              <span className="presence-user-status">{STATUS_LABELS[status]}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  });
}

export function PresenceHud({
  count = 0,
  capacity = 50,
  panelOpen = false,
  roomName = "AIoT 3기 실습실",
  updatedText = "아직 갱신하지 않음",
  users = []
}) {
  return (
    <aside className="presence-hud" data-presence-hud>
      <button
        className="presence-trigger"
        type="button"
        data-presence-trigger
        aria-expanded={panelOpen}
        aria-controls="presence-panel"
        aria-label="재실 인원 보기"
        title="재실 인원 보기"
      >
        <span className="presence-trigger-copy">
          <strong>실습실 재실 인원</strong>
          <span><b data-presence-count>{count}</b><b className="sr-only" data-presence-capacity>{capacity}</b></span>
        </span>
        <img className="home-dock-icon" src="/images/app/social.png" alt="" aria-hidden="true" />
        <span className="home-dock-label">재실</span>
        <kbd aria-hidden="true">U</kbd>
      </button>

      <section className="presence-panel" id="presence-panel" data-presence-panel aria-labelledby="presence-panel-title" hidden={!panelOpen}>
        <header>
          <span className="quick-panel-icon" aria-hidden="true"><img src="/images/app/social.png" alt="" /></span>
          <div className="presence-panel-heading"><h2 id="presence-panel-title">{roomName}</h2></div>
          <div className="presence-panel-actions">
            <button className="presence-refresh" type="button" data-presence-refresh aria-label="재실 인원 새로고침" title="재실 인원 새로고침">↻</button>
            <button className="quick-panel-close" type="button" data-presence-close aria-label="재실 인원 닫기">×</button>
          </div>
        </header>
        <label className="presence-search">
          <span className="sr-only">이름 또는 이메일 검색</span>
          <input type="search" data-presence-search placeholder="이름 또는 이메일 검색" autoComplete="off" />
        </label>
        <div className="presence-list" data-presence-list><PresenceUsers users={users} /></div>
        <footer>
          <span data-presence-updated>{updatedText}</span>
          <span><kbd>Esc</kbd> 닫기</span>
        </footer>
      </section>
    </aside>
  );
}
