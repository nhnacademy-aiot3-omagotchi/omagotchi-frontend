import React, { useMemo } from "react";
import { GameDialog, GameDialogClose } from "../../ui/GameDialog.jsx";
import { GameTabs } from "../../ui/GameTabs.jsx";

const radixDialogTypes = new Set(["help", "settings"]);
const progressTabDefinitions = [
  { value: "quests", icon: "▣", label: "퀘스트" },
  { value: "achievements", icon: "★", label: "업적" },
  { value: "leaders", icon: "▥", label: "랭킹" },
  { value: "timeline", icon: "↶", label: "타임라인" },
  { value: "stats", icon: "▥", label: "통계" }
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
      className={`home-overlay home-overlay--${type}`}
      role={radixDialog ? undefined : "dialog"}
      aria-modal={radixDialog ? undefined : "true"}
      aria-labelledby={radixDialog ? undefined : "home-overlay-title"}
      aria-describedby={radixDialog ? undefined : "home-overlay-description"}
    >
      {radixDialog ? <GameDialogClose>{closeButton}</GameDialogClose> : closeButton}
      <header className="home-overlay-header">
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
        <div className="home-overlay-body" dangerouslySetInnerHTML={{ __html: content }} />
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
