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

test("관리자 개인 기록 모달(.study-detail-dialog)은 CLS 방지를 위한 고정 높이와 dvh/vh fallback을 가진다", async () => {
    const css = await read("src/main/resources/static/css/managerDashboard.css");
    const block = extractBlock(css, ".study-detail-dialog");

    assert.ok(block, ".study-detail-dialog 스타일 블록이 정의되어 있어야 합니다.");
    assert.match(
        block,
        /height:\s*min\(1080px,\s*calc\(100vh\s*-\s*40px\)\);/,
        "구형 브라우저 호환성을 위한 100vh fallback 높이가 선언되어 있어야 합니다."
    );
    assert.match(
        block,
        /height:\s*min\(1080px,\s*calc\(100dvh\s*-\s*40px\)\);/,
        "동적 뷰포트 대응을 위한 100dvh 기준 고정 높이가 선언되어 있어야 합니다."
    );
    assert.match(
        block,
        /max-height:\s*calc\(100vh\s*-\s*40px\);/,
        "최대 높이 제한(max-height)이 선언되어 있어야 합니다."
    );
});
