import React from "react";
import { TimerPanel } from "./TimerPanel.jsx";

const meta = {
  title: "Home/TimerPanel",
  component: TimerPanel,
  decorators: [
    (Story) => (
      <div
        className="home-page"
        style={{ minHeight: "420px", display: "grid", placeItems: "center", padding: "32px", background: "#087046" }}
      >
        <div style={{ width: "min(100%, 760px)" }}>
          <Story />
        </div>
      </div>
    )
  ],
  args: {
    display: "00:00:00",
    dateTime: "PT0S",
    actionLabel: "시작",
    statusMessage: "오늘의 학습 시간은 다음 날 04:00에 마감됩니다.",
    disabled: false
  },
  argTypes: {
    disabled: { control: "boolean" }
  },
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const Idle = {};

export const Running = {
  args: {
    display: "01:24:37",
    dateTime: "PT1H24M37S",
    actionLabel: "정지"
  }
};

export const Maintenance = {
  args: {
    actionLabel: "이용 준비 중",
    statusMessage: "매일 04:00~07:00에는 학습일을 정리합니다.",
    disabled: true
  }
};
