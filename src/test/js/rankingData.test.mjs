import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {
    currentRankingAggregationDate,
    lastClosedRankingDate,
    normalizeStudyRanking,
    rankingCoverageLabel,
    rankingPeriodLabel,
    requestStudyRanking
} from "../../main/resources/static/js/home/rankingData.js";

const homeSource = await readFile(
    new URL("../../main/resources/static/js/home.js", import.meta.url),
    "utf8"
);
const progressSource = await readFile(
    new URL("../../main/resources/static/js/progress.js", import.meta.url),
    "utf8"
);
const homeOverlayThemeSource = await readFile(
    new URL("../../main/resources/static/css/home/home-overlay-theme.css", import.meta.url),
    "utf8"
);

function todayPayload(overrides = {}) {
    return {
        period: "TODAY",
        aggregationDate: "2026-09-02",
        calculatedAt: "2026-09-02T04:00:00Z",
        startDate: null,
        includedThroughDate: null,
        rankedMemberCount: 1,
        returnedEntryCount: 1,
        entries: [{
            rank: 1,
            displayName: "오마",
            studySeconds: 125,
            timerRunning: true,
            characterType: "study",
            colorId: "original",
            attendanceStreakDays: 3
        }],
        myRanking: {
            ranked: true,
            ranking: {
                rank: 1,
                displayName: "오마",
                studySeconds: 125,
                timerRunning: true,
                characterType: "study",
                colorId: "original",
                attendanceStreakDays: 3
            }
        },
        ...overrides
    };
}

test("정상 랭킹 응답을 화면 모델로 변환한다", () => {
    const ranking = normalizeStudyRanking(todayPayload());

    assert.equal(ranking.period, "TODAY");
    assert.equal(ranking.entries[0].displayName, "오마");
    assert.equal(ranking.entries[0].timerRunning, true);
    assert.equal(ranking.entries[0].characterType, "study");
    assert.equal(ranking.entries[0].attendanceStreakDays, 3);
    assert.equal(ranking.myRanking.ranked, true);
});

test("Learning 원본 응답은 화면이 알고 있는 기간으로 보완한다", () => {
    const payload = todayPayload();
    delete payload.period;

    const ranking = normalizeStudyRanking(payload, "TODAY");

    assert.equal(ranking.period, "TODAY");
});

test("빈 랭킹은 정상 응답으로 유지한다", () => {
    const ranking = normalizeStudyRanking(todayPayload({
        rankedMemberCount: 0,
        returnedEntryCount: 0,
        entries: [],
        myRanking: {ranked: false, ranking: null}
    }));

    assert.deepEqual(ranking.entries, []);
    assert.equal(ranking.myRanking.ranked, false);
});

test("개수와 목록이 불일치하는 응답은 거부한다", () => {
    assert.equal(normalizeStudyRanking(todayPayload({returnedEntryCount: 2})), null);
});

test("기간별 요청은 KST 04시 집계일 기준의 일·주·월을 계산한다", async () => {
    const calls = [];
    const api = {
        ranking: {
            getToday: async () => calls.push(["today"]),
            getDaily: async (date) => calls.push(["daily", date]),
            getWeekly: async (date) => calls.push(["weekly", date]),
            getMonthly: async (month) => calls.push(["monthly", month])
        }
    };
    const now = new Date("2026-09-02T12:00:00+09:00");

    await requestStudyRanking(api, "TODAY", now);
    await requestStudyRanking(api, "DAILY", now, "2026-09-01");
    await requestStudyRanking(api, "WEEKLY", now);
    await requestStudyRanking(api, "MONTHLY", now);

    assert.deepEqual(calls, [
        ["today"],
        ["daily", "2026-09-01"],
        ["weekly", "2026-08-31"],
        ["monthly", "2026-09"]
    ]);
});

test("오전 4시 전에는 전날을 현재 집계일로 보고 마지막 확정일을 계산한다", () => {
    const now = new Date("2026-09-02T03:30:00+09:00");

    assert.equal(currentRankingAggregationDate(now), "2026-09-01");
    assert.equal(lastClosedRankingDate(now), "2026-08-31");
});

test("현재 집계일 이후의 일간 랭킹 요청은 거부한다", async () => {
    const api = {ranking: {getDaily: async () => assert.fail("호출되면 안 된다")}};
    const now = new Date("2026-09-02T12:00:00+09:00");

    await assert.rejects(
        requestStudyRanking(api, "DAILY", now, "2026-09-02"),
        /확정된 과거 집계일/
    );
});

test("과거 일간 랭킹 라벨은 선택한 날짜를 표시한다", () => {
    assert.equal(rankingPeriodLabel("DAILY", "2026-09-01"), "2026년 9월 1일");
});

test("랭킹 집계 기준은 실시간과 확정 집계일을 구분해 표시한다", () => {
    assert.equal(rankingCoverageLabel("TODAY"), "실시간");
    assert.equal(rankingCoverageLabel("DAILY", "2026-09-01"), "확정 집계");
    assert.equal(rankingCoverageLabel("WEEKLY", "2026-09-01"), "9월 1일까지 집계");
    assert.equal(rankingCoverageLabel("MONTHLY", null), "집계 대기");
});

test("홈과 진행 화면은 랭킹 실패와 정상 빈 결과를 구분한다", () => {
    for (const source of [homeSource, progressSource]) {
        assert.match(source, /랭킹을 불러오지 못했습니다/);
        assert.match(source, /학습 기록이 아직 없습니다/);
        assert.match(source, /랭킹 응답을 확인할 수 없습니다/);
    }
});

test("홈과 진행 화면은 네이티브 날짜 선택으로 과거 일간 랭킹을 요청한다", () => {
    for (const source of [homeSource, progressSource]) {
        assert.match(source, /data-ranking-date/);
        assert.match(source, /loadRankingPeriod\("DAILY", rankingDateInput\.value\)/);
    }
    assert.match(progressSource, /normalizeStudyRanking\(result\.value, period\)/);
});

test("홈 랭킹의 비활성 기간과 목록 등수는 밝은 배경에서도 식별된다", () => {
    assert.match(
        homeOverlayThemeSource,
        /\.home-overlay--progress \.ranking-period-tabs button\s*\{[^}]*color:\s*var\(--overlay-list-muted\)/s
    );
    assert.match(
        homeOverlayThemeSource,
        /\.home-overlay--progress \.rank-row-number\s*\{[^}]*color:\s*#0d5537/s
    );
});
