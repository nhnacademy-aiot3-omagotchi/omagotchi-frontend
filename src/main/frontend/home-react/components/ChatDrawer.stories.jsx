import React from "react";
import { ChatDrawer } from "./ChatDrawer.jsx";

function InteractiveChatDrawer({ initialOpen = false, disabled = true }) {
  return (
    <div style={{ width: "min(100%, 420px)" }}>
      <ChatDrawer chatOpen={initialOpen} setChatOpen={() => {}} disabled={disabled} />
    </div>
  );
}

const meta = {
  title: "Home/ChatDrawer",
  component: ChatDrawer,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "360px", display: "grid", placeItems: "center", padding: "32px", background: "#087046" }}>
        <Story />
      </div>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Closed = { render: () => <InteractiveChatDrawer /> };
export const Open = { render: () => <InteractiveChatDrawer initialOpen /> };
export const EnabledInput = { render: () => <InteractiveChatDrawer initialOpen disabled={false} /> };
