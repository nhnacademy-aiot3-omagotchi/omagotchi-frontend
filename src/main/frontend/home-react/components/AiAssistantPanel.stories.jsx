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
      <div className="home-page" style={{ minHeight: "100dvh", padding: "32px", background: "#087046" }}>
        <Story />
      </div>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Closed = { render: () => <InteractiveAiAssistantPanel /> };
export const Preparing = { render: () => <InteractiveAiAssistantPanel initialOpen /> };
/** 헤더의 ? 를 눌러 사용법 시트를 펼쳐둔 상태. */
export const Guide = {
  render: () => <InteractiveAiAssistantPanel initialOpen />,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector(".home-ai-panel-help")?.click();
  }
};

export const Desktop = {
  render: () => <InteractiveAiAssistantPanel initialOpen />,
  parameters: {
    viewport: {
      options: {
        desktop: {
          name: "PC 1440 × 900",
          styles: { width: "1440px", height: "900px" }
        }
      },
      defaultViewport: "desktop"
    }
  }
};
export const Mobile = {
  render: () => <InteractiveAiAssistantPanel initialOpen />,
  parameters: { viewport: { defaultViewport: "mobile1" } }
};
