import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const apiSource = await readFile(
    new URL("../../main/resources/static/js/api.js", import.meta.url),
    "utf8"
);

function response(status, payload = null) {
    const hasPayload = payload !== null;
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {get: (name) => name.toLowerCase() === "content-type" && hasPayload
            ? "application/json"
            : ""},
        json: async () => payload,
        text: async () => ""
    };
}

function loadApi(fetch) {
    const window = {
        location: {pathname: "/home", replace() {}}
    };
    vm.runInNewContext(apiSource, {
        Blob,
        FormData,
        URLSearchParams,
        document: {documentElement: {dataset: {}}},
        fetch,
        window
    });
    return window.OmagotchiApi;
}

test("팀 API 9개는 BFF 경로와 메서드, 요청 본문을 그대로 사용한다", async () => {
    const calls = [];
    const api = loadApi(async (url, options) => {
        calls.push({url, options});
        if (url === "/bff/v1/csrf") {
            return response(200, {headerName: "X-CSRF-TOKEN", token: "csrf-token"});
        }
        if (url === "/bff/v1/teams" && options.method === "POST") {
            return response(201, {teamId: 7, cohortId: 3, name: "알고리즘"});
        }
        if (url === "/bff/v1/teams/me") {
            return response(200, []);
        }
        if (url.includes("member-candidates")) {
            return response(200, []);
        }
        if (options.method === "GET") {
            return response(200, {teamId: 7});
        }
        return response(url.endsWith("/members") ? 201 : 204);
    });

    await api.teams.create({cohortId: 3, name: "알고리즘"});
    await api.teams.mine();
    await api.teams.detail("team/7");
    await api.teams.memberCandidates("team/7", "홍 길동@example.com");
    await api.teams.addMember("team/7", "11111111-1111-1111-1111-111111111111");
    await api.teams.kickMember("team/7", "member/8");
    await api.teams.leave("team/7");
    await api.teams.delegate("team/7", "member/8");
    await api.teams.disband("team/7");

    const requests = calls.filter((call) => call.url !== "/bff/v1/csrf");
    assert.deepEqual(
        requests.map(({url, options}) => [url, options.method]),
        [
            ["/bff/v1/teams", "POST"],
            ["/bff/v1/teams/me", "GET"],
            ["/bff/v1/teams/team%2F7", "GET"],
            ["/bff/v1/teams/team%2F7/member-candidates?query=%ED%99%8D+%EA%B8%B8%EB%8F%99%40example.com", "GET"],
            ["/bff/v1/teams/team%2F7/members", "POST"],
            ["/bff/v1/teams/team%2F7/members/member%2F8", "DELETE"],
            ["/bff/v1/teams/team%2F7/leave", "POST"],
            ["/bff/v1/teams/team%2F7/members/member%2F8/delegate", "POST"],
            ["/bff/v1/teams/team%2F7", "DELETE"]
        ]
    );
    assert.equal(requests[0].options.body, JSON.stringify({cohortId: 3, name: "알고리즘"}));
    assert.equal(
        requests[4].options.body,
        JSON.stringify({targetUserId: "11111111-1111-1111-1111-111111111111"})
    );
    requests.filter(({options}) => options.method !== "GET").forEach(({options}) => {
        assert.equal(options.headers["X-CSRF-TOKEN"], "csrf-token");
    });
});
