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
  const [alertOverlays, setAlertOverlays] = useState([]);

  useEffect(() => {
    const closeAiAssistant = () => setAiOpen(false);
    window.addEventListener("omagotchi:home-ai-close", closeAiAssistant);
    return () => window.removeEventListener("omagotchi:home-ai-close", closeAiAssistant);
  }, []);

  useEffect(() => {
    const applyAlerts = (event) => {
      const next = event.detail?.overlays;
      setAlertOverlays(Array.isArray(next) ? next : []);
    };
    window.addEventListener("omagotchi:home-menu-alert", applyAlerts);
    // home.js 가 마운트보다 먼저 계산했을 수 있어 남겨 둔 값을 한 번 읽는다.
    if (Array.isArray(globalThis.OmagotchiHomeMenuAlerts)) {
      setAlertOverlays(globalThis.OmagotchiHomeMenuAlerts);
    }
    return () => window.removeEventListener("omagotchi:home-menu-alert", applyAlerts);
  }, []);

  return (
    <div className="home-stage">
      <section className="home-top-zone" aria-label="홈 메뉴"><TopMenu alertOverlays={alertOverlays} {...topMenuProps} /></section>
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
