import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {
    loadProgressResources,
    normalizeDailyQuests
} from "../../main/resources/static/js/home/questData.js";

const apiSource = await readFile(
    new URL("../../main/resources/static/js/api.js", import.meta.url),
    "utf8"
);
const homeSource = await readFile(
    new URL("../../main/resources/static/js/home.js", import.meta.url),
    "utf8"
);
const progressSource = await readFile(
    new URL("../../main/resources/static/js/progress.js", import.meta.url),
    "utf8"
);
const questDataSource = await readFile(
    new URL("../../main/resources/static/js/home/questData.js", import.meta.url),
    "utf8"
);

test("일일 퀘스트 API 래퍼는 전용 BFF 경로를 호출한다", async () => {
    const calls = [];
    const window = {location: {pathname: "/home", replace() {}}};
    vm.runInNewContext(apiSource, {
        Blob,
        FormData,
        URLSearchParams,
        document: {documentElement: {dataset: {}}},
        fetch: async (url, options) => {
            calls.push({url, options});
            return {
                ok: true,
                status: 200,
                headers: {get: () => "application/json"},
                json: async () => []
            };
        },
        window
    });

    await window.OmagotchiApi.gamification.getDailyQuests();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/bff/v1/gamification/quests/daily");
});

test("홈 오버레이와 독립 진행 화면 모두 전용 일일 퀘스트 API를 사용한다", () => {
    assert.match(homeSource, /loadProgressResources\(api, hasRankingCohort\)/);
    assert.match(questDataSource, /api\.gamification\.getDailyQuests\(\)/);
    assert.match(progressSource, /api\.gamification\.getDailyQuests\(\)/);
});

test("일일 퀘스트 요청만 실패해도 홈과 랭킹 결과는 유지한다", async () => {
    const results = await loadProgressResources({
        gamification: {
            getHome: async () => ({growth: {level: 7}}),
            getDailyQuests: async () => {
                throw new Error("downstream timeout");
            }
        },
        ranking: {
            getToday: async () => ({entries: [{rank: 1}]})
        }
    }, true);

    assert.equal(results.home.status, "fulfilled");
    assert.equal(results.quests.status, "rejected");
    assert.equal(results.rankings.status, "fulfilled");
    assert.deepEqual(results.home.value, {growth: {level: 7}});
    assert.deepEqual(results.rankings.value, {entries: [{rank: 1}]});
});

test("퀘스트 응답은 계약 필드와 타입이 모두 유효할 때만 렌더링 모델로 변환한다", () => {
    assert.deepEqual(normalizeDailyQuests([{
        id: 17,
        title: "60분 학습",
        targetCount: 60,
        progressCount: 20,
        rewardXp: 100,
        status: "IN_PROGRESS"
    }]), [{
        id: "17",
        title: "60분 학습",
        targetCount: 60,
        progressCount: 20,
        rewardXp: 100,
        status: "IN_PROGRESS"
    }]);

    assert.equal(normalizeDailyQuests([{
        id: "17\" onclick=\"alert(1)",
        title: "악성 응답",
        targetCount: 1,
        progressCount: 1,
        rewardXp: "<img src=x onerror=alert(1)>",
        status: "COMPLETED"
    }]), null);
    assert.match(homeSource, /data-home-claim="\$\{escapeHtml\(quest\.id\)\}"/);
});
