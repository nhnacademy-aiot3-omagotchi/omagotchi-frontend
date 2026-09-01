import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SPACE_HTML = readFileSync(
    new URL("../../main/resources/templates/pages/app/space.html", import.meta.url),
    "utf8"
);
const SPACE_JS = readFileSync(
    new URL("../../main/resources/static/js/space.js", import.meta.url),
    "utf8"
);

test("공간 페이지는 space.js보다 먼저 api.js를 로드한다", () => {
    const apiIndex = SPACE_HTML.indexOf('src="/js/api.js"');
    const spaceIndex = SPACE_HTML.indexOf('src="/js/space.js');

    assert.ok(apiIndex !== -1, "space.html이 /js/api.js를 로드하지 않는다");
    assert.ok(spaceIndex !== -1, "space.html이 /js/space.js를 로드하지 않는다");
    assert.ok(apiIndex < spaceIndex, "api.js가 space.js보다 뒤에 로드된다");
});

test("공간 페이지는 캐릭터 자산 스크립트를 로드한다", () => {
    // spaceRoom.js가 window.OmagotchiCharacterAssets로 아바타 이미지를 만든다.
    assert.ok(SPACE_HTML.includes('src="/js/characterAssets.js"'));
});

test("space.js는 spaceRoom을 정적 import하지 않는다", () => {
    // spaceRoom.js는 모듈 평가 시점에 window.OmagotchiProfile을 읽는다.
    // 정적 import는 프로필 주입보다 먼저 실행되므로 반드시 동적 import여야 한다.
    assert.doesNotMatch(SPACE_JS, /^\s*import\s+["']\.\/spaceRoom\.js/m);
    assert.match(SPACE_JS, /await import\(\s*SPACE_ROOM_MODULE\s*\)|await import\(\s*["']\.\/spaceRoom\.js/);
});

test("space.js는 프로필을 전역에 주입한 뒤 spaceRoom을 불러온다", () => {
    const assignIndex = SPACE_JS.indexOf("globalThis.OmagotchiProfile = profile");
    const importIndex = SPACE_JS.indexOf("await import(");

    assert.ok(assignIndex !== -1, "프로필을 전역에 주입하지 않는다");
    assert.ok(assignIndex < importIndex, "spaceRoom을 불러온 뒤에 프로필을 주입한다");
});

test("space.js는 세션 만료를 로그인으로 넘긴다", () => {
    assert.match(SPACE_JS, /error\?\.status === 401/);
    assert.match(SPACE_JS, /\/login\?notice=session-expired/);
});

test("space.js는 프로필 조회 실패에도 화면을 계속 띄운다", () => {
    // 401이 아닌 실패는 빈 프로필로 진행해야 한다. 공간 목록까지 막으면 안 된다.
    assert.match(SPACE_JS, /return \{\};/);
});
