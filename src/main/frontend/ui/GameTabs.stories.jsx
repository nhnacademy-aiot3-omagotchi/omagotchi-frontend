import React from "react";
import { GameCard } from "./GameCard.jsx";
import { GameTabs } from "./GameTabs.jsx";

const meta = {
  title: "UI/GameTabs",
  component: GameTabs,
  parameters: { layout: "centered" }
};

export default meta;

const items = [
  { value: "quest", label: "퀘스트", content: <GameCard eyebrow="오늘" title="집중 학습 3시간" description="42분 남았어요." /> },
  { value: "achievement", label: "업적", content: <GameCard eyebrow="준비 중" title="업적 기능은 아직 준비되지 않았습니다." description="기능이 준비되면 달성 기록을 확인할 수 있습니다." /> },
  { value: "ranking", label: "랭킹", content: <GameCard eyebrow="기록" title="랭킹 데이터가 없습니다." description="학습 기록이 제공되면 목록으로 표시됩니다." /> }
];

export const Default = { args: { items, defaultValue: "quest", ariaLabel: "진행 항목" } };
export const LongLabels = {
  args: {
    items: items.map((item) => ({ ...item, label: `${item.label} 현황 보기` })),
    defaultValue: "quest",
    ariaLabel: "긴 이름의 진행 항목"
  }
};
export const Mobile = {
  args: { items, defaultValue: "quest", ariaLabel: "진행 항목" },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};
