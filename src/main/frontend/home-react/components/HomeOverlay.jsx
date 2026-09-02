import React, { useMemo } from "react";
import { GameDialog, GameDialogClose } from "../../ui/GameDialog.jsx";
import { GameTabs } from "../../ui/GameTabs.jsx";
import { HomeMenuLiveContent } from "../../ui/HomeMenuLiveContent.jsx";

const radixDialogTypes = new Set(["help", "settings"]);
// home.js 의 data-overlay-panel 과 1:1로 맞춘다. 한쪽만 바뀌면 빈 탭이 생긴다.
const progressTabDefinitions = [
  { value: "quests", label: "퀘스트" },
  { value: "leaders", label: "랭킹" }
];

function ProgressTabsContent({ content }) {
  const items = useMemo(() => {
    const template = document.createElement("template");
    template.innerHTML = content;

    return progressTabDefinitions.map(({ value, icon, label }) => {
      const panel = template.content.querySelector(`[data-overlay-panel="${value}"]`);

      return {
        value,
        label: <><span aria-hidden="true">{icon}</span>{label}</>,
        triggerProps: { "data-overlay-tab": value },
        contentProps: { "data-overlay-panel": value },
        contentHtml: panel?.innerHTML || ""
      };
    });
  }, [content]);

  return (
    <GameTabs
      items={items}
      defaultValue="quests"
      ariaLabel="진행 탭"
      rootClassName="home-progress-tabs"
      listClassName="overlay-tabs"
      triggerClassName=""
      contentClassName="overlay-tab-panel"
    />
  );
}

function OverlayArticle({ type, meta, content, radixDialog = false }) {
  const closeButton = (
    <button className="home-overlay-close" type="button" data-close-home-overlay aria-label="닫기">×</button>
  );

  return (
    <article
      className={`home-overlay home-overlay--${type} ui-menu-live-panel`}
      role={radixDialog ? undefined : "dialog"}
      aria-modal={radixDialog ? undefined : "true"}
      aria-labelledby={radixDialog ? undefined : "home-overlay-title"}
      aria-describedby={radixDialog ? undefined : "home-overlay-description"}
    >
      {radixDialog ? <GameDialogClose>{closeButton}</GameDialogClose> : closeButton}
      <header className="home-overlay-header ui-menu-live-header">
        <span className="home-overlay-icon" aria-hidden="true"><img src={meta.icon} alt="" /></span>
        <div className="home-overlay-heading">
          <h2 id="home-overlay-title">{meta.title}</h2>
          <p id="home-overlay-description">{meta.description}</p>
        </div>
      </header>
      {/* content는 Home의 검증된 내부 템플릿만 전달한다. */}
      {type === "progress" ? (
        <div className="home-overlay-body"><ProgressTabsContent content={content} /></div>
      ) : (
        <div className="home-overlay-body ui-menu-live-body">
          <HomeMenuLiveContent menu={type} content={content} />
        </div>
      )}
    </article>
  );
}

export function HomeOverlay({ type, meta, content, onClose }) {
  if (!type || !meta || typeof content !== "string") {
    return null;
  }

  if (radixDialogTypes.has(type)) {
    return (
      <GameDialog
        open
        title={meta.title}
        description={meta.description}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose?.();
        }}
        portalled={false}
        contentClassName="home-overlay-dialog-content"
      >
        <OverlayArticle type={type} meta={meta} content={content} radixDialog />
      </GameDialog>
    );
  }

  return (
    <section className="home-overlay-backdrop" data-close-home-overlay>
      <OverlayArticle type={type} meta={meta} content={content} />
    </section>
  );
}
