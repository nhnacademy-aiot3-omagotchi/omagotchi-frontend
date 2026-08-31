import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const API_SOURCE_URL = new URL("../../main/resources/static/js/api.js", import.meta.url);
const PANEL_SOURCE_URL = new URL(
  "../../main/resources/static/js/manager/dashboard/panels/spacesPanel.js",
  import.meta.url
);
const MANAGER_MAIN_SOURCE_URL = new URL(
  "../../main/frontend/manager-dashboard/main.jsx",
  import.meta.url
);

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => status === 204 ? "" : "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

test("admin occupancy API uses list, participant, and force-release BFF paths", async () => {
  const calls = [];
  const context = {
    URLSearchParams, Blob, FormData,
    crypto: { randomUUID: () => "request-id" },
    document: { documentElement: { dataset: {} } },
    window: {},
    fetch: async (url, options = {}) => {
      calls.push([url, options.method || "GET"]);
      if (url === "/bff/v1/csrf") return jsonResponse(200, { headerName: "X-CSRF-TOKEN", token: "csrf" });
      return jsonResponse(options.method === "POST" ? 204 : 200, []);
    }
  };
  vm.runInNewContext(await readFile(API_SOURCE_URL, "utf8"), context);

  await context.window.OmagotchiApi.adminOccupancies.list();
  await context.window.OmagotchiApi.adminOccupancies.participants("room/1");
  await context.window.OmagotchiApi.adminOccupancies.forceRelease("room/1");

  assert.deepEqual(calls, [
    ["/bff/v1/admin/spaces/occupancies", "GET"],
    ["/bff/v1/admin/spaces/room%2F1/occupancies/participants", "GET"],
    ["/bff/v1/csrf", "GET"],
    ["/bff/v1/admin/spaces/room%2F1/occupancies/force-release", "POST"]
  ]);
});

test("space context normalization preserves occupancies without leaking them into sensor context", async () => {
  const source = await readFile(MANAGER_MAIN_SOURCE_URL, "utf8");
  const start = source.indexOf("function normalizeSensorContext");
  const end = source.indexOf("if (sensorRootElement || spaceRootElement)");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    occupancies: [{
      spaceId: 1,
      spaceName: "회의실A",
      participantCount: 2,
      status: "ACTIVE"
    }],
    occupancyLoading: false,
    occupancyError: null
  };
  const sandbox = { context };
  vm.runInNewContext(`${source.slice(start, end)}
    spaceResult = normalizeSpaceContext(context);
    sensorResult = normalizeSensorContext(context);`, sandbox);

  assert.equal(sandbox.spaceResult.occupancies.length, 1);
  assert.equal(sandbox.spaceResult.occupancies[0].spaceName, "회의실A");
  assert.equal(sandbox.spaceResult.occupancyLoading, false);
  assert.equal(sandbox.spaceResult.occupancyError, null);
  assert.equal(Object.hasOwn(sandbox.sensorResult, "occupancies"), false);
  assert.equal(Object.hasOwn(sandbox.sensorResult, "occupancyLoading"), false);
  assert.equal(Object.hasOwn(sandbox.sensorResult, "occupancyError"), false);
});

test("force release refreshes server state and a failure preserves the current list", async () => {
  let panel;
  let currentContext;
  let listCalls = 0;
  let forceFails = false;
  const occupancy = { occupancyId: 9, spaceId: 3, participantCount: 2 };
  const window = {
    OmagotchiDashboardPanels: { register: (registered) => { panel = registered; } },
    OmagotchiApi: {
      sensor: { listSpaces: async () => [] },
      adminOccupancies: {
        list: async () => { listCalls += 1; return listCalls === 1 ? [occupancy] : []; },
        participants: async () => [],
        forceRelease: async () => { if (forceFails) throw new Error("failed"); }
      }
    },
    dispatchEvent: () => {}
  };
  vm.runInNewContext(await readFile(PANEL_SOURCE_URL, "utf8"), { window, CustomEvent: class {} });
  const instance = panel.create({
    root: { querySelector: () => ({}) },
    store: { getState: () => ({ selectedCohortId: 1 }) },
    setBubble: () => {}
  });
  window.OmagotchiManagerSpaceIsland = { render: (context) => { currentContext = context; } };

  instance.activate();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(currentContext.occupancies.length, 1);
  forceFails = true;
  assert.equal(await currentContext.onForceEndOccupancy(3), false);
  assert.equal(currentContext.occupancies.length, 1);

  forceFails = false;
  assert.equal(await currentContext.onForceEndOccupancy(3), true);
  assert.equal(currentContext.occupancies.length, 0);
});

test("older occupancy response cannot overwrite a newer occupancy list", async () => {
  let panel;
  let currentContext;
  let listCalls = 0;

  let resolveFirst;
  let resolveSecond;

  const firstResponse = new Promise((resolve) => {
    resolveFirst = resolve;
  });
  const secondResponse = new Promise((resolve) => {
    resolveSecond = resolve;
  });

  const staleOccupancy = {
    occupancyId: 1,
    spaceId: 3,
    participantCount: 2
  };

  const latestOccupancy = {
    occupancyId: 2,
    spaceId: 4,
    participantCount: 1
  };

  const window = {
    OmagotchiDashboardPanels: {
      register: (registered) => {
        panel = registered;
      }
    },
    OmagotchiApi: {
      sensor: {
        listSpaces: async () => []
      },
      adminOccupancies: {
        list: async () => {
          listCalls += 1;
          return listCalls === 1 ? firstResponse : secondResponse;
        },
        participants: async () => [],
        forceRelease: async () => {}
      }
    },
    dispatchEvent: () => {}
  };

  vm.runInNewContext(
      await readFile(PANEL_SOURCE_URL, "utf8"),
      { window, CustomEvent: class {} }
  );

  const instance = panel.create({
    root: { querySelector: () => ({}) },
    store: { getState: () => ({ selectedCohortId: 1 }) },
    setBubble: () => {}
  });

  window.OmagotchiManagerSpaceIsland = {
    render: (context) => {
      currentContext = context;
    }
  };

  // 첫 번째 조회 시작
  instance.activate();

  // 첫 번째 요청이 끝나기 전에 두 번째 조회 시작
  const secondLoad = currentContext.onLoadOccupancies();

  // 최신 요청(두 번째)이 먼저 완료
  resolveSecond([latestOccupancy]);
  await secondLoad;

  assert.equal(currentContext.occupancies.length, 1);
  assert.equal(currentContext.occupancies[0].occupancyId, 2);

  // 오래된 첫 번째 요청이 나중에 완료
  resolveFirst([staleOccupancy]);

  // 첫 번째 promise 처리 완료 대기
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 오래된 응답이 최신 상태를 덮어쓰면 안 됨
  assert.equal(currentContext.occupancies.length, 1);
  assert.equal(currentContext.occupancies[0].occupancyId, 2);
  assert.equal(listCalls, 2);
});
