import React from "react";
import { BgmPlayer } from "./BgmPlayer.jsx";

const tracks = [
  { title: "Morning Garden", artist: "Pixabay", current: true },
  { title: "Quiet Library", artist: "Pixabay" },
  { title: "Focus Walk", artist: "Pixabay" }
];

const meta = {
  title: "Home/BgmPlayer",
  component: BgmPlayer,
  decorators: [
    (Story) => (
      <div className="home-page is-bgm-open" style={{ minHeight: "560px", padding: "40px", background: "#087046" }}>
        <div className="home-floating-layer"><Story /></div>
      </div>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Ready = {};
export const Playing = {
  args: { title: "Morning Garden", artist: "Pixabay", playing: true, shuffle: true, progress: 46, currentTime: "1:32", duration: "3:18" }
};
export const PlaylistOpen = {
  args: { title: "Morning Garden", artist: "Pixabay", playing: true, playlistOpen: true, progress: 46, currentTime: "1:32", duration: "3:18", tracks }
};
