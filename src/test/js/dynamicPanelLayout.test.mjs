import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const frontendRoot = new URL("../../../", import.meta.url);

async function read(relativePath) {
    return readFile(new URL(relativePath, frontendRoot), "utf8");
}

function extractBlock(css, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, "m");
    const match = css.match(regex);
    return match ? match[1] : null;
}

test("홈 학습 기록 오버레이(.home-overlay--write)는 CLS 방지를 위한 고정 높이와 dvh/vh fallback을 가진다", async () => {
    const css = await read("src/main/resources/static/css/home/home-overlay-theme.css");
    const block = extractBlock(css, ".home-overlay--write");

    assert.ok(block, ".home-overlay--write 스타일 블록이 정의되어 있어야 합니다.");
    assert.match(
        block,
        /height:\s*min\(1040px,\s*calc\(100vh\s*-\s*32px\)\);/,
        "구형 브라우저 호환성을 위한 100vh fallback 높이가 선언되어 있어야 합니다."
    );
    assert.match(
        block,
        /height:\s*min\(1040px,\s*calc\(100dvh\s*-\s*32px\)\);/,
        "동적 뷰포트 대응을 위한 100dvh 기준 고정 높이가 선언되어 있어야 합니다."
    );
});

test("관리자 개인 기록 모달(.study-detail-dialog)은 홈 UI와 동일하게 Flex-col 및 Sticky 헤더, 독립 스크롤 바디 구조를 가진다", async () => {
    const css = await read("src/main/resources/static/css/managerDashboard.css");
    const dialogBlock = extractBlock(css, ".study-detail-dialog");
    const headerWrapBlock = extractBlock(css, ".study-detail-header-wrap");
    const bodyBlock = extractBlock(css, ".study-detail-body");

    assert.ok(dialogBlock, ".study-detail-dialog 스타일 블록이 정의되어 있어야 합니다.");
    assert.match(dialogBlock, /display:\s*flex;/, "Flex 컨테이너여야 합니다.");
    assert.match(dialogBlock, /flex-direction:\s*column;/, "세로 방향(column) 배치여야 합니다.");
    assert.match(dialogBlock, /overflow:\s*hidden;/, "외곽 오버플로우가 숨겨져야 합니다.");
    assert.match(dialogBlock, /max-height:\s*calc\(100vh\s*-\s*40px\);/, "100vh 기준 최대 높이 제한이 선언되어 있어야 합니다.");
    assert.match(dialogBlock, /max-height:\s*calc\(100dvh\s*-\s*40px\);/, "100dvh 기준 최대 높이 제한이 선언되어 있어야 합니다.");

    assert.ok(headerWrapBlock, ".study-detail-header-wrap 스타일 블록이 정의되어 있어야 합니다.");
    assert.match(headerWrapBlock, /position:\s*sticky;/, "헤더가 sticky로 상단에 고정되어야 합니다.");
    assert.match(headerWrapBlock, /flex-shrink:\s*0;/, "헤더가 축소되지 않아야 합니다.");

    assert.ok(bodyBlock, ".study-detail-body 스타일 블록이 정의되어 있어야 합니다.");
    assert.match(bodyBlock, /display:\s*flex;/, "바디는 Flex 컨테이너여야 합니다.");
    assert.match(bodyBlock, /flex-direction:\s*column;/, "바디 내부 요소들은 반드시 세로 방향(column)으로 배치되어야 합니다.");
    assert.match(bodyBlock, /flex:\s*1\s+1\s+auto;/, "바디가 남은 높이를 유연하게 채워야 합니다.");
    assert.match(bodyBlock, /overflow-y:\s*auto;/, "바디 영역에서 독립 스크롤이 발생해야 합니다.");
});
