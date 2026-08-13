import React, { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { HomeOverlay } from "./components/HomeOverlay.jsx";
import { HomeStage } from "./components/HomeStage.jsx";
import { HOME_MENU_ITEMS } from "./components/TopMenu.jsx";

const overlayTypes = new Set(HOME_MENU_ITEMS.map(({ overlay }) => overlay));

let overlaySnapshot = null;
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

    overlaySnapshot = nextOverlay;
    flushSync(() => overlayListeners.forEach((listener) => listener()));
    return true;
  },
  close() {
    overlaySnapshot = null;
    flushSync(() => overlayListeners.forEach((listener) => listener()));
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

  return <HomeOverlay {...overlay} />;
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
