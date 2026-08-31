import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
    new URL("../../main/resources/static/js/manager/dashboard/panels/codesPanel.js", import.meta.url),
    "utf8"
);

function loadPanel({ initialCode, revokeJoinCode, refreshDashboard }) {
    let code = initialCode;
    let registration;
    let expiryTimer;
    let codeCardClick;
    let now = Date.parse("2026-08-28T05:00:00Z");
    const fields = new Map();
    const field = (selector) => {
        if (!fields.has(selector)) fields.set(selector, { disabled: false, textContent: "" });
        return fields.get(selector);
    };
    const issueButton = {
        disabled: false,
        textContent: "",
        addEventListener() {}
    };
    const codeCard = {
        addEventListener(type, listener) {
            if (type === "click") codeCardClick = listener;
        },
        querySelector: field,
        replaceChildren() {}
    };
    const template = { content: { cloneNode: () => ({}) } };
    const root = {
        querySelector(selector) {
            if (selector === "[data-issue-code]") return issueButton;
            if (selector === "[data-code-card]") return codeCard;
            return template;
        }
    };
    class FakeDate extends Date {
        constructor(...args) {
            super(...(args.length ? args : [now]));
        }

        static now() {
            return now;
        }
    }
    const window = {
        OmagotchiApi: { manager: { revokeJoinCode } },
        OmagotchiDashboardPanels: {
            register(panel) {
                registration = panel;
            }
        },
        addEventListener() {},
        clearTimeout() {
            expiryTimer = undefined;
        },
        setTimeout(callback, delay) {
            expiryTimer = { callback, delay };
            return 1;
        }
    };
    const document = { hidden: false, addEventListener() {} };
    vm.runInNewContext(source, {
        Date: FakeDate,
        Math,
        Number,
        Object,
        console: { error() {} },
        document,
        window
    });

    const bubbles = [];
    const updates = [];
    const panel = registration.create({
        root,
        store: {
            getState: () => ({ currentCohort: { joinCode: code }, selectedCohortId: 7 })
        },
        statusLabel: (status) => status,
        openDialog: (_options, callback) => callback(""),
        setBubble: (message) => bubbles.push(message),
        refreshDashboard,
        updateCurrentCohort: (patch) => {
            code = patch.joinCode;
            updates.push(patch);
        }
    });
    return {
        bubbles,
        codeCardClick,
        fields,
        issueButton,
        panel,
        updates,
        advanceTime(milliseconds) {
            now += milliseconds;
        },
        expiryTimer: () => expiryTimer
    };
}

test("가입 코드 원문을 브라우저 저장소에 기록하지 않는다", () => {
    assert.doesNotMatch(source, /(?:local|session)Storage/);
});

test("열어 둔 패널은 코드 만료 시점에 발급 및 코드 작업 상태를 다시 계산한다", () => {
    const harness = loadPanel({
        initialCode: {
            value: "ACTIVE-CODE",
            status: "ACTIVE",
            issuedAt: "2026-08-28T04:00:00Z",
            expiresAt: "2026-08-28T05:00:01Z"
        },
        revokeJoinCode: async () => ({}),
        refreshDashboard: async () => {}
    });

    harness.panel.activate();
    assert.equal(harness.issueButton.disabled, true);
    assert.equal(harness.issueButton.textContent, "발급 완료");
    assert.equal(harness.expiryTimer().delay, 1050);

    harness.advanceTime(1001);
    harness.expiryTimer().callback();
    assert.equal(harness.issueButton.disabled, false);
    assert.equal(harness.issueButton.textContent, "새 코드 발급");
    assert.equal(harness.fields.get("[data-code-copy]").disabled, true);
    assert.equal(harness.fields.get("[data-code-revoke]").disabled, true);
});

test("코드 폐기 성공 뒤 갱신만 실패하면 갱신 오류로 안내한다", async () => {
    const harness = loadPanel({
        initialCode: { value: "ACTIVE-CODE", status: "ACTIVE" },
        revokeJoinCode: async () => ({ status: "REVOKED" }),
        refreshDashboard: async () => {
            throw new Error("dashboard refresh failed");
        }
    });

    await harness.codeCardClick({
        target: { closest: (selector) => selector === "[data-code-revoke]" }
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(harness.updates.length, 1);
    assert.deepEqual(harness.bubbles, ["가입 코드는 폐기했지만\n화면을 갱신하지 못했습니다."]);
});

test("코드 폐기 요청 자체가 실패하면 폐기 오류로 안내한다", async () => {
    const harness = loadPanel({
        initialCode: { value: "ACTIVE-CODE", status: "ACTIVE" },
        revokeJoinCode: async () => {
            throw new Error();
        },
        refreshDashboard: async () => {}
    });

    await harness.codeCardClick({
        target: { closest: (selector) => selector === "[data-code-revoke]" }
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(harness.updates.length, 0);
    assert.deepEqual(harness.bubbles, ["가입 코드를\n폐기하지 못했습니다."]);
});
