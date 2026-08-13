import React, { useState } from "react";
import { ActionDock } from "./ActionDock.jsx";
import { BgmPlayer } from "./BgmPlayer.jsx";
import { CharacterStage } from "./CharacterStage.jsx";
import { ChatDrawer } from "./ChatDrawer.jsx";
import { StatusHud } from "./StatusHud.jsx";
import { TimerPanel } from "./TimerPanel.jsx";
import { TopMenu } from "./TopMenu.jsx";

export function HomeStage({
  initialChatOpen = false,
  topMenuProps = {},
  timerProps = {},
  characterProps = {},
  statusProps = {},
  chatProps = {},
  actionDockProps = {},
  bgmProps = {}
}) {
  const [chatOpen, setChatOpen] = useState(initialChatOpen);

  return (
    <div className="home-stage">
      <section className="home-top-zone" aria-label="홈 메뉴"><TopMenu {...topMenuProps} /></section>
      <section className="home-timer-zone" aria-label="학습 타이머 영역"><TimerPanel {...timerProps} /></section>
      <section className="home-character-zone" aria-label="오마고치 영역"><CharacterStage {...characterProps} /></section>
      <section className="home-bottom-hud" aria-label="캐릭터 요약과 빠른 실행">
        <StatusHud {...statusProps} />
        <ChatDrawer {...chatProps} chatOpen={chatOpen} setChatOpen={setChatOpen} />
        <ActionDock {...actionDockProps} chatOpen={chatOpen} onChatToggle={() => setChatOpen((open) => !open)} />
      </section>
      <section className="home-floating-layer" aria-label="홈 보조 패널"><BgmPlayer {...bgmProps} /></section>
    </div>
  );
}
