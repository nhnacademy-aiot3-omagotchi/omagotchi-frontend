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
const studyStatsTemplate = await readFile(
    new URL("../../main/resources/templates/manager/dashboard/panels/studyStats.html", import.meta.url),
    "utf8"
);
const dashboardSource = await readFile(
    new URL("../../main/resources/static/js/manager/dashboard/index.js", import.meta.url),
    "utf8"
);
const viteSource = await readFile(new URL("../../../vite.config.js", import.meta.url), "utf8");
const islandSource = await readFile(
    new URL("../../main/frontend/manager-dashboard/study-stats-main.jsx", import.meta.url),
    "utf8"
).catch(() => "");
const islandBundle = await readFile(
    new URL("../../main/resources/static/js/home-react/manager-study-stats-app.js", import.meta.url),
    "utf8"
).catch(() => "");
const studentListSource = await readFile(
    new URL("../../main/frontend/manager-dashboard/StudyStatsStudentList.jsx", import.meta.url),
    "utf8"
);
const studentListStorySource = await readFile(
    new URL("../../main/frontend/manager-dashboard/StudyStatsStudentList.stories.jsx", import.meta.url),
    "utf8"
);
const workspaceStorySource = await readFile(
    new URL("../../main/frontend/manager-dashboard/StudyStatsWorkspace.stories.jsx", import.meta.url),
    "utf8"
);

function loadPanel() {
    let registration;
    const calls = { today: [], trend: [], members: [] };
    const contexts = [];
    const detailRequests = [];
    const reactRoot = {};
    const root = {
        querySelector(selector) {
            return selector === "[data-manager-study-stats-react-root]" ? reactRoot : null;
        }
    };
    const window = {
        OmagotchiDashboardPanels: {
            register(definition) {
                registration = definition;
            }
        },
        OmagotchiManagerStudyStatsIsland: {
            render(context) {
                contexts.push(context);
            }
        }
    };

    vm.runInNewContext(panelSource, {
        Array,
        Math,
        Number,
        Object,
        Promise,
        String,
        console: { error() {} },
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
                runningTimerCount: 1,
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
                    nickname: "오마",
                    todayStudySeconds: 7200,
                    periodStudySeconds: 10800,
                    activeStudyDays: 2,
                    lastStudiedAt: null,
                    isRunning: true,
                    timerStartedAt: "2026-08-25T02:00:00Z"
                }]
            };
        },
        getMemberProfiles: () => [{
            cohortMembershipId: 10,
            nickname: "오마",
            email: "student@example.com"
        }],
        openMemberDetail: (request) => detailRequests.push(request)
    });

    return { calls, contexts, detailRequests, panel };
}

function nextTask() {
    return new Promise((resolve) => setImmediate(resolve));
}

test("로컬 Chart.js 4.5.1 번들이 전역 Chart 생성자를 제공한다", () => {
    const context = {};
    vm.runInNewContext(chartSource, context);
    assert.equal(typeof context.Chart, "function");
});

test("관리자 Dashboard는 실제 StudyStats React 모듈을 로드한다", () => {
    const chartIndex = dashboardTemplate.indexOf("/vendor/chartjs/4.5.1/chart.umd.min.js");
    const islandIndex = dashboardTemplate.indexOf("/js/home-react/manager-study-stats-app.js");

    assert.ok(chartIndex >= 0);
    assert.ok(islandIndex > chartIndex);
    assert.match(studyStatsTemplate, /data-manager-study-stats-react-root/);
    assert.doesNotMatch(studyStatsTemplate, /data-studystats-row-template|study-running-badge/);
    assert.match(
        viteSource,
        /"manager-study-stats":\s*"src\/main\/frontend\/manager-dashboard\/study-stats-main\.jsx"/
    );
    assert.match(islandSource, /<StudyStatsWorkspace/);
    assert.match(islandBundle, /data-manager-study-stats-react-root/);
    assert.match(islandBundle, /study-running-light/);
    assert.match(studentListSource, /className="study-running-light"/);
    assert.doesNotMatch(studentListSource, /className="study-running-badge"/);
    assert.match(studentListSource, /role="img"/);
    assert.doesNotMatch(studentListSource, /role="status"/);
    assert.match(
        studentListStorySource,
        /import \{ StudyStatsStudentList \} from "\.\/StudyStatsStudentList\.jsx"/
    );
    assert.match(
        workspaceStorySource,
        /import \{ StudyStatsWorkspace \} from "\.\/StudyStatsWorkspace\.jsx"/
    );
});

test("관리자 Dashboard는 전체 기수가 아니라 내 관리 기수만 사용한다", () => {
    assert.match(dashboardSource, /api\.access\.getContext\(\)/);
    assert.match(dashboardSource, /managedCohorts/);
    assert.doesNotMatch(dashboardSource, /api\.cohort\.list\(\)/);
});

test("통계 adapter는 실제 조회 결과와 사용자 동작을 React context로 연결한다", async () => {
    const harness = loadPanel();

    harness.panel.activate({ cohortId: 7 });
    await nextTask();

    assert.deepEqual(harness.calls.today, [7]);
    assert.deepEqual(harness.calls.trend, [[7, "7d"]]);
    assert.equal(harness.calls.members[0][0], 7);
    assert.equal(harness.calls.members[0][1].window, "7d");
    assert.equal(harness.calls.members[0][1].page, 0);
    assert.equal(harness.calls.members[0][1].size, 100);
    assert.equal(harness.calls.members[0][1].sort, "periodStudySeconds,desc");

    let context = harness.contexts.at(-1);
    assert.equal(context.loading, false);
    assert.equal(context.error, null);
    assert.equal(context.period, 7);
    assert.equal(context.todayStats.runningTimerCount, 1);
    assert.equal(context.membersStats.items[0].nickname, "오마");
    assert.equal(context.memberProfiles[0].email, "student@example.com");

    context.onPeriodChange(30);
    await nextTask();

    assert.deepEqual(harness.calls.trend.at(-1), [7, "30d"]);
    assert.equal(harness.calls.members.at(-1)[1].window, "30d");
    context = harness.contexts.at(-1);
    assert.equal(context.period, 30);

    context.onSelectMember({
        ...context.membersStats.items[0],
        name: "오마",
        email: "student@example.com"
    });
    assert.equal(harness.detailRequests.length, 1);
    assert.equal(harness.detailRequests[0].cohortId, 7);
    assert.equal(harness.detailRequests[0].cohortMembershipId, "10");
    assert.equal(harness.detailRequests[0].memberName, "오마");
    assert.equal(harness.detailRequests[0].memberEmail, "student@example.com");
    assert.equal(harness.detailRequests[0].currentAggregationDate, "2026-08-25");

    harness.panel.deactivate();
    const contextCount = harness.contexts.length;
    harness.panel.invalidate();
    assert.equal(harness.contexts.length, contextCount + 1);
    context = harness.contexts.at(-1);
    assert.equal(context.todayStats, null);
    assert.equal(context.trendStats, null);
    assert.equal(context.membersStats, null);
    assert.equal(context.loading, false);
});

test("통계 adapter에는 별도 DOM·Chart 렌더링 구현이 남지 않는다", () => {
    assert.doesNotMatch(
        panelSource,
        /createMemberRow|renderTable|renderCharts|data-studystats-row-template|study-running-badge/
    );
});

test("대시보드 index.js의 fetchTrendStats 및 fetchMemberOverview는 파라미터 섀도잉 없이 window.OmagotchiApi를 호출한다", () => {
    assert.doesNotMatch(dashboardSource, /fetchTrendStats:\s*\(\s*cohortId\s*,\s*window\s*\)\s*=>/);
    assert.doesNotMatch(dashboardSource, /fetchMemberOverview:\s*\(\s*cohortId\s*,\s*membershipId\s*,\s*window\s*\)\s*=>/);

    assert.match(dashboardSource, /fetchTrendStats:\s*\(\s*cohortId\s*,\s*windowParam\s*\)\s*=>/);
    assert.match(dashboardSource, /fetchMemberOverview:\s*\(\s*cohortId\s*,\s*membershipId\s*,\s*windowParam\s*\)\s*=>/);
});
