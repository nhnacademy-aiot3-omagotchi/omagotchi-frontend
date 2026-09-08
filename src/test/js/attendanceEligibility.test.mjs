import assert from "node:assert/strict";
import test from "node:test";
import {
    createAttendance,
    hasApprovedCohort
} from "../../main/resources/static/js/home/attendance.js";
import {getServiceDate} from "../../main/resources/static/js/attendanceState.js";

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

test("출석 상태 카드에는 조퇴 분이 아니라 최종 판정을 표시한다", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const today = getServiceDate();
    const attendanceStatus = {textContent: ""};

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
            attendanceStatus,
            api: {
                getHistory: async () => [{
                    attendanceDate: today,
                    finalStatus: "LATE_LEFT_EARLY",
                    checkedInAt: "2026-09-08T00:19:50Z",
                    checkedOutAt: "2026-09-08T01:17:00Z",
                    lateMinutes: 10,
                    earlyLeaveMinutes: 463
                }]
            }
        });

        attendance.init();
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(attendanceStatus.textContent, "지각·조퇴");
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    }
});

test("오래 열린 화면에서 미퇴실 마감 응답을 받으면 안내하고 퇴실 버튼을 완료 처리한다", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const today = getServiceDate();
    const label = {textContent: ""};
    const checkOutTime = {textContent: ""};
    const attendanceStatus = {textContent: ""};
    let clickHandler;
    let missingCheckOutCalls = 0;
    let errorCalls = 0;
    let successCalls = 0;
    const button = {
        hidden: false,
        disabled: false,
        classList: {toggle() {}},
        querySelector: () => label,
        setAttribute() {},
        addEventListener(type, handler) {
            if (type === "click") clickHandler = handler;
        }
    };

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
            button,
            checkOutTime,
            attendanceStatus,
            api: {
                getHistory: async () => [{
                    attendanceDate: today,
                    autoStatus: "PENDING",
                    checkedInAt: "2026-09-07T00:00:00Z",
                    checkedOutAt: null
                }],
                checkOut: async () => ({
                    attendanceDate: today,
                    autoStatus: "MISSING_CHECK_OUT",
                    finalStatus: "MISSING_CHECK_OUT",
                    checkedInAt: "2026-09-07T00:00:00Z",
                    checkedOutAt: null
                })
            },
            confirmCheckOut: async () => true,
            onMissingCheckOut: () => { missingCheckOutCalls += 1; },
            onCheckOutError: () => { errorCalls += 1; },
            onCheckOutSuccess: () => { successCalls += 1; }
        });

        attendance.init();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(button.disabled, false);

        await clickHandler();

        assert.equal(missingCheckOutCalls, 1);
        assert.equal(errorCalls, 0);
        assert.equal(successCalls, 0);
        assert.equal(button.disabled, true);
        assert.equal(label.textContent, "완료");
        assert.equal(checkOutTime.textContent, "미퇴실 처리됨");
        assert.equal(attendanceStatus.textContent, "퇴실 누락");
        assert.equal(attendance.getHistory()[today].autoStatus, "MISSING_CHECK_OUT");
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    }
});
