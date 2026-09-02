import assert from "node:assert/strict";
import test from "node:test";

import { createTimer } from "../../main/resources/static/js/home/timer.js";

function setupMockDom() {
    const display = {
        textContent: "",
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
    };
    const toggle = {
        disabled: false,
        textContent: "",
        addEventListener(event, fn) {}
    };
    const statusMessage = {
        textContent: ""
    };

    const listeners = {};
    const mockWindow = {
        setInterval(fn, ms) {
            return 123;
        },
        clearInterval(id) {},
        addEventListener(event, fn) {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
        },
        removeEventListener(event, fn) {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(cb => cb !== fn);
            }
        }
    };

    globalThis.window = mockWindow;
    globalThis.document = { title: "" };

    return { display, toggle, statusMessage, listeners };
}

test("타이머 시작: 24시간 제약 없이 언제든 시작되며 onStart 콜백이 호출된다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();

    let startedCalled = false;
    let startedRestored = null;

    const mockApi = {
        startTimer: async () => ({
            timerRunId: "test-run-123",
            startedAt: new Date(Date.now() - 5000).toISOString()
        })
    };

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: mockApi,
        onStart: ({ restored }) => {
            startedCalled = true;
            startedRestored = restored;
        }
    });

    assert.equal(timer.isRunning(), false);
    await timer.start();

    assert.equal(timer.isRunning(), true);
    assert.equal(timer.getTimerRunId(), "test-run-123");
    assert.equal(startedCalled, true);
    assert.equal(startedRestored, false);
    assert.equal(toggle.textContent, "정지");
    assert.ok(timer.getElapsedSeconds() >= 5);
});

test("타이머 정지: stopTimer API를 호출하고 onPause 콜백에 경과 시간을 전달한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();

    let stopCalledWithId = null;
    let pausedCalled = false;
    let pausedElapsed = null;

    const mockApi = {
        startTimer: async () => ({
            timerRunId: "test-run-456",
            startedAt: new Date(Date.now() - 10000).toISOString()
        }),
        stopTimer: async (timerRunId) => {
            stopCalledWithId = timerRunId;
        }
    };

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: mockApi,
        onPause: ({ elapsedSeconds }) => {
            pausedCalled = true;
            pausedElapsed = elapsedSeconds;
        }
    });

    await timer.start();
    assert.equal(timer.isRunning(), true);

    await timer.stop();
    assert.equal(timer.isRunning(), false);
    assert.equal(timer.getTimerRunId(), null);
    assert.equal(stopCalledWithId, "test-run-456");
    assert.equal(pausedCalled, true);
    assert.ok(pausedElapsed >= 10);
    assert.equal(toggle.textContent, "시작");
});

test("최초 접속 시 실행 중 타이머 감지: 사용자가 '계속 진행(resume)' 선택 시 이어서 시작한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();

    let promptCalled = false;
    let startedRestored = null;

    const mockApi = {
        getCurrentTimer: async () => ({
            state: "RUNNING",
            timerRunId: "existing-run-789",
            startedAt: new Date(Date.now() - 60000).toISOString(),
            elapsedSeconds: 60
        })
    };

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: mockApi,
        onRunningTimerDetected: async ({ timerRunId, elapsedSeconds }) => {
            promptCalled = true;
            assert.equal(timerRunId, "existing-run-789");
            assert.equal(elapsedSeconds, 60);
            return "resume";
        },
        onStart: ({ restored }) => {
            startedRestored = restored;
        }
    });

    await timer.syncWithServer();

    assert.equal(promptCalled, true);
    assert.equal(timer.isRunning(), true);
    assert.equal(timer.getTimerRunId(), "existing-run-789");
    assert.equal(startedRestored, true);
    assert.equal(toggle.textContent, "정지");
    assert.ok(timer.getElapsedSeconds() >= 60);
});

test("최초 접속 시 실행 중 타이머 감지: 사용자가 '파기(discard)' 선택 시 discardTimer API를 호출하고 초기화한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();

    let promptCalled = false;
    let discardApiCalledWith = null;
    let onDiscardCalled = false;

    const mockApi = {
        getCurrentTimer: async () => ({
            state: "RUNNING",
            timerRunId: "existing-run-999",
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            elapsedSeconds: 3600
        }),
        discardTimer: async (timerRunId) => {
            discardApiCalledWith = timerRunId;
        }
    };

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: mockApi,
        onRunningTimerDetected: async () => {
            promptCalled = true;
            return "discard";
        },
        onDiscard: () => {
            onDiscardCalled = true;
        }
    });

    await timer.syncWithServer();

    assert.equal(promptCalled, true);
    assert.equal(discardApiCalledWith, "existing-run-999");
    assert.equal(onDiscardCalled, true);
    assert.equal(timer.isRunning(), false);
    assert.equal(timer.getTimerRunId(), null);
    assert.equal(toggle.textContent, "시작");
});

test("브라우저 이탈 방지(beforeunload): 타이머 실행 중일 때 preventDefault를 호출한다", async () => {
    const { display, toggle, statusMessage, listeners } = setupMockDom();

    const mockApi = {
        startTimer: async () => ({
            timerRunId: "run-unload",
            startedAt: new Date().toISOString()
        })
    };

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: mockApi,
        warnOnLeave: true
    });

    timer.init();

    const beforeUnloadHandlers = listeners["beforeunload"] || [];
    assert.ok(beforeUnloadHandlers.length > 0);

    // 아직 시작 전일 때 이벤트 발생
    let eventBefore = {
        defaultPrevented: false,
        returnValue: null,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
    beforeUnloadHandlers[0](eventBefore);
    assert.equal(eventBefore.defaultPrevented, false);

    // 시작 후 이벤트 발생
    await timer.start();

    let eventAfter = {
        defaultPrevented: false,
        returnValue: null,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
    beforeUnloadHandlers[0](eventAfter);
    assert.equal(eventAfter.defaultPrevented, true);

    timer.destroy();
});
