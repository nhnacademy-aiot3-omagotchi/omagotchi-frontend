import React from "react";
import { createRoot } from "react-dom/client";
import { StudyStatsWorkspace } from "./StudyStatsWorkspace.jsx";

const CONTEXT_EVENT = "omagotchi:manager-study-stats:context";
const rootElement = document.querySelector("[data-manager-study-stats-react-root]");

function asObject(value) {
  return value && typeof value === "object" ? value : null;
}

function asFunction(value) {
  return typeof value === "function" ? value : undefined;
}

function normalizeContext(context) {
  const source = asObject(context) || {};
  return {
    todayStats: asObject(source.todayStats),
    trendStats: asObject(source.trendStats),
    membersStats: asObject(source.membersStats),
    memberProfiles: Array.isArray(source.memberProfiles) ? source.memberProfiles : [],
    loading: context ? Boolean(source.loading) : true,
    error: source.error ? String(source.error) : null,
    period: Number(source.period) === 30 ? 30 : 7,
    onPeriodChange: asFunction(source.onPeriodChange),
    onSelectMember: asFunction(source.onSelectMember)
  };
}

if (rootElement) {
  const reactRoot = createRoot(rootElement);

  function render(context) {
    reactRoot.render(<StudyStatsWorkspace {...normalizeContext(context)} embedded />);
  }

  window.addEventListener(CONTEXT_EVENT, (event) => render(event.detail));
  render(window.OmagotchiManagerStudyStatsContext);

  window.OmagotchiManagerStudyStatsIsland = Object.freeze({ render });
}
