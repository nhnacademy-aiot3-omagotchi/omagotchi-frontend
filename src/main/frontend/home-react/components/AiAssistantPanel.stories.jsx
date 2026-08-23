import React, { useState } from "react";
import { AiAssistantPanel } from "./AiAssistantPanel.jsx";

function InteractiveAiAssistantPanel({ initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <AiAssistantPanel
        open={open}
        setOpen={setOpen}
        characterImage="/images/characters/night/Light_Coral_eye3.gif"
        characterName="m00n"
      />
    </div>
  );
}

const meta = {
  title: "Home/AiAssistantPanel",
  component: AiAssistantPanel,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "720px", padding: "32px", background: "#087046" }}>
        <Story />
      </div>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Closed = { render: () => <InteractiveAiAssistantPanel /> };
export const Preparing = { render: () => <InteractiveAiAssistantPanel initialOpen /> };
