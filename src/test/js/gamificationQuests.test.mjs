import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

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
    assert.match(homeSource, /api\.gamification\.getDailyQuests\(\)/);
    assert.match(progressSource, /api\.gamification\.getDailyQuests\(\)/);
});
