import React, { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { HomeOverlay } from "./components/HomeOverlay.jsx";
import { HomeStage } from "./components/HomeStage.jsx";
import { HOME_MENU_ITEMS } from "./components/TopMenu.jsx";

const overlayTypes = new Set(HOME_MENU_ITEMS.map(({ overlay }) => overlay));

let overlaySnapshot = null;
let overlayReturnFocusElement = null;
const overlayListeners = new Set();

function isValidOverlayPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const { type, meta, content } = payload;

  return (
    typeof type === "string" &&
    overlayTypes.has(type) &&
    meta !== null &&
    typeof meta === "object" &&
    typeof meta.icon === "string" &&
    typeof meta.title === "string" &&
    typeof meta.description === "string" &&
    typeof content === "string"
  );
}

const homeOverlayStore = {
  subscribe(listener) {
    overlayListeners.add(listener);
    return () => overlayListeners.delete(listener);
  },
  getSnapshot() {
    return overlaySnapshot;
  },
  open(nextOverlay) {
    if (!isValidOverlayPayload(nextOverlay)) {
      return false;
    }

    overlayReturnFocusElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    overlaySnapshot = nextOverlay;
    flushSync(() => overlayListeners.forEach((listener) => listener()));
    return true;
  },
  close() {
    const returnFocusElement = overlayReturnFocusElement;
    overlaySnapshot = null;
    overlayReturnFocusElement = null;
    document.querySelector("[data-home-overlay-root]")?.classList.remove("is-open");
    document.body.classList.remove("has-home-overlay");
    flushSync(() => overlayListeners.forEach((listener) => listener()));

    window.requestAnimationFrame(() => {
      if (returnFocusElement?.isConnected) {
        returnFocusElement.focus();
      }
    });
  }
};

window.OmagotchiHomeOverlay = homeOverlayStore;

function HomeOverlayHost() {
  const overlay = useSyncExternalStore(
    homeOverlayStore.subscribe,
    homeOverlayStore.getSnapshot,
    homeOverlayStore.getSnapshot
  );

  if (!overlay) {
    return null;
  }

  return <HomeOverlay {...overlay} onClose={homeOverlayStore.close} />;
}

const rootElement = document.getElementById("home-react-root");

if (rootElement) {
  flushSync(() => {
    createRoot(rootElement).render(<HomeStage />);
  });
}

const overlayRootElement = document.querySelector("[data-home-overlay-root]");

if (overlayRootElement) {
  flushSync(() => {
    createRoot(overlayRootElement).render(<HomeOverlayHost />);
  });
}
