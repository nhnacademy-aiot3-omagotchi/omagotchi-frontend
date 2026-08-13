import React from "react";
import { GameCard } from "./GameCard.jsx";

const meta = {
  title: "UI/Card",
  component: GameCard,
  decorators: [(Story) => <div className="ui-story-canvas"><div style={{ width: "min(100%, 420px)" }}><Story /></div></div>],
  args: { eyebrow: "오늘의 목표", title: "집중 학습 2시간", description: "조금씩 꾸준히 이어가 보세요.", tone: "mint" },
  argTypes: { tone: { control: "select", options: ["mint", "cream", "sky", "peach", "lilac"] } },
  parameters: { layout: "fullscreen" }
};

export default meta;
export const Mint = {};
export const Cream = { args: { tone: "cream" } };
export const Sky = { args: { tone: "sky" } };
export const Peach = { args: { tone: "peach" } };
export const Lilac = { args: { tone: "lilac" } };
