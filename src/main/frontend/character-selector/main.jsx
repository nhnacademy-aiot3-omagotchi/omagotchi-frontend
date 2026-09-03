import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CHARACTER_COLORS, CHARACTERS, CharacterSelector } from "./CharacterSelector.jsx";

function CharacterSelectorApp() {
  const [characters, setCharacters] = useState([]);
  const [characterId, setCharacterId] = useState("");
  const [colorId, setColorId] = useState("original");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(false);
  const assets = window.OmagotchiCharacterAssets;
  const character = useMemo(
    () => characters.find(({ id }) => id === characterId) || characters[0] || CHARACTERS[0],
    [characters, characterId]
  );
  const color = CHARACTER_COLORS.find(({ id }) => id === colorId) || CHARACTER_COLORS[0];
  const resolveImage = (nextCharacter, nextColor) => nextColor.id === "original"
    ? nextCharacter.baseImage
    : assets.getPng(nextCharacter.id, nextColor.id);
  const resolveAnimatedImage = (nextCharacter, nextColor) => assets.getEyeGif(nextCharacter.id, nextColor.id);

  useEffect(() => {
    let active = true;

    Promise.all([
      window.OmagotchiApi?.character?.list?.(),
      window.OmagotchiApi?.profile?.get?.()
    ]).then(([serverCharacters, profile]) => {
      if (!active) return;

      const mappedCharacters = Array.isArray(serverCharacters)
        ? serverCharacters.map((item) => {
            const local = CHARACTERS.find(({ id }) => id === item.assetKey);
            return {
              ...local,
              id: item.assetKey,
              gameCharacterId: item.gameCharacterId,
              name: item.name || local?.name || item.assetKey,
              description: item.description || local?.description || "함께 성장할 오마고치입니다.",
              bubble: local?.bubble || "같이 공부해요!",
              baseImage: assets.getPng(item.assetKey, "original")
            };
          }).filter((item) => item.id && Number.isInteger(item.gameCharacterId))
        : [];

      if (!mappedCharacters.length) {
        throw new Error("사용 가능한 캐릭터가 없습니다.");
      }

      setCharacters(mappedCharacters);
      setCharacterId(mappedCharacters[0].id);
      setNickname(profile?.nickname || "");
      setInitializing(false);
    }).catch((error) => {
      if (!active) return;
      setFeedback(error.message || "캐릭터 목록을 불러오지 못했습니다.");
      setInitializing(false);
    });

    return () => {
      active = false;
    };
  }, [assets]);

  async function saveSelection() {
    if (loading || initializing) return;
    const normalizedNickname = nickname.normalize("NFC").trim();
    if (!/^[0-9A-Za-z가-힣]{2,12}$/.test(normalizedNickname)) {
      setFeedback("닉네임은 2~12자의 한글·영문·숫자로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(character.gameCharacterId)) {
      setFeedback("캐릭터 정보를 다시 불러와 주세요.");
      return;
    }
    setLoading(true);
    setFeedback("");

    try {
      await window.OmagotchiApi.character.saveSelection({
        gameCharacterId: character.gameCharacterId,
        nickname: normalizedNickname,
        colorId
      });
      setCompleted(true);
      // 홈 부트스트랩이 최신 프로필의 승인 기수와 오늘 출석 상태를 판정한다.
      // 신규 가입자는 승인 기수가 없으므로 홈에서 기수 가입 안내를 받아야 한다.
      window.setTimeout(() => window.location.assign("/home"), 600);
    } catch (error) {
      setFeedback(error.message || "캐릭터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <CharacterSelector
      characterId={characterId}
      characters={characters}
      colorId={colorId}
      nickname={nickname}
      loading={loading || initializing}
      feedback={feedback}
      completed={completed}
      resolveImage={resolveImage}
      resolveAnimatedImage={resolveAnimatedImage}
      onCharacterChange={setCharacterId}
      onColorChange={setColorId}
      onNicknameChange={setNickname}
      onSubmit={saveSelection}
    />
  );
}

const root = document.getElementById("character-selector-react-root");
if (root) createRoot(root).render(<CharacterSelectorApp />);
