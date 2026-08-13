import React from "react";

export function HomeOverlay({ type, meta, content }) {
  if (!type || !meta || typeof content !== "string") {
    return null;
  }

  return (
    <section className="home-overlay-backdrop" data-close-home-overlay>
      <article
        className={`home-overlay home-overlay--${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-overlay-title"
        aria-describedby="home-overlay-description"
      >
        <button className="home-overlay-close" type="button" data-close-home-overlay aria-label="닫기">×</button>
        <header className="home-overlay-header">
          <span className="home-overlay-icon" aria-hidden="true"><img src={meta.icon} alt="" /></span>
          <div className="home-overlay-heading">
            <h2 id="home-overlay-title">{meta.title}</h2>
            <p id="home-overlay-description">{meta.description}</p>
          </div>
        </header>
        {/* content는 Home의 검증된 내부 템플릿만 전달한다. */}
        <div className="home-overlay-body" dangerouslySetInnerHTML={{ __html: content }} />
      </article>
    </section>
  );
}
