import React from "react";
import { createRoot } from "react-dom/client";
import { TelegramLink } from "./TelegramLink.jsx";
import telegramLinkCss from "./TelegramLink.css?inline";

const CONTEXT_EVENT = "omagotchi:manager-telegram:context";
const rootElement = document.querySelector("[data-manager-telegram-react-root]");

function installStyles() {
  if (document.querySelector("style[data-manager-telegram-react-styles]")) return;
  const style = document.createElement("style");
  style.dataset.managerTelegramReactStyles = "";
  style.textContent = telegramLinkCss;
  document.head.append(style);
}

/**
 * 호스트가 실어주는 값은 Learning Service 응답 그대로다. 여기서는 형태만 확인하고
 * 이름을 바꾸지 않는다 — 이름을 바꾸면 컴포넌트와 어긋난다.
 *
 * - link  : GET  /api/v1/telegram/link       (404 면 null)
 * - token : POST /api/v1/telegram/link-token 응답 { linkUrl, expiresAt }
 */
function normalizeContext(context = {}) {
  const fn = (value) => (typeof value === "function" ? value : undefined);
  return {
    link: context.link && typeof context.link === "object" ? context.link : null,
    token: context.token && typeof context.token.linkUrl === "string" ? context.token : null,
    loading: Boolean(context.loading),
    issuing: Boolean(context.issuing),
    error: context.error ? String(context.error) : null,
    onIssue: fn(context.onIssue),
    onRetry: fn(context.onRetry)
  };
}

if (rootElement) {
  installStyles();
  const reactRoot = createRoot(rootElement);

  function render(context) {
    const normalized = normalizeContext(context);
    reactRoot.render(
      <TelegramLink
        link={normalized.link}
        token={normalized.token}
        loading={normalized.loading}
        issuing={normalized.issuing}
        error={normalized.error}
        onIssue={normalized.onIssue}
        onRetry={normalized.onRetry}
        now={Date.now()}
        embedded
      />
    );
  }

  window.addEventListener(CONTEXT_EVENT, (event) => render(event.detail));
  render(window.OmagotchiManagerTelegramContext);

  window.OmagotchiManagerTelegramIsland = Object.freeze({ render });
}
