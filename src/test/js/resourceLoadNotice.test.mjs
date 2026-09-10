import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {runInNewContext} from "node:vm";

const source = readFileSync(new URL("../../main/resources/static/js/resourceLoadNotice.js", import.meta.url), "utf8");

// 브라우저 이벤트 경계의 대역. 실제 파일 요청·화면 배치는 별도 브라우저 확인 대상.
function createPage(readyState = "complete") {
    const listeners = new Map();
    const notices = [];
    const button = new EventTarget();
    const document = new EventTarget();
    const reloads = [];
    document.readyState = readyState;
    document.body = {append: (notice) => notices.push(notice)};
    document.createElement = () => ({setAttribute() {}, querySelector: () => button});
    const page = {
        document,
        URL,
        location: {origin: "https://omagotchi.test", reload: () => reloads.push(true)},
        HTMLScriptElement: class {
            constructor(src) {
                this.src = src;
            }
        },
        HTMLLinkElement: class {
            constructor(href) {
                this.href = href;
            }
            relList = {contains: (rel) => rel === "stylesheet"};
        },
        addEventListener: (type, listener, capture) => listeners.set(type, {listener, capture})
    };
    runInNewContext(source, page);
    return {page, listeners, notices, button, reloads};
}

test("여러 파일의 로딩 실패에도 안내 한 개와 사용자 클릭 후 새로고침", () => {
    // Given: 정상 페이지와 캡처 단계의 오류 수신 함수
    const {page, listeners, notices, button, reloads} = createPage();
    const {listener, capture} = listeners.get("error");

    // When: JS·CSS 로딩 오류의 연속 수신
    listener({target: new page.HTMLScriptElement("https://omagotchi.test/js/home.js")});
    listener({target: new page.HTMLLinkElement("https://omagotchi.test/css/home.css")});

    // Then: 자동 이동 없이 한 번 표시, 명시적 클릭 시에만 새로고침
    assert.equal(capture, true);
    assert.equal(notices.length, 1);
    assert.match(notices[0].innerHTML, /작성 중인 내용/);
    assert.equal(reloads.length, 0);
    button.dispatchEvent(new Event("click"));
    assert.equal(reloads.length, 1);
});

test("내용 해시와 쿼리가 있는 앱 CSS의 로딩 실패 안내", () => {
    // Given: 앱에서 제공하는 Stylesheet
    const {page, listeners, notices} = createPage();
    const stylesheet = new page.HTMLLinkElement("https://omagotchi.test/css/home-abc123.css?v=2");

    // When: CSS 로딩 실패
    listeners.get("error").listener({target: stylesheet});

    // Then: 파일 이름의 버전 표기와 무관한 안내 표시
    assert.equal(notices.length, 1);
});

test("외부 파일·앱 경로 밖의 파일은 제외하고 이후 앱 JS 실패는 안내", () => {
    // Given: 외부 통계·외부 CSS·같은 사이트의 보조 Script
    const {page, listeners, notices} = createPage();
    const resources = [
        new page.HTMLScriptElement("https://static.cloudflareinsights.com/beacon.min.js"),
        new page.HTMLLinkElement("https://cdn.example.test/css/theme.css"),
        new page.HTMLScriptElement("https://omagotchi.test/cdn-cgi/scripts/beacon.js"),
        new page.HTMLScriptElement("https://omagotchi.test/js-other/tool.js")
    ];

    // When: 앱 화면과 무관한 파일의 로딩 실패
    for (const resource of resources) {
        listeners.get("error").listener({target: resource});
    }

    // Then: 불필요한 안내 없이 이후 앱 모듈의 실패만 표시
    assert.equal(notices.length, 0);
    listeners.get("error").listener({
        target: new page.HTMLScriptElement("https://omagotchi.test/js/home-react/chunks/home-abc123.js?v=2")
    });
    assert.equal(notices.length, 1);
});

test("주소가 없거나 잘못된 Script의 처리 제외", () => {
    // Given: 파일 주소가 없거나 올바른 URL이 아닌 Script
    const {page, listeners, notices} = createPage();

    // When: 해당 요소의 오류 수신
    for (const src of ["", "http://["]) {
        listeners.get("error").listener({target: new page.HTMLScriptElement(src)});
    }

    // Then: 오류 처리 중 추가 예외나 새로고침 안내 없음
    assert.equal(notices.length, 0);
});

test("Body 생성 전 파일 오류의 안내 대기", () => {
    // Given: HTML 파싱 중인 페이지
    const {page, notices} = createPage("loading");

    // When: 페이지 초기화 실패 알림
    page.OmagotchiResourceLoadNotice.show();
    page.OmagotchiResourceLoadNotice.show();
    assert.equal(notices.length, 0);
    page.document.dispatchEvent(new Event("DOMContentLoaded"));

    // Then: 문서 준비 뒤 안내 한 번 표시
    assert.equal(notices.length, 1);
});

test("Vite 모듈 로딩 실패의 안내와 기존 오류 전달 유지", () => {
    // Given: Vite가 발생시킨 취소 가능한 오류 이벤트
    const {listeners, notices, reloads} = createPage();
    const event = new Event("vite:preloadError", {cancelable: true});

    // When: Vite 로딩 실패 수신
    listeners.get("vite:preloadError").listener(event);

    // Then: 자동 새로고침과 기존 예외의 억제 없이 안내만 표시
    assert.equal(notices.length, 1);
    assert.equal(reloads.length, 0);
    assert.equal(event.defaultPrevented, false);
});

test("이미지·일반 실행 오류와 업무 요청 실패의 처리 제외", () => {
    // Given: 실패 없는 페이지와 Stylesheet가 아닌 Link
    const {page, listeners, notices} = createPage();
    const icon = new page.HTMLLinkElement();
    icon.relList = {contains: () => false};

    // When: 이미지·아이콘·일반 실행 오류 수신
    listeners.get("error").listener({target: {tagName: "IMG"}});
    listeners.get("error").listener({target: icon});
    listeners.get("error").listener({target: page, error: new Error("API unavailable")});

    // Then: 안내 없음, Promise 실패를 일괄 처리하는 수신 함수도 없음
    assert.equal(notices.length, 0);
    assert.equal(listeners.has("unhandledrejection"), false);
});
