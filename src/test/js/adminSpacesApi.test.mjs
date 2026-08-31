import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const API_SOURCE_URL = new URL("../../main/resources/static/js/api.js", import.meta.url);

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

async function loadApi() {
  const calls = [];
  const context = {
    URLSearchParams,
    Blob,
    FormData,
    crypto: { randomUUID: () => "request-id" },
    document: { documentElement: { dataset: {} } },
    window: {},
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === "/bff/v1/csrf") {
        return jsonResponse(200, { headerName: "X-CSRF-TOKEN", token: "csrf-token" });
      }
      if (options.method === "DELETE") {
        return { status: 204, ok: true, headers: { get: () => "" } };
      }
      return jsonResponse(options.method === "POST" && url.endsWith("/admin/spaces") ? 201 : 200, {});
    }
  };
  vm.runInNewContext(await readFile(API_SOURCE_URL, "utf8"), context);
  return { api: context.window.OmagotchiApi, calls };
}

test("adminSpaces adapter uses the BFF paths, methods, bodies, and shared CSRF request", async () => {
  const { api, calls } = await loadApi();
  const payload = { name: "회의실 A", type: "MEETING", capacity: 8, cohortId: 1 };

  await api.adminSpaces.create(payload);
  await api.adminSpaces.update("space/1", { name: payload.name, type: payload.type, capacity: payload.capacity });
  await api.adminSpaces.activate(3);
  await api.adminSpaces.deactivate(3, "정기 점검");
  await api.adminSpaces.remove(3);
  await api.adminSpaces.assignCohort(3, 1);
  await api.adminSpaces.unassignCohort(3);

  assert.equal(calls.filter((call) => call.url === "/bff/v1/csrf").length, 1);
  const mutations = calls.filter((call) => call.url !== "/bff/v1/csrf");
  assert.deepEqual(mutations.map(({ url, options }) => [url, options.method]), [
    ["/bff/v1/admin/spaces", "POST"],
    ["/bff/v1/admin/spaces/space%2F1", "PUT"],
    ["/bff/v1/admin/spaces/3/activate", "POST"],
    ["/bff/v1/admin/spaces/3/deactivate", "POST"],
    ["/bff/v1/admin/spaces/3", "DELETE"],
    ["/bff/v1/admin/spaces/3/cohort", "PUT"],
    ["/bff/v1/admin/spaces/3/cohort", "DELETE"]
  ]);
  assert.deepEqual(JSON.parse(mutations[0].options.body), payload);
  assert.deepEqual(JSON.parse(mutations[1].options.body), { name: "회의실 A", type: "MEETING", capacity: 8 });
  assert.deepEqual(JSON.parse(mutations[3].options.body), { inactiveReason: "정기 점검" });
  assert.deepEqual(JSON.parse(mutations[5].options.body), { cohortId: 1 });
  for (const { options } of mutations) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.headers["X-CSRF-TOKEN"], "csrf-token");
  }
});
