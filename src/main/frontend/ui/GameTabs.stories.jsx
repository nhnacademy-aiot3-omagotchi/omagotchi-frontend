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
  { value: "achievement", label: "업적", content: <GameCard tone="cream" eyebrow="달성" title="연속 출석 4일" description="내일도 이어가 보세요." /> },
  { value: "ranking", label: "랭킹", content: <GameCard tone="sky" eyebrow="이번 주" title="기수 내 12위" description="지난주보다 3계단 올랐어요." /> }
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
