import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const [homeHtml, bootstrapSource, homeSource] = await Promise.all([
    readFile(new URL("../../main/resources/templates/pages/app/home.html", import.meta.url), "utf8"),
    readFile(new URL("../../main/resources/static/js/homeBootstrap.js", import.meta.url), "utf8"),
    readFile(new URL("../../main/resources/static/js/home.js", import.meta.url), "utf8")
]);

test("홈은 api.js를 bootstrap보다 먼저 로드하고 src와 th:src 버전을 일치시킨다", () => {
    const api = homeHtml.match(/src="\/js\/api\.js\?v=([^"]+)" th:src="@\{\/js\/api\.js\(v='([^']+)'\)\}"/);
    const bootstrap = homeHtml.match(/src="\/js\/homeBootstrap\.js\?v=([^"]+)" th:src="@\{\/js\/homeBootstrap\.js\(v='([^']+)'\)\}"/);

    assert.ok(api, "api.js의 src/th:src 버전 계약을 찾을 수 없습니다.");
    assert.ok(bootstrap, "homeBootstrap.js의 src/th:src 버전 계약을 찾을 수 없습니다.");
    assert.equal(api[1], api[2]);
    assert.equal(bootstrap[1], bootstrap[2]);
    assert.ok(homeHtml.indexOf(api[0]) < homeHtml.indexOf(bootstrap[0]));
});

test("bootstrap은 프로필 주입 뒤 team.js를 불러오고 home.js보다 먼저 초기화한다", () => {
    const profileIndex = bootstrapSource.indexOf("globalThis.OmagotchiProfile = profile || {};");
    const teamIndex = bootstrapSource.indexOf('import("./team.js');
    const homeIndex = bootstrapSource.indexOf('import("./home.js');

    assert.ok(profileIndex >= 0 && teamIndex > profileIndex);
    assert.ok(teamIndex < homeIndex);
});

test("기수 오버레이는 독립 팀 모듈을 마운트하고 공간 모듈에 위임하지 않는다", () => {
    assert.match(homeSource, /OmagotchiTeam\?\.mount\(/);
    assert.doesNotMatch(homeSource, /OmagotchiSpaceRoom\?\.mountParty\(/);
});
