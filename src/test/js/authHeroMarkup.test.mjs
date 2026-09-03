import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

/*
 * 로그인·회원가입 좌측 히어로는 실제 화면(Thymeleaf)과 스토리북(AuthScreen.jsx)이
 * 각각 마크업을 갖는다. 한쪽만 고치면 스토리북만 멀쩡해 보이고 운영은 그대로다.
 * 두 곳이 같은 구조를 쓰는지 여기서 묶어 둔다.
 */
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const loginHtml = await read("../../main/resources/templates/pages/auth/login.html");
const registerHtml = await read("../../main/resources/templates/pages/auth/register.html");
const authScreen = await read("../../main/frontend/ui/AuthScreen.jsx");
const authCss = await read("../../main/resources/static/css/auth.css");
const designSystemCss = await read("../../main/resources/static/css/ui/design-system.css");

test("두 화면 모두 히어로 구조를 쓴다", () => {
    for (const [name, html] of [["login", loginHtml], ["register", registerHtml]]) {
        assert.match(html, /class="ui-auth-aside auth-hero"/, `${name}: 히어로 클래스 없음`);
        assert.match(html, /auth-hero-stage[\s\S]*?aria-hidden="true"/, `${name}: 캐릭터가 장식으로 표시되지 않음`);
        assert.match(html, /class="auth-hero-character"/, `${name}: 캐릭터 없음`);
        assert.match(html, /class="auth-hero-shadow"/, `${name}: 그림자 없음`);
        assert.match(html, /class="auth-hero-line"/, `${name}: 한 줄 문구 없음`);
    }
});

test("옛 히어로 요소는 남지 않는다", () => {
    for (const [name, html] of [["login", loginHtml], ["register", registerHtml]]) {
        assert.equal(/ui-auth-aside-badges/.test(html), false, `${name}: 해시태그 배지가 남아 있음`);
        // 좌측 h2 제목은 제거했다. 페이지 제목은 폼의 h1 이 갖는다.
        assert.equal(/<h2>.*학습.*<\/h2>/.test(html), false, `${name}: 옛 제목이 남아 있음`);
    }
});

test("페이지 제목은 폼의 h1 이 갖고 aria 참조가 유지된다", () => {
    assert.match(loginHtml, /aria-labelledby="login-title"/);
    assert.match(loginHtml, /<h1 id="login-title">/);
    assert.match(registerHtml, /aria-labelledby="register-title"/);
    assert.match(registerHtml, /<h1 id="register-title">/);
});

test("스토리북 컴포넌트가 같은 캐릭터 조합을 쓴다", () => {
    assert.match(registerHtml, /sprout\/sprout_eye\.gif/, "회원가입은 새싹이");
    assert.match(loginHtml, /study\/study_eye\.gif/, "로그인은 공부쟁이");
    assert.match(authScreen, /sprout\/sprout_eye\.gif/);
    assert.match(authScreen, /study\/study_eye\.gif/);
    assert.match(authScreen, /auth-hero-line/);
});

test("좁은 화면에서 히어로 문구가 숨겨지지 않는다", () => {
    // 이 규칙이 .ui-auth-aside p 전체를 숨기면 새 한 줄까지 사라진다.
    assert.match(
        designSystemCss,
        /\.ui-auth-aside:not\(\.auth-hero\) p/,
        "숨김 규칙이 히어로까지 잡습니다."
    );
});

test("움직임 최소화 설정에서는 애니메이션을 끈다", () => {
    assert.match(authCss, /prefers-reduced-motion: reduce[\s\S]*?auth-hero-character[\s\S]*?animation:\s*none/);
});
