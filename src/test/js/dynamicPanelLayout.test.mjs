import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const frontendRoot = new URL("../../../", import.meta.url);

async function read(relativePath) {
    return readFile(new URL(relativePath, frontendRoot), "utf8");
}

async function getBox(page, selector) {
    return page.locator(selector).evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
    });
}

function assertStablePosition(before, after) {
    assert.equal(after.x, before.x);
    assert.equal(after.y, before.y);
    assert.equal(after.width, before.width);
    assert.equal(after.height, before.height);
}

test("홈 학습 기록 조회 결과가 달라져도 중앙 오버레이 위치를 유지한다", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

    try {
        await page.setContent(`
            <div class="home-overlay-root is-open">
                <section class="home-overlay-backdrop">
                    <article class="home-overlay home-overlay--write">
                        <header class="home-overlay-header"><h2>학습 기록</h2></header>
                        <div class="home-overlay-body">
                            <div data-study-records>
                                <div class="study-records">
                                    <section class="ui-menu-section" data-record-result style="height: 840px"></section>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        `);
        for (const stylesheet of [
            "src/main/resources/static/css/home.css",
            "src/main/resources/static/css/home/react-stage.css",
            "src/main/resources/static/css/studyRecords.css",
            "src/main/resources/static/css/home/home-responsive.css",
            "src/main/resources/static/css/home/home-overlay-theme.css"
        ]) {
            await page.addStyleTag({ content: await read(stylesheet) });
        }

        const populated = await getBox(page, ".home-overlay--write");
        await page.locator("[data-record-result]").evaluate((element) => {
            element.style.height = "540px";
        });
        const empty = await getBox(page, ".home-overlay--write");

        assertStablePosition(populated, empty);
    } finally {
        await browser.close();
    }
});

test("관리자 개인 기록 조회 결과가 달라져도 중앙 모달 위치를 유지한다", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

    try {
        const rawTemplate = await read(
            "src/main/resources/templates/manager/dashboard/popups/studyDetailModal.html"
        );
        const template = rawTemplate
            .replace(/<th:block[^>]*>/, "")
            .replace(/<\/th:block>\s*$/, "");

        await page.setContent(`<main>${template}</main>`);
        await page.addStyleTag({
            content: await read("src/main/resources/static/css/managerDashboard.css")
        });
        await page.locator("[data-study-detail-dialog]").evaluate((element) => {
            element.hidden = false;
        });
        await page.locator("[data-study-detail-list]").evaluate((list) => {
            const row = document.querySelector("[data-detail-record-template]")
                .content.firstElementChild;
            list.replaceChildren(...Array.from({ length: 5 }, () => row.cloneNode(true)));
        });

        const populated = await getBox(page, ".study-detail-dialog");
        await page.locator("[data-study-detail-list]").evaluate((list) => {
            const empty = document.querySelector("[data-detail-record-empty-template]")
                .content.firstElementChild.cloneNode(true);
            list.replaceChildren(empty);
        });
        const empty = await getBox(page, ".study-detail-dialog");

        assertStablePosition(populated, empty);
    } finally {
        await browser.close();
    }
});
