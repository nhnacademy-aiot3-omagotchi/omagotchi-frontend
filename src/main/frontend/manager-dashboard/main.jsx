import React from "react";
import { createRoot } from "react-dom/client";
import { SensorWorkspace } from "./SensorWorkspace.jsx";
import { SpaceWorkspace } from "./SpaceWorkspace.jsx";
import sensorWorkspaceCss from "./SensorWorkspace.css?inline";

const SENSOR_CONTEXT_EVENT = "omagotchi:manager-sensors:context";
const SPACE_CONTEXT_EVENT = "omagotchi:manager-spaces:context";
const sensorRootElement = document.querySelector("[data-manager-sensor-react-root]");
const spaceRootElement = document.querySelector("[data-manager-space-react-root]");

function installStyles() {
  if (document.querySelector("style[data-manager-sensor-react-styles]")) return;
  const style = document.createElement("style");
  style.dataset.managerSensorReactStyles = "";
  style.textContent = sensorWorkspaceCss;
  document.head.append(style);
}

/**
 * 호스트가 실어주는 값은 Learning Service 응답 그대로다. 여기서는 형태만 확인하고
 * 이름을 바꾸지 않는다 — 이름을 바꾸면 컴포넌트와 어긋난다.
 *
 * - spaces          : GET /api/v1/spaces
 * - sensors         : GET /api/v1/sensors
 * - spaceThresholds : GET /api/v1/threshold-rules/spaces
 * - alertLog        : GET /api/v1/sensors/events 응답 본문
 */
function normalizeSensorContext(context = {}) {
  const fn = (value) => (typeof value === "function" ? value : undefined);
  return {
    spaces: Array.isArray(context.spaces) ? context.spaces : [],
    sensors: Array.isArray(context.sensors) ? context.sensors : [],
    spaceThresholds: Array.isArray(context.spaceThresholds) ? context.spaceThresholds : [],
    alertLog: context.alertLog && Array.isArray(context.alertLog.content) ? context.alertLog : null,
    loading: Boolean(context.loading),
    error: context.error ? String(context.error) : null,
    forbidden: Boolean(context.forbidden),
    onSaveSensor: fn(context.onSaveSensor),
    onClaimSensor: fn(context.onClaimSensor),
    onSaveThresholds: fn(context.onSaveThresholds),
    onAlertQueryChange: fn(context.onAlertQueryChange),
    onRetry: fn(context.onRetry)
  };
}

function normalizeSpaceContext(context = {}) {
  const fn = (value) => (typeof value === "function" ? value : undefined);
  return {
    spaces: Array.isArray(context.spaces) ? context.spaces : [],
    selectedCohortId: context.selectedCohortId ?? null,
    loading: Boolean(context.loading),
    error: context.error ? String(context.error) : null,
    occupancies: Array.isArray(context.occupancies) ? context.occupancies : [],
    occupancyLoading: Boolean(context.occupancyLoading),
    occupancyError: context.occupancyError ? String(context.occupancyError) : null,
    onSave: fn(context.onSave),
    onChangeStatus: fn(context.onChangeStatus),
    onDelete: fn(context.onDelete),
    onChangeCohort: fn(context.onChangeCohort),
    onLoadOccupancies: fn(context.onLoadOccupancies),
    onLoadParticipants: fn(context.onLoadParticipants),
    onForceEndOccupancy: fn(context.onForceEndOccupancy),
    onRetry: fn(context.onRetry)
  };
}

if (sensorRootElement || spaceRootElement) {
  installStyles();
}

if (sensorRootElement) {
  const reactRoot = createRoot(sensorRootElement);

  function render(context) {
    const normalized = normalizeSensorContext(context);
    reactRoot.render(
      <SensorWorkspace
        spaces={normalized.spaces}
        initialSensors={normalized.sensors}
        initialSpaceThresholds={normalized.spaceThresholds}
        alertLog={normalized.alertLog}
        loading={normalized.loading}
        error={normalized.error}
        forbidden={normalized.forbidden}
        onSaveSensor={normalized.onSaveSensor}
        onClaimSensor={normalized.onClaimSensor}
        onSaveThresholds={normalized.onSaveThresholds}
        onAlertQueryChange={normalized.onAlertQueryChange}
        onRetry={normalized.onRetry}
        defaultTab="dashboard"
        embedded
      />
    );
  }

  window.addEventListener(SENSOR_CONTEXT_EVENT, (event) => render(event.detail));
  render(window.OmagotchiManagerSensorContext);

  window.OmagotchiManagerSensorIsland = Object.freeze({ render });
}

if (spaceRootElement) {
  const reactRoot = createRoot(spaceRootElement);

  function render(context) {
    const normalized = normalizeSpaceContext(context);
    reactRoot.render(<SpaceWorkspace {...normalized} embedded />);
  }

  window.addEventListener(SPACE_CONTEXT_EVENT, (event) => render(event.detail));
  render(window.OmagotchiManagerSpaceContext);

  window.OmagotchiManagerSpaceIsland = Object.freeze({ render });
}
