import assert from "node:assert/strict";
import test from "node:test";

import {
  validateAccountName,
  validateNewPassword
} from "../../main/resources/static/js/accountSettings.js";

test("Identity 이름 정책과 동일한 계정 이름 검증", () => {
  // Given: 정규화 대상과 정책 위반 이름
  // When: 계정 이름 검증
  const normalized = validateAccountName("  오마고치  ");

  // Then: 앞뒤 공백 제거와 길이 정책 적용
  assert.deepEqual(normalized, {
    valid: true,
    value: "오마고치"
  });
  assert.equal(validateAccountName("   ").valid, false);
  assert.equal(validateAccountName("a".repeat(31)).valid, false);
});

test("Identity 비밀번호 정책과 동일한 새 비밀번호 검증", () => {
  // Given: 정상 입력과 정책별 위반 입력
  // When: 새 비밀번호 검증
  // Then: 길이·제어 문자·UTF-8 바이트·동일성 정책 적용
  assert.equal(validateNewPassword("old-password-value", "new-password-value", "new-password-value").valid, true);
  assert.equal(validateNewPassword("same-password-value", "same-password-value", "same-password-value").valid, false);
  assert.equal(validateNewPassword("old-password-value", "short", "short").valid, false);
  assert.equal(validateNewPassword("old-password-value", "new-password-value\n", "new-password-value\n").valid, false);
  assert.equal(validateNewPassword("old-password-value", "한".repeat(25), "한".repeat(25)).valid, false);
  assert.equal(validateNewPassword("old-password-value", "new-password-value", "mismatch-password").valid, false);
});
