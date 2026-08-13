import React from "react";

const swatches = [
  { name: "Primary", value: "#2FC47C", color: "var(--ui-emerald-500)" },
  { name: "Deep green", value: "#176B4A", color: "var(--ui-emerald-800)", dark: true },
  { name: "Mint", value: "#DDF8EA", color: "var(--ui-emerald-100)" },
  { name: "Cream", value: "#FFF8E7", color: "var(--ui-cream)" },
  { name: "Peach", value: "#FFC9A8", color: "var(--ui-peach)" },
  { name: "Sky", value: "#D8EFFF", color: "var(--ui-sky)" },
  { name: "Lilac", value: "#E9E1FF", color: "var(--ui-lilac)" },
  { name: "Ink", value: "#17342A", color: "var(--ui-ink)", dark: true }
];

function Foundation() {
  return (
    <main className="ui-story-canvas">
      <section className="ui-palette">
        <header>
          <h1>오마고치 UI 컬러</h1>
          <p>기준 초록은 주요 행동에만 사용하고, 넓은 면은 밝은 보조색과 흰색으로 나눕니다.</p>
        </header>
        <div className="ui-palette-grid">
          {swatches.map((swatch) => (
            <div key={swatch.name} className={`ui-swatch${swatch.dark ? " ui-swatch--dark" : ""}`} style={{ background: swatch.color }}>
              <strong>{swatch.name}</strong>
              <small>{swatch.value}</small>
            </div>
          ))}
        </div>
        <div>
          <h2>사용 원칙</h2>
          <p>초록은 CTA와 완료 상태, 크림은 안내, 하늘색은 정보, 살구색은 주의, 라일락은 보조 콘텐츠에 사용합니다.</p>
        </div>
      </section>
    </main>
  );
}

export default { title: "UI/Foundation", component: Foundation, parameters: { layout: "fullscreen" } };
export const Palette = {};
