import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const passwordResetHtml = await read(
    "../../main/resources/templates/pages/auth/passwordReset.html"
);
const loginHtml = await read("../../main/resources/templates/pages/auth/login.html");

test("재설정 화면은 CSRF와 BFF 경로를 문서 계약으로 제공한다", () => {
    assert.match(passwordResetHtml, /name="_csrf"/);
    assert.match(passwordResetHtml, /name="_csrf_header"/);
    assert.match(
        passwordResetHtml,
        /data-email-otp-path="\/bff\/v2\/auth\/password-reset\/email-otp"/
    );
    assert.match(
        passwordResetHtml,
        /data-password-reset-path="\/bff\/v2\/auth\/password-reset"/
    );
    assert.match(passwordResetHtml, /data-login-path="\/login\?notice=password-reset"/);
});

test("재설정 화면은 이메일 단계와 숨겨진 인증·비밀번호 단계를 분리한다", () => {
    assert.match(passwordResetHtml, /data-password-reset-email-step/);
    assert.match(
        passwordResetHtml,
        /data-password-reset-challenge-step hidden/
    );
    assert.match(passwordResetHtml, /inputmode="numeric"/);
    assert.equal(
        (passwordResetHtml.match(/autocomplete="new-password"/g) || []).length,
        2
    );
    assert.match(passwordResetHtml, /type="module" src="\/js\/passwordReset\.js/);
});

test("Browser 요청에 비밀번호 확인 값을 보내는 계약이 없다", () => {
    assert.match(passwordResetHtml, /name="passwordConfirmation"/);
    assert.doesNotMatch(passwordResetHtml, /data-password-confirmation-path/);
});

test("로그인 화면의 비밀번호 분실 링크가 정식 재설정 경로를 사용한다", () => {
    assert.match(loginHtml, /href="\/password-reset"[^>]*>비밀번호를 잊으셨나요\?/);
    assert.doesNotMatch(loginHtml, /href="\/password-change"/);
});
