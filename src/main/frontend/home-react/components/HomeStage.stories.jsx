import React from "react";
import { HomeStage } from "./HomeStage.jsx";

const meta = {
  title: "Home/HomeStage",
  component: HomeStage,
  decorators: [
    (Story) => (
      <main className="home-page">
        <section className="home-hero"><div className="home-react-root"><Story /></div></section>
      </main>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Desktop = {};
export const Mobile = { parameters: { viewport: { defaultViewport: "mobile1" } } };
export const MobileLandscape = { parameters: { viewport: { defaultViewport: "mobile2", defaultOrientation: "landscape" } } };
export const ActiveSession = {
  args: {
    timerProps: { display: "00:42:18", dateTime: "PT42M18S", actionLabel: "일시정지", statusMessage: "집중 시간이 기록되고 있습니다." },
    characterProps: { message: "집중력이 차오르고 있어요!" },
    statusProps: { level: 7, characterName: "오마고치", currentXp: 410, nextLevelXp: 90, progress: 82 },
    actionDockProps: { attendanceVisible: true }
  }
};
