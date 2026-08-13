import React, { useState } from "react";
import { ActionDock } from "./ActionDock.jsx";

function InteractiveDock({ attendanceVisible = false }) {
  const [chatOpen, setChatOpen] = useState(false);
  return <ActionDock chatOpen={chatOpen} onChatToggle={() => setChatOpen((open) => !open)} attendanceVisible={attendanceVisible} />;
}

const meta = {
  title: "Home/ActionDock",
  component: ActionDock,
  decorators: [(Story) => <div className="home-page" style={{ minHeight: "360px", display: "grid", placeItems: "center", background: "#087046" }}><Story /></div>],
  parameters: { layout: "fullscreen" }
};

export default meta;
export const Default = { render: () => <InteractiveDock /> };
export const ChatOpen = { render: () => <ActionDock chatOpen /> };
export const CheckedIn = { render: () => <InteractiveDock attendanceVisible /> };
