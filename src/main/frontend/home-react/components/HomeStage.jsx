import React, { useEffect, useState } from "react";
import { ActionDock } from "./ActionDock.jsx";
import { BgmPlayer } from "./BgmPlayer.jsx";
import { CharacterStage } from "./CharacterStage.jsx";
import { AiAssistantPanel } from "./AiAssistantPanel.jsx";
import { StatusHud } from "./StatusHud.jsx";
import { TimerPanel } from "./TimerPanel.jsx";
import { TopMenu } from "./TopMenu.jsx";

export function HomeStage({
  initialAiOpen = false,
  topMenuProps = {},
  timerProps = {},
  characterProps = {},
  statusProps = {},
  aiAssistantProps = {},
  actionDockProps = {},
  bgmProps = {}
}) {
  const [aiOpen, setAiOpen] = useState(initialAiOpen);

  useEffect(() => {
    const closeAiAssistant = () => setAiOpen(false);
    window.addEventListener("omagotchi:home-ai-close", closeAiAssistant);
    return () => window.removeEventListener("omagotchi:home-ai-close", closeAiAssistant);
  }, []);

  return (
    <div className="home-stage">
      <section className="home-top-zone" aria-label="홈 메뉴"><TopMenu {...topMenuProps} /></section>
      <section className="home-timer-zone" aria-label="학습 타이머 영역"><TimerPanel {...timerProps} /></section>
      <section className="home-character-zone" aria-label="오마고치 영역"><CharacterStage {...characterProps} /></section>
      <section className="home-bottom-hud" aria-label="캐릭터 요약과 빠른 실행">
        <StatusHud {...statusProps} />
        <AiAssistantPanel {...aiAssistantProps} open={aiOpen} setOpen={setAiOpen} />
        <ActionDock {...actionDockProps} aiOpen={aiOpen} onAiToggle={() => setAiOpen((open) => !open)} />
      </section>
      <section className="home-floating-layer" aria-label="홈 보조 패널"><BgmPlayer {...bgmProps} /></section>
    </div>
  );
}
