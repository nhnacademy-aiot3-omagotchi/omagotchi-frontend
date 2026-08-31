import assert from "node:assert/strict";
import test from "node:test";

import {renderServiceIntegrationPending} from "../../main/resources/static/js/serviceIntegrationState.js";

test("서버 연동 대기 컴포넌트는 공용 구조와 안내를 렌더한다", () => {
    const markup = renderServiceIntegrationPending({
        title: "서비스 연동 대기",
        description: "Space API 연결 후 제공합니다."
    });

    assert.match(markup, /class="service-integration-pending"/);
    assert.match(markup, /role="status"/);
    assert.match(markup, /서비스 연동 대기/);
    assert.match(markup, /Space API 연결 후 제공합니다\./);
});

test("서버 연동 대기 컴포넌트는 외부 문구를 HTML escape한다", () => {
    const markup = renderServiceIntegrationPending({
        title: "<script>alert(1)</script>",
        description: "A&B"
    });

    assert.doesNotMatch(markup, /<script>/);
    assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(markup, /A&amp;B/);
});
