import React from "react";
import PropTypes from "prop-types";

export const CHARACTERS = [
  { id: "study", name: "공부쟁이", bubble: "오늘도 집중!", description: "기본기가 탄탄한 학습형 오마고치입니다.\n매일의 기록과 퀘스트를 차분하게 쌓아갑니다.", baseImage: "/images/characters/study/study.png" },
  { id: "debug", name: "디버깅이", bubble: "버그 잡자!", description: "문제를 발견하면 끝까지 추적하는 타입입니다.\n에러 로그 앞에서 특히 강해집니다.", baseImage: "/images/characters/debug/debug.png" },
  { id: "sprout", name: "새싹이", bubble: "쑥쑥 자랄래!", description: "처음 시작하는 마음을 가장 잘 아는 성장형 오마고치입니다.\n작은 출석도 크게 반응합니다.", baseImage: "/images/characters/sprout/sprout.png" },
  { id: "server", name: "서버지킴이", bubble: "응답 정상!", description: "조용하지만 안정적인 운영형 오마고치입니다.\n꾸준한 루틴과 긴 집중에 잘 어울립니다.", baseImage: "/images/characters/server/server.png" },
  { id: "night", name: "야간반", bubble: "조금만 더!", description: "늦은 시간에도 집중력을 붙잡는 야간형 오마고치입니다.\n마지막 한 세션에 강합니다.", baseImage: "/images/characters/night/night.png" },
  { id: "kid", name: "잼민이", bubble: "냠!", description: "가볍고 장난기 있는 에너지형 오마고치입니다.\n지루한 공부에 리듬을 만들어줍니다.", baseImage: "/images/characters/kid/kid.png" },
  { id: "caffeine", name: "카페인이", bubble: "충전 완료!", description: "짧고 강한 집중에 특화된 오마고치입니다.\n타이머를 켜는 순간부터 텐션이 올라갑니다.", baseImage: "/images/characters/caffeine/caffeine.png" },
  { id: "commit", name: "커밋이", bubble: "저장했어?", description: "기록과 회고를 좋아하는 습관형 오마고치입니다.\n오늘의 흔적을 남길수록 더 빛납니다.", baseImage: "/images/characters/commit/commit.png" }
];

export const CHARACTER_COLORS = [
  { id: "original", name: "기본", value: null },
  { id: "pistachio", name: "피스타치오", value: "#8fd16a" },
  { id: "cyan", name: "하늘", value: "#69c7e8" },
  { id: "cream_can", name: "크림", value: "#f6c45d" },
  { id: "light_coral", name: "코랄", value: "#f27f7f" },
  { id: "light_purple", name: "라일락", value: "#b99cff" },
  { id: "white", name: "화이트", value: "#f1f1f1" },
  { id: "dark_gray", name: "차콜", value: "#3f3f3f" }
];

/*
 * 색상 파일명은 캐릭터 폴더 안에서 색상 id 그대로다. (예: /images/characters/night/pistachio.png)
 *
 * 예전에는 `{캐릭터}_{색상}.png` 규칙이었는데 자산이 정리되면서 바뀌었고,
 * 실제 화면(main.jsx)은 characterAssets.js 규칙으로 덮어써서 문제가 드러나지 않았다.
 * 이 기본값만 옛 규칙으로 남아 Storybook과 resolver 미지정 사용처가 깨져 있었다.
 */
const defaultImageResolver = (character, color) => color.id === "original"
  ? character.baseImage
  : `/images/characters/${character.id}/${color.id}.png`;

export function CharacterSelector({
  characters = CHARACTERS,
  characterId = "study",
  colorId = "original",
  nickname = "",
  loading = false,
  feedback = "",
  completed = false,
  resolveImage = defaultImageResolver,
  resolveAnimatedImage = resolveImage,
  onCharacterChange = () => {},
  onColorChange = () => {},
  onNicknameChange = () => {},
  onSubmit = () => {}
}) {
  const availableCharacters = characters.length ? characters : CHARACTERS;
  const character = availableCharacters.find(({ id }) => id === characterId) || availableCharacters[0];
  const color = CHARACTER_COLORS.find(({ id }) => id === colorId) || CHARACTER_COLORS[0];
  const fallbackImage = resolveImage(character, color);
  const selectedImage = resolveAnimatedImage(character, color);

  return (
    <main className="selector-page" style={{ "--selected-color": color.value || "#ffffff" }}>
      <section className="selector-shell" aria-labelledby="selector-title">
        <header className="selector-header">
          <p className="selector-kicker">Character Select</p>
          <h1 id="selector-title">오늘부터 함께 공부할 <br />오마고치를 선택하세요</h1>
        </header>

        <div className="selector-content">
          <aside className="selected-panel" aria-live="polite">
            <div className="selected-stage">
              <div className="selected-bubble" data-selected-bubble>{completed ? "입장!" : character.bubble}</div>
              <img
                className={`selected-character${completed ? " happy" : ""}`}
                data-selected-image
                src={selectedImage}
                alt={`${character.name} 캐릭터 이미지`}
                onError={(event) => {
                  if (event.currentTarget.src !== new URL(fallbackImage, window.location.href).href) {
                    event.currentTarget.src = fallbackImage;
                  }
                }}
              />
              <div className="selected-shadow" aria-hidden="true" />
            </div>

            <div className="selected-info">
              <div className="selected-name"><span>캐릭터</span><strong data-selected-name>{character.name}</strong></div>
              <div className="selected-color"><span>색상</span><strong data-selected-color-name>{color.name}</strong></div>
              <p data-selected-description>{character.description}</p>
            </div>
          </aside>

          <section className="choice-panel" aria-label="캐릭터와 색상 선택">
            <div className="choice-section">
              <div className="choice-heading"><h2>오마고치 선택</h2><p>함께 성장할 친구를 고르세요.</p></div>
              <div className="character-grid" data-character-grid>
                {availableCharacters.map((option) => (
                  <button
                    className={`character-option${option.id === character.id ? " is-selected" : ""}`}
                    type="button"
                    data-character-id={option.id}
                    aria-label={`${option.name} 선택`}
                    aria-pressed={option.id === character.id}
                    disabled={loading}
                    key={option.id}
                    onClick={() => onCharacterChange(option.id)}
                  ><img src={option.baseImage} alt="" /></button>
                ))}
              </div>
            </div>

            <div className="choice-section">
              <div className="choice-heading"><h2>색상 선택</h2><p>현재 선택한 캐릭터에 적용됩니다.</p></div>
              <div className="color-row" data-color-row aria-label="캐릭터 색상 선택">
                {CHARACTER_COLORS.map((option) => (
                  <button
                    className={`color-option${option.id === "original" ? " is-original" : ""}${option.id === color.id ? " is-selected" : ""}`}
                    type="button"
                    data-color-id={option.id}
                    style={option.value ? { "--swatch-color": option.value } : undefined}
                    aria-label={`${option.name} 색상 선택`}
                    aria-pressed={option.id === color.id}
                    disabled={loading}
                    key={option.id}
                    onClick={() => onColorChange(option.id)}
                  />
                ))}
              </div>
            </div>

            <label className="selector-nickname">
              <span>캐릭터 닉네임</span>
              <input
                type="text"
                value={nickname}
                minLength={2}
                maxLength={12}
                pattern="[0-9A-Za-z가-힣]{2,12}"
                autoComplete="nickname"
                disabled={loading}
                placeholder="2~12자의 한글·영문·숫자"
                onChange={(event) => onNicknameChange(event.target.value)}
              />
            </label>

            <div className="selection-summary"><span data-selected-summary>{character.name} · {color.name}</span></div>
            {feedback ? <p className="selector-feedback" role="alert">{feedback}</p> : null}
            <button className="enter-button" type="button" data-enter-button disabled={loading} onClick={onSubmit}>
              {loading ? "저장 중…" : "선택하기"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

const characterPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  bubble: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  baseImage: PropTypes.string.isRequired,
  gameCharacterId: PropTypes.number
});

CharacterSelector.propTypes = {
  characters: PropTypes.arrayOf(characterPropType),
  characterId: PropTypes.string,
  colorId: PropTypes.string,
  nickname: PropTypes.string,
  loading: PropTypes.bool,
  feedback: PropTypes.string,
  completed: PropTypes.bool,
  resolveImage: PropTypes.func,
  resolveAnimatedImage: PropTypes.func,
  onCharacterChange: PropTypes.func,
  onColorChange: PropTypes.func,
  onNicknameChange: PropTypes.func,
  onSubmit: PropTypes.func
};
