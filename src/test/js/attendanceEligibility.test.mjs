import assert from "node:assert/strict";
import test from "node:test";
import {
    createAttendance,
    hasApprovedCohort
} from "../../main/resources/static/js/home/attendance.js";

test("가입 신청 중에는 출결 API를 활성화하지 않는다", () => {
    assert.equal(hasApprovedCohort({approvedCohort: null}), false);
    assert.equal(hasApprovedCohort({joinRequests: [{status: "PENDING"}]}), false);
});

test("ACTIVE 승인 기수가 프로필에 반영되면 출결 API를 활성화한다", () => {
    assert.equal(hasApprovedCohort({approvedCohort: {cohortId: 3}}), true);
});

test("가입 신청 중에는 출결 초기화가 서버 이력을 조회하지 않는다", () => {
    let historyCalls = 0;
    const attendance = createAttendance({
        api: {getHistory: async () => {
            historyCalls += 1;
            return [];
        }},
        enabled: hasApprovedCohort({joinRequests: [{status: "PENDING"}]})
    });

    attendance.init();

    assert.equal(historyCalls, 0);
});

test("ACTIVE 승인 기수로 홈을 초기화하면 출결 이력을 즉시 조회한다", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    let historyCalls = 0;
    let historyRequested;
    const requested = new Promise((resolve) => {
        historyRequested = resolve;
    });

    globalThis.window = {
        addEventListener() {},
        setInterval() {}
    };
    globalThis.document = {
        addEventListener() {},
        hidden: false
    };

    try {
        const attendance = createAttendance({
            api: {getHistory: async () => {
                historyCalls += 1;
                historyRequested();
                return [];
            }},
            enabled: hasApprovedCohort({approvedCohort: {cohortId: 3}})
        });

        attendance.init();
        await requested;

        assert.equal(historyCalls, 1);
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    }
});
