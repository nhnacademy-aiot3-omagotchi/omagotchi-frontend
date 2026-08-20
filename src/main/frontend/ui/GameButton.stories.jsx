import React from "react";
import { GameButton } from "./GameButton.jsx";

const meta = {
  title: "UI/Button",
  component: GameButton,
  decorators: [(Story) => <div className="ui-story-canvas"><Story /></div>],
  args: { children: "학습 시작", variant: "primary", loading: false, disabled: false },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "soft", "danger"] },
    children: { control: "text" }
  },
  parameters: { layout: "fullscreen" }
};

export default meta;
export const Primary = {};
export const Secondary = { args: { variant: "secondary", children: "다음에 하기" } };
export const Soft = { args: { variant: "soft", children: "도움말 보기" } };
export const Loading = { args: { loading: true } };
export const Disabled = { args: { disabled: true } };
