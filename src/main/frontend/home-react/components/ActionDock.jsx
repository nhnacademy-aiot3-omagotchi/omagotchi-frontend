import React from "react";
import { HomeDockButton } from "./HomeDockButton.jsx";
import { PresenceHud } from "./PresenceHud.jsx";

export function ActionDock({ chatOpen = false, onChatToggle = () => {}, attendanceVisible = false, presenceProps = {} }) {
  return (
    <div className="home-action-dock" aria-label="홈 빠른 실행">
      <HomeDockButton className="home-chat-toggle" label="채팅" iconSrc="/images/app/commu.png" expanded={chatOpen} controls="home-chat-input-panel" title={chatOpen ? "채팅 입력 닫기" : "채팅 입력 열기"} onClick={onChatToggle} />
      <button className="attendance-button" type="button" data-attendance-button title="퇴실하기" aria-label="퇴실하기" hidden={!attendanceVisible}>
        <img className="home-dock-icon" src="/images/app/exit.png" alt="" aria-hidden="true" />
        <span className="home-dock-label" data-attendance-label>퇴실</span>
      </button>
      <HomeDockButton className="home-music-toggle" label="BGM" iconSrc="/images/app/music.png" data-home-music-toggle expanded={false} controls="home-bgm-player" title="BGM 열기" />
      <HomeDockButton className="home-attendance-toggle" label="출석" iconSrc="/images/app/calendar.png" data-attendance-panel-toggle expanded={false} controls="attendance-detail" title="출석부 열기" />
      <PresenceHud {...presenceProps} />
    </div>
  );
}
