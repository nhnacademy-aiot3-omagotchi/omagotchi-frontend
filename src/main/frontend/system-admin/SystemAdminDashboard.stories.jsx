import React, {useEffect, useMemo, useRef} from "react";
import "../../resources/static/css/managerDashboard.css";
import "../../resources/static/css/systemAdminDashboard.css";
import {initializeSystemAdminDashboard} from "../../resources/static/js/system-admin/dashboard/dashboardController.js";
import {createSystemAdminMockRepository} from "../../resources/static/js/system-admin/dashboard/data/systemAdminMockRepository.js";
import layoutHtml from "../../resources/templates/system-admin/dashboard/layouts/layout.html?raw";
import overviewHtml from "../../resources/templates/system-admin/dashboard/panels/overview.html?raw";
import usersHtml from "../../resources/templates/system-admin/dashboard/panels/users.html?raw";
import cohortsHtml from "../../resources/templates/system-admin/dashboard/panels/cohorts.html?raw";
import auditsHtml from "../../resources/templates/system-admin/dashboard/panels/audits.html?raw";
import permissionDialogHtml from "../../resources/templates/system-admin/dashboard/popups/permissionDialog.html?raw";
import cohortDialogHtml from "../../resources/templates/system-admin/dashboard/popups/cohortDialog.html?raw";

function bodyOf(html) {
  return html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() || html;
}

function composeThymeleafPreview() {
  const panels = [overviewHtml, usersHtml, cohortsHtml, auditsHtml].map(bodyOf).join("");
  const dialogs = [permissionDialogHtml, cohortDialogHtml].map(bodyOf).join("");
  return bodyOf(layoutHtml)
    .replace('<div class="manager-content system-admin-content" layout:fragment="content"></div>', `<div class="manager-content system-admin-content">${panels}</div>`)
    .replace('<th:block layout:fragment="pageDialogs"></th:block>', dialogs)
    .replace('<th:block layout:fragment="pageScripts"></th:block>', "");
}

function ThymeleafSystemAdminPreview({defaultPanel = "system-overview"}) {
  const rootRef = useRef(null);
  const markup = useMemo(composeThymeleafPreview, []);

  useEffect(() => {
    let controller;
    document.body.classList.add("system-admin-preview");
    initializeSystemAdminDashboard(rootRef.current, createSystemAdminMockRepository()).then((value) => {
      controller = value;
      rootRef.current?.querySelector(`[data-panel-target="${defaultPanel}"]`)?.click();
    });
    return () => {
      document.body.classList.remove("system-admin-preview");
      controller?.destroy();
    };
  }, [defaultPanel]);

  return <div ref={rootRef} dangerouslySetInnerHTML={{__html: markup}} />;
}

const meta = {
  title: "SystemAdmin/Thymeleaf Dashboard",
  component: ThymeleafSystemAdminPreview,
  parameters: {layout: "fullscreen"},
  argTypes: {defaultPanel: {control: "select", options: ["system-overview", "system-users", "system-cohorts", "system-audits"]}}
};

export default meta;

export const Overview = {name: "전체 현황", args: {defaultPanel: "system-overview"}};
export const UserPermissions = {name: "사용자 권한 관리", args: {defaultPanel: "system-users"}};
export const CohortOperations = {name: "기수 생성·상태 관리", args: {defaultPanel: "system-cohorts"}};
export const AuditLog = {name: "감사 로그", args: {defaultPanel: "system-audits"}};
export const Mobile = {args: {defaultPanel: "system-users"}, parameters: {viewport: {defaultViewport: "mobile1"}}};
