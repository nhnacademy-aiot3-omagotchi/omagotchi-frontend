import test from "node:test";
import assert from "node:assert/strict";

import {
    buildVerifiedSignupPayload,
    formatCountdown,
    isEmailChallengeResponse,
    maskEmail,
    normalizeSignupDetails,
    parseRetryAfter,
    secondsUntil
} from "../../main/resources/static/js/registerEmailVerification.js";

test("가입 정보는 이메일과 이름만 정규화하고 비밀번호는 그대로 보존한다", () => {
    assert.deepEqual(
        normalizeSignupDetails({
            email: " user@example.com ",
            name: " 오마고치 ",
            password: " password-passphrase "
        }),
        {
            email: "user@example.com",
            name: "오마고치",
            password: " password-passphrase "
        }
    );
});

test("최종 가입 요청에 발급받은 challengeId와 인증번호를 포함한다", () => {
    const details = {
        email: "user@example.com",
        name: "오마고치",
        password: "password-passphrase"
    };

    assert.deepEqual(
        buildVerifiedSignupPayload(details, "challenge-id", "123456"),
        {
            ...details,
            challengeId: "challenge-id",
            code: "123456"
        }
    );
});

test("인증 요청 응답은 challengeId와 양수 만료 시간 모두 필요하다", () => {
    assert.equal(
        isEmailChallengeResponse({ challengeId: "challenge-id", expiresInSeconds: 600 }),
        true
    );
    assert.equal(isEmailChallengeResponse({ challengeId: "", expiresInSeconds: 600 }), false);
    assert.equal(isEmailChallengeResponse({ challengeId: "challenge-id", expiresInSeconds: 0 }), false);
});

test("절대 만료 시각에서 남은 시간을 계산하고 분초로 표시한다", () => {
    assert.equal(secondsUntil(10_001, 1), 10);
    assert.equal(secondsUntil(1, 10_001), 0);
    assert.equal(formatCountdown(582), "09:42");
});

test("Retry-After 초 단위 값만 수용한다", () => {
    assert.equal(parseRetryAfter("37"), 37);
    assert.equal(parseRetryAfter("-1"), null);
    assert.equal(parseRetryAfter("tomorrow"), null);
});

test("이메일 로컬 파트만 가려서 표시한다", () => {
    assert.equal(maskEmail("user@example.com"), "us**@example.com");
    assert.equal(maskEmail("a@example.com"), "a*@example.com");
});
