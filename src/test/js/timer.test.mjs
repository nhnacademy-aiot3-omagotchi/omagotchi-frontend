import assert from "node:assert/strict";
import test from "node:test";

import { createTimer } from "../../main/resources/static/js/home/timer.js";
import { promptResumeTimer } from "../../main/resources/static/js/home/timerPrompt.js";


function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

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

test("초기 서버 상태 확인 중에는 시작할 수 없고 확인 완료 뒤 활성화한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();
    const currentTimer = deferred();
    let startCalls = 0;

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: {
            getCurrentTimer: () => currentTimer.promise,
            startTimer: async () => {
                startCalls += 1;
                return {
                    timerRunId: "new-run-after-sync",
                    startedAt: new Date().toISOString()
                };
            }
        }
    });

    const initialization = timer.init();
    assert.equal(toggle.disabled, true);
    assert.equal(toggle.textContent, "확인 중...");

    await timer.start();
    assert.equal(startCalls, 0);

    currentTimer.resolve({ state: "IDLE" });
    await initialization;
    assert.equal(toggle.disabled, false);
    assert.equal(toggle.textContent, "시작");

    await timer.start();
    assert.equal(startCalls, 1);
    assert.equal(timer.isRunning(), true);
    timer.destroy();
});

test("초기 서버 상태 확인 실패를 idle로 간주하지 않고 시작 버튼을 차단한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();
    let startCalls = 0;
    let reportedError = null;

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: {
            getCurrentTimer: async () => {
                throw new Error("timer lookup failed");
            },
            startTimer: async () => {
                startCalls += 1;
            }
        },
        onError: (error) => {
            reportedError = error;
        }
    });

    await timer.init();
    assert.equal(toggle.disabled, true);
    assert.equal(toggle.textContent, "새로고침 필요");
    assert.match(statusMessage.textContent, /새로고침/);
    assert.equal(reportedError?.message, "timer lookup failed");

    await timer.start();
    assert.equal(startCalls, 0);
    timer.destroy();
});

test("시작 경합으로 TIMER_ALREADY_RUNNING을 받으면 현재 타이머를 다시 조회해 복구한다", async () => {
    const { display, toggle, statusMessage } = setupMockDom();
    let currentCalls = 0;
    let restored = null;
    let reportedError = null;

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: {
            getCurrentTimer: async () => {
                currentCalls += 1;
                if (currentCalls === 1) {
                    return { state: "IDLE" };
                }
                return {
                    state: "RUNNING",
                    timerRunId: "concurrent-run",
                    startedAt: new Date(Date.now() - 30000).toISOString(),
                    elapsedSeconds: 30
                };
            },
            startTimer: async () => {
                throw Object.assign(new Error("already running"), {
                    status: 409,
                    code: "TIMER_ALREADY_RUNNING"
                });
            }
        },
        onRunningTimerDetected: async () => "resume",
        onStart: ({ restored: wasRestored }) => {
            restored = wasRestored;
        },
        onError: (error) => {
            reportedError = error;
        }
    });

    await timer.syncWithServer();
    await timer.start();

    assert.equal(currentCalls, 2);
    assert.equal(timer.isRunning(), true);
    assert.equal(timer.getTimerRunId(), "concurrent-run");
    assert.equal(restored, true);
    assert.equal(reportedError, null);
});

test("서버 복구형 타이머는 페이지 이동을 막는 beforeunload를 등록하지 않는다", () => {
    const { display, toggle, statusMessage, listeners } = setupMockDom();

    const timer = createTimer({
        display,
        toggle,
        statusMessage,
        api: {}
    });

    timer.init();
    assert.deepEqual(listeners["beforeunload"] || [], []);
    timer.destroy();
});

test("타이머 복구 선택은 native modal에서 처리하고 배경으로 click을 전파하지 않는다", async () => {
    const resumeButton = {
        focused: false,
        closest(selector) {
            return selector === "[data-timer-resume]" ? this : null;
        },
        focus() {
            this.focused = true;
        }
    };
    const discardButton = {
        closest(selector) {
            return selector === "[data-timer-discard]" ? this : null;
        }
    };
    const handlers = {};
    const dialog = {
        className: "",
        dataset: {},
        open: false,
        removed: false,
        attributes: {},
        addEventListener(type, handler) {
            handlers[type] = handler;
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
            if (name === "open") this.open = true;
        },
        querySelector(selector) {
            if (selector === "[data-timer-resume]") return resumeButton;
            if (selector === "[data-timer-discard]") return discardButton;
            return null;
        },
        showModal() {
            this.open = true;
        },
        close() {
            this.open = false;
        },
        remove() {
            this.removed = true;
        }
    };
    const documentRef = {
        createElement(tagName) {
            assert.equal(tagName, "dialog");
            return dialog;
        },
        body: {
            append(node) {
                assert.equal(node, dialog);
            }
        }
    };

    const result = promptResumeTimer({}, { documentRef });
    assert.equal(dialog.open, true);
    assert.equal(resumeButton.focused, true);

    let defaultPrevented = false;
    let propagationStopped = false;
    handlers.click({
        target: resumeButton,
        preventDefault() {
            defaultPrevented = true;
        },
        stopPropagation() {
            propagationStopped = true;
        }
    });

    assert.equal(await result, "resume");
    assert.equal(defaultPrevented, true);
    assert.equal(propagationStopped, true);
    assert.equal(dialog.removed, true);
});
