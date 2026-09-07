import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const apiSource = await readFile(
    new URL("../../main/resources/static/js/api.js", import.meta.url),
    "utf8"
);
const clientSource = await readFile(
    new URL("../../main/frontend/home-react/components/aiAssistantClient.js", import.meta.url),
    "utf8"
);

function loadApi(fetch) {
    const redirects = [];
    const alerts = [];
    const window = {
        alert(message) {
            alerts.push(message);
        },
        location: {
            pathname: "/home",
            replace(path) {
                redirects.push(path);
            }
        }
    };
    vm.runInNewContext(apiSource, {
        Blob,
        FormData,
        URLSearchParams,
        document: {documentElement: {dataset: {}}},
        fetch,
        window
    });
    return {api: window.OmagotchiApi, alerts, redirects};
}

test("AI 스트림 요청은 api.js 공통 요청 경로를 사용한다", async () => {
    const calls = [];
    const response = {
        ok: true,
        status: 200,
        headers: {get: () => "text/event-stream"},
        body: {getReader() {}}
    };
    const {api} = loadApi(async (url, options) => {
        calls.push({url, options});
        return response;
    });

    const signal = new AbortController().signal;
    assert.equal(await api.ai.streamChat("오늘 학습 요약", {model: "OLLAMA", signal}), response);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/bff/v1/ai/chat?question=%EC%98%A4%EB%8A%98+%ED%95%99%EC%8A%B5+%EC%9A%94%EC%95%BD&model=OLLAMA");
    assert.equal(calls[0].options.credentials, "same-origin");
    assert.equal(calls[0].options.headers.Accept, "text/event-stream");
    assert.equal(calls[0].options.signal, signal);
    assert.doesNotMatch(clientSource, /\bfetch\s*\(/);
});

test("AI 스트림 401 응답도 공통 재로그인 처리와 API 오류 계약을 따른다", async () => {
    const {api, alerts, redirects} = loadApi(async () => ({
        ok: false,
        status: 401,
        headers: {get: () => "application/json"},
        json: async () => ({code: "AUTH_SESSION_EXPIRED", message: "세션이 만료되었습니다."})
    }));

    await assert.rejects(
        api.ai.streamChat("질문"),
        (error) => error.status === 401
            && error.code === "AUTH_SESSION_EXPIRED"
            && error.message === "세션이 만료되었습니다."
    );
    assert.deepEqual(alerts, ["세션이 만료되었습니다. 로그인 화면으로 이동합니다."]);
    assert.deepEqual(redirects, ["/login?notice=session-expired"]);
});

test("상태 변경 전 CSRF 조회에서 세션이 만료돼도 공통 안내 후 재로그인 처리한다", async () => {
    const calls = [];
    const {api, alerts, redirects} = loadApi(async (url) => {
        calls.push(url);
        return {
            ok: false,
            status: 401,
            headers: {get: () => "application/json"},
            json: async () => ({
                code: "AUTH_AUTHENTICATION_REQUIRED",
                message: "인증이 필요합니다."
            })
        };
    });

    await assert.rejects(
        api.attendance.checkOut(),
        (error) => error.status === 401
            && error.code === "AUTH_AUTHENTICATION_REQUIRED"
            && error.message === "인증이 필요합니다."
    );

    assert.deepEqual(calls, ["/bff/v1/csrf"]);
    assert.deepEqual(alerts, ["세션이 만료되었습니다. 로그인 화면으로 이동합니다."]);
    assert.deepEqual(redirects, ["/login?notice=session-expired"]);
});

test("동시에 여러 401을 받아도 세션 만료 안내와 이동은 한 번만 수행한다", async () => {
    const {api, alerts, redirects} = loadApi(async () => ({
        ok: false,
        status: 401,
        headers: {get: () => "application/json"},
        json: async () => ({code: "AUTH_SESSION_EXPIRED"})
    }));

    const results = await Promise.allSettled([
        api.profile.get(),
        api.access.getContext()
    ]);

    assert.ok(results.every(({status}) => status === "rejected"));
    assert.deepEqual(alerts, ["세션이 만료되었습니다. 로그인 화면으로 이동합니다."]);
    assert.deepEqual(redirects, ["/login?notice=session-expired"]);
});
