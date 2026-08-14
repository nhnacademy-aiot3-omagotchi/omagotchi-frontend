import React from "react";
import { CharacterStage } from "./CharacterStage.jsx";

const meta = {
  title: "Home/CharacterStage",
  component: CharacterStage,
  decorators: [
    (Story) => (
      <div
        className="home-page"
        style={{ minHeight: "520px", display: "grid", placeItems: "center", padding: "48px 24px", background: "#087046" }}
      >
        <div className="home-character-zone" style={{ width: "min(100%, 720px)" }}>
          <Story />
        </div>
      </div>
    )
  ],
  args: {
    characterSrc: "/images/characters/default/omagotchi.png",
    characterAlt: "오마고치 캐릭터",
    interactionLabel: "오마고치와 놀아주기",
    wingSrc: "",
    message: ""
  },
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const Default = {};

export const Speaking = {
  args: {
    message: "오늘도 같이 공부해요!"
  }
};

export const Winged = {
  args: {
    characterSrc: "/images/characters/caffeine/caffeine_eye.gif",
    characterAlt: "카페인 오마고치 캐릭터",
    wingSrc: "/images/wing/grand/세슘.gif",
    message: "연속 출석으로 날개를 얻었어요!"
  }
};
