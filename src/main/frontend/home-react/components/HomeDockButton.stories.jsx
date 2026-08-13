import React from "react";
import { HomeDockButton } from "./HomeDockButton.jsx";

const meta = {
  title: "Home/HomeDockButton",
  component: HomeDockButton,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "240px", padding: "72px 24px", background: "#d9f4e4" }}>
        <div className="home-action-dock" style={{ position: "static", width: "max-content" }}>
          <Story />
        </div>
      </div>
    )
  ],
  args: {
    label: "BGM",
    iconSrc: "/images/app/music.png",
    title: "BGM 열기"
  },
  argTypes: {
    expanded: { control: "boolean" },
    disabled: { control: "boolean" }
  },
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const Default = {};

export const Expanded = {
  args: {
    expanded: true,
    title: "BGM 닫기"
  }
};

export const Disabled = {
  args: {
    disabled: true,
    title: "BGM을 사용할 수 없음"
  }
};
