import React from "react";
import { PresenceHud } from "./PresenceHud.jsx";

const users = [
  { id: "me", name: "문재민", email: "jaemin@example.com", status: "present", current: true, characterImage: "/images/characters/default/omagotchi.png" },
  { id: "two", name: "박지우", email: "jiwoo@example.com", status: "meeting", characterImage: "/images/characters/caffeine/caffeine.png" },
  { id: "three", name: "손재민", email: "son@example.com", status: "offline", characterImage: "/images/characters/commit/commit.png" }
];

const meta = {
  title: "Home/PresenceHud",
  component: PresenceHud,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "680px", display: "grid", placeItems: "end center", padding: "48px", background: "#087046" }}>
        <div className="home-action-dock" style={{ position: "relative", overflow: "visible" }}><Story /></div>
      </div>
    )
  ],
  args: { count: 2, capacity: 50, panelOpen: false, roomName: "AIoT 3기 실습실", updatedText: "17:42:00 갱신", users },
  parameters: { layout: "fullscreen" }
};

export default meta;
export const Closed = {};
export const Open = { args: { panelOpen: true } };
export const Empty = { args: { panelOpen: true, count: 0, users: [], updatedText: "검색 결과 없음" } };
