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
const SPACE_ROOM_CSS = readFileSync(
    new URL("../../main/resources/static/css/spaceRoom.css", import.meta.url),
    "utf8"
);

// 캐시 버스팅 `?v=...`가 붙어도 깨지지 않게 쿼리스트링을 선택으로 둔다.
// `src="` 바로 뒤에 경로가 오도록 강제해 `th:src="@{/js/...}"`와는 매칭되지 않는다.
const scriptSrc = (path) =>
    new RegExp(`src="${path.replace(/[/.]/g, "\\$&")}(\\?[^"]*)?"`);

test("공간 페이지는 space.js보다 먼저 api.js를 로드한다", () => {
    const apiIndex = SPACE_HTML.search(scriptSrc("/js/api.js"));
    const spaceIndex = SPACE_HTML.search(scriptSrc("/js/space.js"));

    assert.ok(apiIndex !== -1, "space.html이 /js/api.js를 로드하지 않는다");
    assert.ok(spaceIndex !== -1, "space.html이 /js/space.js를 로드하지 않는다");
    assert.ok(apiIndex < spaceIndex, "api.js가 space.js보다 뒤에 로드된다");
});

test("공간 페이지는 캐릭터 자산 스크립트를 로드한다", () => {
    // spaceRoom.js가 window.OmagotchiCharacterAssets로 아바타 이미지를 만든다.
    assert.match(SPACE_HTML, scriptSrc("/js/characterAssets.js"));
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

test("실습실 목록은 데스크톱에서 2열 격자로 한 판씩 넘긴다", () => {
    // 가로 스크롤로 카드를 흘려 보내면 뒤쪽 실습실을 못 보고 지나친다.
    // 한 판(2열 × 2행)을 통째로 넘기는 방식이라 격자와 넘기기 버튼이 함께 있어야 한다.
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
    );
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-carousel__nav\s*\{[^}]*position:\s*absolute;/s
    );
    assert.doesNotMatch(
        SPACE_ROOM_CSS,
        /\.space-room-lab-grid\s*\{[^}]*overflow-x:\s*auto;/s
    );
});

test("끝 페이지의 넘기기 버튼은 흐려지지 않고 회색으로 남는다", () => {
    // 전역 button:disabled 의 opacity 를 그대로 두면 화살표가 반투명해져
    // 목록 밖으로 걸쳐 둔 원형 버튼이 배경에 묻힌다.
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-carousel__nav:disabled\s*\{[^}]*opacity:\s*1;/s
    );
});

test("실습실 카드는 머리말·실내 환경·이동 버튼 순서를 유지한다", () => {
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-stage\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto;/s
    );
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s
    );
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-stage__actions\s*\{[^}]*justify-content:\s*flex-end;/s
    );
});

test("실습실 카드 이름과 우측 상단 이용 정보의 배치를 유지한다", () => {
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-stage__identity\s*>\s*strong\s*\{[^}]*font-size:\s*17px;/s
    );
    assert.match(
        SPACE_ROOM_CSS,
        /\.space-room-lab-stage__meta\s*\{[^}]*justify-items:\s*end;[^}]*text-align:\s*right;/s
    );
});
