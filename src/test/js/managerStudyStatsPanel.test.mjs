import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const panelSource = await readFile(
    new URL("../../main/resources/static/js/manager/dashboard/panels/studyStatsPanel.js", import.meta.url),
    "utf8"
);
const chartSource = await readFile(
    new URL("../../main/resources/static/vendor/chartjs/4.5.1/chart.umd.min.js", import.meta.url),
    "utf8"
);
const dashboardTemplate = await readFile(
    new URL("../../main/resources/templates/manager/dashboard/index.html", import.meta.url),
    "utf8"
);
const dashboardSource = await readFile(
    new URL("../../main/resources/static/js/manager/dashboard/index.js", import.meta.url),
    "utf8"
);

function eventTarget(value = "") {
    return {
        value,
        textContent: "",
        addEventListener() {},
        replaceChildren() {}
    };
}

function rowNode() {
    const fields = new Map();
    return {
        querySelector(selector) {
            if (!fields.has(selector)) fields.set(selector, eventTarget());
            return fields.get(selector);
        },
        querySelectorAll() {
            return [];
        }
    };
}

function loadPanel() {
    let registration;
    const charts = [];
    const calls = { today: [], trend: [], members: [] };
    const elements = new Map();
    const selectors = [
        "[data-studystats-search]",
        "[data-studystats-period]",
        "[data-studystats-list]",
        "[data-page-numbers]",
        "[data-kpi-total-time]",
        "[data-kpi-participation]",
        "[data-kpi-avg-time]",
        "[data-kpi-no-record]",
        "[data-trend-chart-title]",
        "[data-top-chart-title]",
        "[data-study-boundary-note]",
        "#trendChart",
        "#topStudentsChart",
        "#durationDistributionChart"
    ];
    selectors.forEach((selector) => elements.set(selector, eventTarget(
        selector === "[data-studystats-period]" ? "7" : ""
    )));

    const rowTemplate = { content: { firstElementChild: { cloneNode: rowNode } } };
    const root = {
        querySelector(selector) {
            if (selector.endsWith("template]")) return rowTemplate;
            return elements.get(selector);
        },
        querySelectorAll() {
            return [];
        }
    };
    const document = {
        createDocumentFragment() {
            return { append() {} };
        }
    };
    class FakeChart {
        constructor(canvas, config) {
            this.canvas = canvas;
            this.config = config;
            this.destroyed = false;
            charts.push(this);
        }

        destroy() {
            this.destroyed = true;
        }
    }
    const window = {
        Chart: FakeChart,
        OmagotchiDashboardPanels: {
            register(definition) {
                registration = definition;
            }
        }
    };

    vm.runInNewContext(panelSource, {
        Array,
        Date,
        Intl,
        Map,
        Math,
        Number,
        Object,
        Promise,
        String,
        console: { error() {} },
        document,
        window
    });

    const panel = registration.create({
        root,
        fetchTodayStats: async (cohortId) => {
            calls.today.push(cohortId);
            return {
                aggregationDate: "2026-08-25",
                totalStudySeconds: 10800,
                activeStudentCount: 2,
                participantCount: 1,
                noRecordStudentCount: 1,
                averageParticipantStudySeconds: 10800,
                durationBuckets: [
                    { code: "NO_RECORD", memberCount: 1 },
                    { code: "TWO_TO_FOUR_HOURS", memberCount: 1 }
                ]
            };
        },
        fetchTrendStats: async (cohortId, windowParam) => {
            calls.trend.push([cohortId, windowParam]);
            return {
                to: "2026-08-25",
                dailyTotals: [
                    { aggregationDate: "2026-08-24", studySeconds: 3600 },
                    { aggregationDate: "2026-08-25", studySeconds: 7200 }
                ]
            };
        },
        fetchMemberStats: async (cohortId, query) => {
            calls.members.push([cohortId, query]);
            return {
                items: [{
                    cohortMembershipId: 10,
                    userId: "11111111-1111-1111-1111-111111111111",
                    todayStudySeconds: 7200,
                    periodStudySeconds: 10800,
                    activeStudyDays: 2,
                    lastStudiedAt: null
                }]
            };
        },
        getMemberProfiles: () => [{
            cohortMembershipId: 10,
            name: "수강생 A",
            email: "student@example.com"
        }]
    });

    return { calls, charts, panel };
}

test("로컬 Chart.js 4.5.1 번들이 전역 Chart 생성자를 제공한다", () => {
    const context = {};
    vm.runInNewContext(chartSource, context);
    assert.equal(typeof context.Chart, "function");
});

test("Chart.js를 통계 패널보다 먼저 로드한다", () => {
    const chartIndex = dashboardTemplate.indexOf("/vendor/chartjs/4.5.1/chart.umd.min.js");
    const panelIndex = dashboardTemplate.indexOf("/js/manager/dashboard/panels/studyStatsPanel.js");
    assert.ok(chartIndex >= 0);
    assert.ok(panelIndex > chartIndex);
});

test("관리자 Dashboard는 전체 기수가 아니라 내 관리 기수만 사용한다", () => {
    assert.match(dashboardSource, /api\.access\.getContext\(\)/);
    assert.match(dashboardSource, /managedCohorts/);
    assert.doesNotMatch(dashboardSource, /api\.cohort\.list\(\)/);
});

test("선택한 관리 기수의 API 응답으로 세 종류의 차트를 구성한다", async () => {
    const harness = loadPanel();

    harness.panel.activate({ cohortId: 7 });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(harness.calls.today, [7]);
    assert.deepEqual(harness.calls.trend, [[7, "7d"]]);
    assert.equal(harness.calls.members[0][0], 7);
    assert.equal(harness.calls.members[0][1].window, "7d");
    assert.equal(harness.calls.members[0][1].sort, "periodStudySeconds,desc");

    const latestByType = new Map(harness.charts.map((chart) => [chart.config.type, chart.config]));
    assert.deepEqual(latestByType.get("line").data.labels, ["08/24", "08/25"]);
    assert.deepEqual(latestByType.get("line").data.datasets[0].data, [1, 2]);
    assert.deepEqual(latestByType.get("bar").data.labels, ["수강생 A"]);
    assert.deepEqual(latestByType.get("bar").data.datasets[0].data, [3]);
    assert.deepEqual(latestByType.get("doughnut").data.datasets[0].data, [1, 1]);
});
