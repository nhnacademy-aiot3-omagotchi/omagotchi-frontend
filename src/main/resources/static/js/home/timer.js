import { formatDuration } from "./utils.js";

/**
 * 학습 타이머 컨트롤러를 생성합니다.
 * learning-service의 타이머 API 계약에 기반하여 동작합니다.
 *
 * @param {object} options
 * @param {HTMLElement} [options.display] - 시간 표시 엘리먼트
 * @param {HTMLButtonElement} [options.toggle] - 시작/정지 토글 버튼
 * @param {HTMLElement} [options.statusMessage] - 상태 안내 메시지 엘리먼트
 * @param {object} [options.api] - 타이머 API 객체 (OmagotchiApi.study)
 * @param {boolean} [options.warnOnLeave=true] - 실행 중 브라우저 닫기/이동 시 beforeunload 경고 여부
 * @param {Function} [options.onStart] - 타이머 시작 시 콜백 ({ restored: boolean })
 * @param {Function} [options.onPause] - 타이머 정지 시 콜백 ({ elapsedSeconds: number })
 * @param {Function} [options.onDiscard] - 타이머 파기 완료 시 콜백
 * @param {Function} [options.onError] - 에러 발생 시 콜백 (error: Error)
 * @param {Function} [options.onRunningTimerDetected] - 복원 가능한 타이머 발견 시 사용자 확인 프롬프트 (Promise<"resume"|"discard"> 반환)
 */
export function createTimer({
    display,
    toggle,
    statusMessage,
    api,
    warnOnLeave = true,
    onStart,
    onPause,
    onDiscard,
    onError,
    onRunningTimerDetected
}) {
    let status = "idle";
    let currentTimerRunId = null;
    let startedAt = 0;
    let tickId = null;
    let isTransitioning = false;

    function getElapsedSeconds(now = Date.now()) {
        if (status !== "running" || !startedAt) {
            return 0;
        }
        return Math.max(0, Math.floor((now - startedAt) / 1000));
    }

    function updateToggleUi() {
        if (!toggle) {
            return;
        }

        toggle.disabled = isTransitioning;
        toggle.textContent = isTransitioning
            ? "처리 중..."
            : status === "running"
                ? "정지"
                : "시작";

        if (statusMessage) {
            statusMessage.textContent = status === "running"
                ? "학습이 진행 중입니다."
                : "";
        }
    }

    function render() {
        const elapsed = getElapsedSeconds();
        const formattedTime = formatDuration(elapsed);

        if (display) {
            display.textContent = formattedTime;
            display.setAttribute("datetime", `PT${elapsed}S`);
        }

        document.title = status === "running"
            ? `${formattedTime} - Omagotchi`
            : "Omagotchi";
    }

    function handleBeforeUnload(event) {
        if (warnOnLeave && status === "running") {
            event.preventDefault();
            event.returnValue = "";
        }
    }

    async function syncWithServer() {
        if (!api?.getCurrentTimer) {
            return;
        }

        try {
            const res = await api.getCurrentTimer();
            if (res?.state === "RUNNING" && res?.timerRunId) {
                const timerRunId = res.timerRunId;
                const serverStartedAt = res.startedAt ? new Date(res.startedAt).getTime() : Date.now();
                const elapsedSeconds = res.elapsedSeconds ?? Math.max(0, Math.floor((Date.now() - serverStartedAt) / 1000));

                let action = "resume";
                if (typeof onRunningTimerDetected === "function") {
                    action = await onRunningTimerDetected({
                        timerRunId,
                        startedAt: serverStartedAt,
                        elapsedSeconds
                    });
                }

                if (action === "discard") {
                    if (api.discardTimer) {
                        try {
                            await api.discardTimer(timerRunId);
                        } catch (discardError) {
                            console.error("타이머 파기 실패:", discardError);
                            onError?.(discardError);
                        }
                    }
                    status = "idle";
                    currentTimerRunId = null;
                    startedAt = 0;
                    updateToggleUi();
                    render();
                    onDiscard?.();
                    return;
                }

                // action === "resume"
                currentTimerRunId = timerRunId;
                status = "running";
                startedAt = serverStartedAt;
                updateToggleUi();
                onStart?.({ restored: true });
                render();
            } else {
                status = "idle";
                currentTimerRunId = null;
                startedAt = 0;
                updateToggleUi();
                render();
            }
        } catch (error) {
            console.error("타이머 상태 조회 실패:", error);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            updateToggleUi();
            render();
        }
    }

    async function start() {
        if (status === "running" || isTransitioning) {
            return;
        }

        if (!api?.startTimer) {
            onError?.(new Error("타이머 API가 설정되지 않았습니다."));
            return;
        }

        isTransitioning = true;
        updateToggleUi();

        try {
            const res = await api.startTimer();
            currentTimerRunId = res?.timerRunId;
            status = "running";
            startedAt = res?.startedAt ? new Date(res.startedAt).getTime() : Date.now();
            onStart?.({ restored: false });
            render();
        } catch (error) {
            console.error("타이머 시작 실패:", error);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            onError?.(error);
        } finally {
            isTransitioning = false;
            updateToggleUi();
        }
    }

    async function stop() {
        if (status !== "running" || !currentTimerRunId || isTransitioning) {
            return;
        }

        const timerRunId = currentTimerRunId;
        const elapsed = getElapsedSeconds();

        if (!api?.stopTimer) {
            onError?.(new Error("타이머 API가 설정되지 않았습니다."));
            return;
        }

        isTransitioning = true;
        updateToggleUi();

        try {
            await api.stopTimer(timerRunId);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            onPause?.({ elapsedSeconds: elapsed });
            render();
        } catch (error) {
            console.error("타이머 정지 실패:", error);
            onError?.(error);
        } finally {
            isTransitioning = false;
            updateToggleUi();
        }
    }

    async function discard() {
        if (!currentTimerRunId || isTransitioning) {
            return;
        }

        const timerRunId = currentTimerRunId;

        if (!api?.discardTimer) {
            onError?.(new Error("타이머 파기 API가 설정되지 않았습니다."));
            return;
        }

        isTransitioning = true;
        updateToggleUi();

        try {
            await api.discardTimer(timerRunId);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            onDiscard?.();
            render();
        } catch (error) {
            console.error("타이머 파기 실패:", error);
            onError?.(error);
        } finally {
            isTransitioning = false;
            updateToggleUi();
        }
    }

    function init() {
        toggle?.addEventListener("click", () => {
            if (status === "running") {
                stop();
            } else {
                start();
            }
        });

        if (warnOnLeave) {
            window.addEventListener("beforeunload", handleBeforeUnload);
        }

        tickId = window.setInterval(render, 1000);
        updateToggleUi();
        render();

        syncWithServer();
    }

    function destroy() {
        if (tickId) {
            window.clearInterval(tickId);
            tickId = null;
        }
        if (warnOnLeave) {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        }
    }

    return {
        init,
        getElapsedSeconds,
        isRunning: () => status === "running",
        getTimerRunId: () => currentTimerRunId,
        syncWithServer,
        start,
        stop,
        discard,
        destroy
    };
}
