import React from "react";
import { StatusHud } from "./StatusHud.jsx";

const meta = {
  title: "Home/StatusHud",
  component: StatusHud,
  decorators: [
    (Story) => (
      <div
        className="home-page"
        style={{ minHeight: "320px", display: "grid", placeItems: "center", padding: "32px", background: "#087046" }}
      >
        <div style={{ width: "min(100%, 520px)" }}>
          <Story />
        </div>
      </div>
    )
  ],
  args: {
    level: 1,
    characterName: "오마고치",
    currentXp: 0,
    nextLevelXp: 50,
    progress: 0,
    presence: "online"
  },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 100, step: 1 } },
    presence: { control: "select", options: ["online", "away", "offline"] }
  },
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const NewCharacter = {};

export const Growing = {
  args: {
    level: 4,
    characterName: "초록 오마고치",
    currentXp: 120,
    nextLevelXp: 30,
    progress: 80
  }
};

export const NearLevelUp = {
  args: {
    level: 9,
    characterName: "세슘 오마고치",
    currentXp: 495,
    nextLevelXp: 5,
    progress: 99
  }
};
