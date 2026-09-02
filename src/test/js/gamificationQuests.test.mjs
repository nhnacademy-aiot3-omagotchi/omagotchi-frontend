import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { AI_QUEST_TYPE, isAiRecommendedQuest, loadProgressResources, normalizeDailyQuests } from "../../main/resources/static/js/home/questData.js";

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
        type: "ROUTINE",
        code: "ATTENDANCE",
        title: "60분 학습",
        targetCount: 60,
        progressCount: 20,
        rewardXp: 100,
        status: "IN_PROGRESS"
    }]), [{
        id: "17",
        type: "ROUTINE",
        code: "ATTENDANCE",
        title: "60분 학습",
        targetCount: 60,
        progressCount: 20,
        rewardXp: 100,
        status: "IN_PROGRESS"
    }]);

    assert.equal(normalizeDailyQuests([{
        id: "17\" onclick=\"alert(1)",
        type: "ROUTINE",
        code: "ATTENDANCE",
        title: "악성 응답",
        targetCount: 1,
        progressCount: 1,
        rewardXp: "<img src=x onerror=alert(1)>",
        status: "COMPLETED"
    }]), null);
    assert.match(homeSource, /data-home-claim="\$\{escapeHtml\(quest\.id\)\}"/);

    // type 이 없거나 계약 밖 값이면 렌더링하지 않는다. AI 분기가 조용히 틀어지는 걸 막는다.
    assert.equal(normalizeDailyQuests([{
        id: 18,
        code: "ATTENDANCE",
        title: "타입 없는 응답",
        targetCount: 1,
        progressCount: 0,
        rewardXp: 10,
        status: "IN_PROGRESS"
    }]), null);
    assert.equal(normalizeDailyQuests([{
        id: 19,
        type: "UNKNOWN",
        code: "ATTENDANCE",
        title: "계약 밖 타입",
        targetCount: 1,
        progressCount: 0,
        rewardXp: 10,
        status: "IN_PROGRESS"
    }]), null);
});

test("AI 추천 퀘스트는 일일 목록과 분리해 맨 위 카드로 그린다", () => {
    assert.match(questDataSource, /export const AI_QUEST_TYPE = "LLM"/);
    assert.match(homeSource, /dailyQuests\.filter\(isAiRecommendedQuest\)/);
    assert.match(homeSource, /!isAiRecommendedQuest\(quest\)/);
    assert.match(homeSource, /quest-ai-card/);
});

test("LLM 슬롯의 공부 시간 퀘스트만 AI 추천 카드로 올리고 일반 퀘스트는 목록에 둔다", () => {
    assert.equal(isAiRecommendedQuest({type: AI_QUEST_TYPE, code: "LLM_QUEST"}), true);
    assert.equal(isAiRecommendedQuest({type: "ROUTINE", code: "STUDY_COMPLETED"}), false);
    assert.equal(isAiRecommendedQuest({type: "ROUTINE", code: "ATTENDANCE"}), false);
    assert.equal(isAiRecommendedQuest({type: "ROUTINE", code: "CHARACTER_CHECKED"}), false);

    // code가 없으면 슬롯을 가를 수 없으므로 렌더링하지 않는다.
    assert.equal(normalizeDailyQuests([{
        id: 20,
        type: "ROUTINE",
        title: "code 없는 응답",
        targetCount: 1,
        progressCount: 0,
        rewardXp: 10,
        status: "IN_PROGRESS"
    }]), null);
});

test("진행 오버레이 탭은 퀘스트와 랭킹만 남긴다", () => {
    for (const removed of ["achievements", "timeline", "data-progress-stats"]) {
        assert.equal(homeSource.includes(removed), false, `${removed} 잔재가 남아 있습니다.`);
    }
    assert.match(homeSource, /data-overlay-tab="quests"/);
    assert.match(homeSource, /data-overlay-tab="leaders"/);
});
