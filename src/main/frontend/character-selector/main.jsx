import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { CHARACTER_COLORS, CHARACTERS, CharacterSelector } from "./CharacterSelector.jsx";

function CharacterSelectorApp() {
  const [characterId, setCharacterId] = useState("study");
  const [colorId, setColorId] = useState("original");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(false);
  const assets = window.OmagotchiCharacterAssets;
  const character = CHARACTERS.find(({ id }) => id === characterId) || CHARACTERS[0];
  const color = CHARACTER_COLORS.find(({ id }) => id === colorId) || CHARACTER_COLORS[0];
  const resolveImage = (nextCharacter, nextColor) => nextColor.id === "original"
    ? nextCharacter.baseImage
    : assets.getPng(nextCharacter.id, nextColor.id);
  const resolveAnimatedImage = (nextCharacter, nextColor) => assets.getEyeGif(nextCharacter.id, nextColor.id);

  async function saveSelection() {
    if (loading) return;
    setLoading(true);
    setFeedback("");

    try {
      await window.OmagotchiApi?.character?.saveSelection?.({ characterId, colorId });
      const image = resolveImage(character, color);
      const animatedImage = resolveAnimatedImage(character, color);
      const email = sessionStorage.getItem("omagotchiEmail") || localStorage.getItem("omagotchiLastEmail") || "guest";

      sessionStorage.setItem("omagotchiCharacterId", character.id);
      sessionStorage.setItem("omagotchiCharacterName", character.name);
      sessionStorage.setItem("omagotchiCharacterImage", image);
      sessionStorage.setItem("omagotchiCharacterAnimatedImage", animatedImage);
      sessionStorage.setItem("omagotchiCharacterBaseImage", character.baseImage);
      sessionStorage.setItem("omagotchiCharacterColorId", color.id);
      sessionStorage.setItem("omagotchiCharacterColorName", color.name);
      sessionStorage.setItem("omagotchiCharacterColor", color.value || "");
      localStorage.setItem(`omagotchiHasCharacter:${email}`, "true");
      localStorage.setItem(`omagotchiCharacterId:${email}`, character.id);
      localStorage.setItem(`omagotchiCharacterName:${email}`, character.name);
      localStorage.setItem(`omagotchiCharacterImage:${email}`, image);
      localStorage.setItem(`omagotchiCharacterAnimatedImage:${email}`, animatedImage);
      localStorage.setItem(`omagotchiCharacterBaseImage:${email}`, character.baseImage);
      localStorage.setItem(`omagotchiCharacterColorId:${email}`, color.id);
      localStorage.setItem(`omagotchiCharacterColorName:${email}`, color.name);
      localStorage.setItem(`omagotchiCharacterColor:${email}`, color.value || "");
      setCompleted(true);
      window.setTimeout(() => window.location.assign("/check-in"), 600);
    } catch {
      setFeedback("캐릭터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <CharacterSelector
      characterId={characterId}
      colorId={colorId}
      loading={loading}
      feedback={feedback}
      completed={completed}
      resolveImage={resolveImage}
      resolveAnimatedImage={resolveAnimatedImage}
      onCharacterChange={setCharacterId}
      onColorChange={setColorId}
      onSubmit={saveSelection}
    />
  );
}

const root = document.getElementById("character-selector-react-root");
if (root) createRoot(root).render(<CharacterSelectorApp />);
