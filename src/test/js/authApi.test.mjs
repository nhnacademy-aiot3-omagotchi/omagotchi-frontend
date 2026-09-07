import assert from "node:assert/strict";
import test from "node:test";

import {
    AuthApiRequestError,
    requestAuthJson
} from "../../main/resources/static/js/authApi.js";

function documentWithCsrf() {
    return {
        querySelector(selector) {
            if (selector === "meta[name='_csrf']") {
                return {content: "csrf-token"};
            }
            if (selector === "meta[name='_csrf_header']") {
                return {content: "X-CSRF-TOKEN"};
            }
            return null;
        }
    };
}

function response({ok, status, body = "", retryAfter = null}) {
    return {
        ok,
        status,
        headers: {
            get(name) {
                return name === "Retry-After" ? retryAfter : null;
            }
        },
        async text() {
            return body;
        }
    };
}

test("인증 JSON 요청에 같은 출처 자격 증명과 CSRF 헤더를 포함한다", async () => {
    let received;
    const result = await requestAuthJson("/bff/v2/auth/example", {
        method: "PATCH",
        payload: {value: "request-value"},
        documentRef: documentWithCsrf(),
        fetchImpl: async (path, options) => {
            received = {path, options};
            return response({
                ok: true,
                status: 200,
                body: JSON.stringify({value: "response-value"})
            });
        }
    });

    assert.equal(received.path, "/bff/v2/auth/example");
    assert.equal(received.options.method, "PATCH");
    assert.equal(received.options.credentials, "same-origin");
    assert.equal(received.options.headers["Content-Type"], "application/json");
    assert.equal(received.options.headers["X-CSRF-TOKEN"], "csrf-token");
    assert.equal(received.options.body, JSON.stringify({value: "request-value"}));
    assert.deepEqual(result, {value: "response-value"});
});

test("본문 없는 성공 응답은 null로 반환한다", async () => {
    const result = await requestAuthJson("/bff/v2/auth/example", {
        fetchImpl: async () => response({ok: true, status: 204})
    });

    assert.equal(result, null);
});

test("실패 응답의 공개 오류와 양수 Retry-After를 보존한다", async () => {
    await assert.rejects(
        requestAuthJson("/bff/v2/auth/example", {
            fetchImpl: async () => response({
                ok: false,
                status: 429,
                retryAfter: "37",
                body: JSON.stringify({
                    code: "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                    message: "잠시 후 다시 요청해 주세요."
                })
            })
        }),
        (error) => {
            assert.equal(error instanceof AuthApiRequestError, true);
            assert.equal(error.status, 429);
            assert.equal(error.code, "EMAIL_VERIFICATION_COOLDOWN_ACTIVE");
            assert.equal(error.retryAfterSeconds, 37);
            assert.equal(error.message, "잠시 후 다시 요청해 주세요.");
            return true;
        }
    );
});

test("성공 응답의 잘못된 JSON 형식을 거부한다", async () => {
    await assert.rejects(
        requestAuthJson("/bff/v2/auth/example", {
            fetchImpl: async () => response({ok: true, status: 200, body: "not-json"})
        }),
        /서버 응답 형식을 확인할 수 없습니다/
    );
});
