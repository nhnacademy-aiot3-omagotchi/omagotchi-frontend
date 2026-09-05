import assert from "node:assert/strict";
import test from "node:test";

import {
    buildPasswordResetPayload,
    normalizePasswordResetEmail,
    validatePasswordResetPasswords
} from "../../main/resources/static/js/passwordResetFlow.js";

test("비밀번호 재설정 이메일은 앞뒤 공백만 제거한다", () => {
    assert.equal(normalizePasswordResetEmail(" user@example.com "), "user@example.com");
});

test("새 비밀번호와 확인 입력의 일치 및 Identity 정책을 검증한다", () => {
    assert.equal(validatePasswordResetPasswords("", "").valid, false);
    assert.equal(
        validatePasswordResetPasswords("new-password-value", "different-password").valid,
        false
    );
    assert.equal(validatePasswordResetPasswords("short", "short").valid, false);
    assert.equal(
        validatePasswordResetPasswords("new-password-value\n", "new-password-value\n").valid,
        false
    );
    assert.equal(
        validatePasswordResetPasswords("new-password-value", "new-password-value").valid,
        true
    );
});

test("재설정 요청은 확인 비밀번호 없이 BFF 계약 필드만 포함한다", () => {
    assert.deepEqual(
        buildPasswordResetPayload({
            email: " user@example.com ",
            newPassword: "new-password-value",
            passwordConfirmation: "new-password-value",
            challengeId: "challenge-id",
            code: "123456"
        }),
        {
            email: "user@example.com",
            newPassword: "new-password-value",
            challengeId: "challenge-id",
            code: "123456"
        }
    );
});
