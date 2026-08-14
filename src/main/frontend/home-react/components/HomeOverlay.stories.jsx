import React from "react";
import { HomeOverlay } from "./HomeOverlay.jsx";

const meta = {
  title: "Home/HomeOverlay",
  component: HomeOverlay,
  decorators: [
    (Story) => <div className="home-page" style={{ minHeight: "100vh", background: "#087046" }}><Story /></div>
  ],
  args: {
    type: "help",
    meta: {
      icon: "/images/app/help.png",
      title: "도움말",
      description: "홈 화면의 주요 기능을 확인합니다."
    },
    content: `<section><h3>오마고치 홈 이용 방법</h3><p>타이머를 시작하고 캐릭터와 함께 학습 시간을 기록해 보세요.</p></section>`
  },
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Help = {};
export const Progress = {
  args: {
    type: "progress",
    meta: { icon: "/images/app/quest.png", title: "성장 현황", description: "현재 캐릭터의 성장 기록입니다." },
    content: `
      <section data-overlay-panel="quests"><h3>일일 퀘스트</h3><p>집중 학습 30분을 완료해 보세요.</p></section>
      <section data-overlay-panel="achievements"><h3>업적</h3><p>첫 학습 기록을 달성했습니다.</p></section>
      <section data-overlay-panel="leaders"><h3>랭킹</h3><p>랭킹 데이터가 없습니다.</p></section>
      <section data-overlay-panel="timeline"><h3>타임라인</h3><p>최근 활동을 확인합니다.</p></section>
      <section data-overlay-panel="stats"><h3>학습 통계</h3><p>다음 레벨까지 경험치가 18% 남았습니다.</p><progress value="82" max="100">82%</progress></section>
    `
  }
};
export const Settings = {
  args: {
    type: "settings",
    meta: { icon: "/images/app/set.png", title: "설정", description: "홈 화면의 표시 방식을 조정합니다." },
    content: `<section><h3>화면 설정</h3><label><input type="checkbox" checked disabled> 배경 음악 사용</label></section>`
  }
};
