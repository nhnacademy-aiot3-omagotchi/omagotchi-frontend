import React, { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
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
export const Default = {
  render: () => <InteractiveDock />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const attendanceButton = canvasElement.querySelector("[data-attendance-button]");
    attendanceButton.hidden = false;
    attendanceButton.querySelector("[data-attendance-label]").textContent = "완료";

    await userEvent.click(canvas.getByRole("button", { name: "채팅 입력 열기" }));

    await expect(attendanceButton).toBeVisible();
    await expect(attendanceButton).toHaveTextContent("완료");
  }
};
export const ChatOpen = { render: () => <ActionDock chatOpen /> };
export const CheckedIn = { render: () => <InteractiveDock attendanceVisible /> };
