import React from "react";
import { createRoot } from "react-dom/client";
import { SensorWorkspace } from "./SensorWorkspace.jsx";
import sensorWorkspaceCss from "./SensorWorkspace.css?inline";

const CONTEXT_EVENT = "omagotchi:manager-sensors:context";
const rootElement = document.querySelector("[data-manager-sensor-react-root]");

function installStyles() {
  if (document.querySelector("style[data-manager-sensor-react-styles]")) return;
  const style = document.createElement("style");
  style.dataset.managerSensorReactStyles = "";
  style.textContent = sensorWorkspaceCss;
  document.head.append(style);
}

function normalizeContext(context = {}) {
  return {
    cohortId: String(context.cohortId || ""),
    sensors: Array.isArray(context.sensors) ? context.sensors : [],
    auditEntries: Array.isArray(context.auditEntries) ? context.auditEntries : []
  };
}

if (rootElement) {
  installStyles();
  const reactRoot = createRoot(rootElement);

  function render(context) {
    const normalized = normalizeContext(context);
    reactRoot.render(
      <SensorWorkspace
        key={normalized.cohortId || "unassigned"}
        initialSensors={normalized.sensors}
        initialAuditEntries={normalized.auditEntries}
        defaultTab="dashboard"
        embedded
      />
    );
  }

  window.addEventListener(CONTEXT_EVENT, (event) => render(event.detail));
  render(window.OmagotchiManagerSensorContext);

  window.OmagotchiManagerSensorIsland = Object.freeze({ render });
}
