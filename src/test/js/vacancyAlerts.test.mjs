import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {
  applyVacancyAlertAction,
  findVacancyAlert,
  normalizeVacancyAlerts
} from "../../main/resources/static/js/space/vacancyAlerts.js";

const API_SOURCE_URL = new URL("../../main/resources/static/js/api.js", import.meta.url);

test("browser API uses the vacancy alert BFF contracts", async () => {
  const calls = [];
  const context = {
    URLSearchParams,
    Blob,
    FormData,
    document: { documentElement: { dataset: {} } },
    window: {},
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === "/bff/v1/csrf") {
        return {
          status: 200, ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({ headerName: "X-CSRF-TOKEN", token: "csrf-token" })
        };
      }
      if (options.method === "POST" || options.method === "DELETE") {
        return {
          status: options.method === "POST" ? 201 : 204,
          ok: true,
          headers: { get: () => "" },
          text: async () => ""
        };
      }
      return {
        status: 200, ok: true,
        headers: { get: () => "application/json" },
        json: async () => []
      };
    }
  };
  vm.runInNewContext(await readFile(API_SOURCE_URL, "utf8"), context);

  await context.window.OmagotchiApi.spaces.requestVacancyAlert("space/3");
  await context.window.OmagotchiApi.spaces.getMyVacancyAlerts();
  await context.window.OmagotchiApi.spaces.cancelVacancyAlert("alert/41");

  assert.deepEqual(
    calls.filter(({ url }) => url !== "/bff/v1/csrf").map(({ url, options }) => [url, options.method]),
    [
      ["/bff/v1/spaces/space%2F3/vacancy-alerts", "POST"],
      ["/bff/v1/vacancy-alerts/me", "GET"],
      ["/bff/v1/vacancy-alerts/alert%2F41", "DELETE"]
    ]
  );
});

test("server list restores vacancy alert state", () => {
  const alerts = normalizeVacancyAlerts([
    { alertId: 41, spaceId: 3, cohortId: 7, createdAt: "2026-08-27T10:00:00+09:00" }
  ]);

  assert.equal(findVacancyAlert(alerts, "3").alertId, 41);
});

test("successful request refreshes state from the server", async () => {
  const calls = [];
  const serverAlerts = [{ alertId: 41, spaceId: 3, cohortId: 7 }];
  const result = await applyVacancyAlertAction({
    requestVacancyAlert: async (spaceId) => calls.push(["request", spaceId]),
    cancelVacancyAlert: async () => assert.fail("cancel must not be called"),
    getMyVacancyAlerts: async () => serverAlerts
  }, [], "3");

  assert.deepEqual(calls, [["request", "3"]]);
  assert.deepEqual(result, serverAlerts);
});

test("failed request leaves caller state unchanged", async () => {
  const current = [];
  await assert.rejects(() => applyVacancyAlertAction({
    requestVacancyAlert: async () => { throw new Error("request failed"); },
    getMyVacancyAlerts: async () => assert.fail("list must not be called")
  }, current, 3), /request failed/);

  assert.deepEqual(current, []);
});

test("cancel uses the server alertId and refreshes state", async () => {
  const calls = [];
  const current = [{ alertId: 41, spaceId: 3, cohortId: 7 }];
  const result = await applyVacancyAlertAction({
    requestVacancyAlert: async () => assert.fail("request must not be called"),
    cancelVacancyAlert: async (alertId) => calls.push(["cancel", alertId]),
    getMyVacancyAlerts: async () => []
  }, current, 3);

  assert.deepEqual(calls, [["cancel", 41]]);
  assert.deepEqual(result, []);
});
