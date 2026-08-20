import React, { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { CharacterSelector } from "./CharacterSelector.jsx";

function InteractiveSelector(args) {
  const [characterId, setCharacterId] = useState(args.characterId);
  const [colorId, setColorId] = useState(args.colorId);
  return <CharacterSelector {...args} characterId={characterId} colorId={colorId} onCharacterChange={setCharacterId} onColorChange={setColorId} />;
}

const meta = {
  title: "Onboarding/CharacterSelector",
  component: CharacterSelector,
  render: (args) => <InteractiveSelector {...args} />,
  args: { characterId: "study", colorId: "original", loading: false, feedback: "" },
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Default = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "커밋이 선택" }));
    await userEvent.click(canvas.getByRole("button", { name: "라일락 색상 선택" }));
    await expect(canvas.getByText("커밋이 · 라일락")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "커밋이 선택" })).toHaveAttribute("aria-pressed", "true");
  }
};
export const Selected = { args: { characterId: "caffeine", colorId: "cyan" } };
export const Saving = { args: { characterId: "commit", colorId: "pistachio", loading: true } };
export const Error = { args: { feedback: "캐릭터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." } };
export const Mobile = {
  args: { characterId: "sprout", colorId: "cream_can" },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};
