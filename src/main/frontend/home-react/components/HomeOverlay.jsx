import React, { useMemo } from "react";
import { GameDialog, GameDialogClose } from "../../ui/GameDialog.jsx";
import { GameTabs } from "../../ui/GameTabs.jsx";
import { HomeMenuLiveContent } from "../../ui/HomeMenuLiveContent.jsx";
import { PanelHeader } from "../../ui/PanelHeader.jsx";

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
      // home.js가 두 패널 내부를 querySelector로 채운다. 비활성 탭이 언마운트되면
      // 노드를 찾지 못해 진행 패널 전체가 조용히 비어 버리므로 둘 다 DOM에 남긴다.
      forceMount
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
      {/*
        닫기 버튼은 머리말 안에 둔다. 예전에는 article 직계 자식으로 두고 position:absolute
        로 얹었는데, .home-overlay 자체가 스크롤 컨테이너라 본문을 내리면 버튼도 함께
        흘러 사라졌다(학습 기록처럼 내용이 긴 화면에서 특히 드러났다).
        머리말이 sticky 이므로 그 안에 있으면 스크롤과 무관하게 남는다.
      */}
      <PanelHeader
        icon={meta.icon}
        title={meta.title}
        description={meta.description}
        titleId="home-overlay-title"
        descriptionId="home-overlay-description"
        className="home-overlay-header ui-menu-live-header"
        closeButton={radixDialog ? <GameDialogClose>{closeButton}</GameDialogClose> : closeButton}
      />
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
