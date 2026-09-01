import assert from "node:assert/strict";
import test from "node:test";
import { resolveHomeEntry } from "../../main/resources/static/js/homeEntry.js";

const CHARACTER = {gameCharacterId: 1};
const APPROVED_COHORT = {cohortId: 3};

test("캐릭터를 선택하지 않은 사용자는 캐릭터 선택 화면으로 이동한다", () => {
    assert.equal(resolveHomeEntry({approvedCohort: APPROVED_COHORT}, null), "/character-selector");
});

test("승인 기수가 없는 사용자는 홈에서 기수 가입 안내를 받는다", () => {
    assert.equal(resolveHomeEntry({currentCharacter: CHARACTER}, null), "/home");
});

test("승인 기수가 있고 오늘 미출석이면 입실 화면으로 이동한다", () => {
    const profile = {currentCharacter: CHARACTER, approvedCohort: APPROVED_COHORT};

    assert.equal(resolveHomeEntry(profile, null), "/check-in");
    assert.equal(resolveHomeEntry(profile, {checkedInAt: null}), "/check-in");
});

test("승인 기수가 있고 오늘 출석했다면 홈으로 이동한다", () => {
    const profile = {currentCharacter: CHARACTER, approvedCohort: APPROVED_COHORT};
    const attendance = {checkedInAt: "2026-09-01T00:10:00Z"};

    assert.equal(resolveHomeEntry(profile, attendance), "/home");
});
