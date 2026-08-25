import React from "react";
import { HomeDockButton } from "./HomeDockButton.jsx";
import { PresenceHud } from "./PresenceHud.jsx";

const EMPTY_PRESENCE_PROPS = Object.freeze({});

// 이 영역의 열림·출석 상태와 내부 목록은 기존 home.js Controller가 소유한다.
// AI 도우미 상태로 ActionDock이 다시 렌더링되어도 Controller가 갱신한 DOM을 덮어쓰지 않는다.
const LegacyDockControls = React.memo(function LegacyDockControls({ attendanceVisible, presenceProps }) {
  return (
    <>
      <button className="attendance-button" type="button" data-attendance-button title="퇴실하기" aria-label="퇴실하기" hidden={!attendanceVisible}>
        <img className="home-dock-icon" src="/images/app/exit.png" alt="" aria-hidden="true" />
        <span className="home-dock-label" data-attendance-label>퇴실</span>
      </button>
      <HomeDockButton className="home-music-toggle" label="BGM" iconSrc="/images/app/music.png" data-home-music-toggle expanded={false} controls="home-bgm-player" title="BGM 열기" />
      <HomeDockButton className="home-attendance-toggle" label="출석" iconSrc="/images/app/calendar.png" data-attendance-panel-toggle expanded={false} controls="attendance-detail" title="출석부 열기" />
      <PresenceHud {...presenceProps} />
    </>
  );
});

export function ActionDock({ aiOpen = false, onAiToggle = () => {}, attendanceVisible = false, presenceProps = EMPTY_PRESENCE_PROPS }) {
  return (
    <div className="home-action-dock" aria-label="홈 빠른 실행">
      <HomeDockButton className="home-chat-toggle home-ai-toggle" label="AI" iconSrc="/images/app/commu.png" expanded={aiOpen} controls="home-ai-assistant-panel" title={aiOpen ? "AI 도우미 닫기" : "AI 도우미 열기"} onClick={onAiToggle} />
      <LegacyDockControls attendanceVisible={attendanceVisible} presenceProps={presenceProps} />
    </div>
  );
}
