import { formatDuration } from "./utils.js";

const STUDY_DAY_START_HOUR = 7;
const STUDY_DAY_CLOSE_HOUR = 4;

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// 오전 7시 전 기록은 전날 학습일에 포함한다.
function getStudyDate(now = new Date()) {
    const studyDate = new Date(now);
    if (studyDate.getHours() < STUDY_DAY_START_HOUR) {
        studyDate.setDate(studyDate.getDate() - 1);
    }
    return formatDateKey(studyDate);
}

function getStudyDayCloseAt(studyDate) {
    const [year, month, day] = studyDate.split("-").map(Number);
    return new Date(year, month - 1, day + 1, STUDY_DAY_CLOSE_HOUR).getTime();
}

function isMaintenanceTime(now = new Date()) {
    const hour = now.getHours();
    return hour >= STUDY_DAY_CLOSE_HOUR && hour < STUDY_DAY_START_HOUR;
}

// 학습 타이머 생성
export function createTimer({
    display,
    toggle,
    statusMessage,
    api,
    onStart,
    onPause,
    onError
}) {
    let status = "idle";
    let currentTimerRunId = null;
    let startedAt = 0;
    let studyDate = getStudyDate();
    let tickId = null;
    let isTransitioning = false;

    function getElapsedSeconds(now = Date.now()) {
        if (status !== "running" || !startedAt) {
            return 0;
        }

        const cappedNow = Math.min(now, getStudyDayCloseAt(studyDate));
        return Math.max(0, Math.floor((cappedNow - startedAt) / 1000));
    }

    function setMaintenanceUi(maintenance) {
        if (!toggle) {
            return;
        }

        toggle.disabled = maintenance || isTransitioning;
        toggle.textContent = maintenance
            ? "이용 준비 중"
            : isTransitioning
                ? "처리 중..."
                : status === "running" ? "정지" : "시작";

        if (statusMessage) {
            statusMessage.textContent = maintenance
                ? "매일 04:00~07:00에는 학습일을 정리합니다."
                : "오늘의 학습 시간은 다음 날 04:00에 마감됩니다.";
        }
    }

    function synchronize(now = new Date()) {
        const nowMs = now.getTime();
        const currentStudyDate = getStudyDate(now);

        if (status === "running" && nowMs >= getStudyDayCloseAt(studyDate)) {
            stop("daily-close");
        }

        if (currentStudyDate !== studyDate && !isMaintenanceTime(now)) {
            studyDate = currentStudyDate;
        }

        setMaintenanceUi(isMaintenanceTime(now));
    }

    function render() {
        synchronize();
        const elapsed = getElapsedSeconds();
        const formattedTime = formatDuration(elapsed);

        if (display) {
            display.textContent = formattedTime;
            display.setAttribute("datetime", `PT${elapsed}S`);
        }

        document.title = isMaintenanceTime()
            ? "이용 준비 중 - Omagotchi"
            : `${formattedTime} - Omagotchi`;
    }

    async function syncWithServer() {
        if (!api?.getCurrentTimer) {
            return;
        }

        try {
            const res = await api.getCurrentTimer();
            if (res?.state === "RUNNING" && res?.timerRunId) {
                currentTimerRunId = res.timerRunId;
                status = "running";
                startedAt = res.startedAt ? new Date(res.startedAt).getTime() : Date.now();
                studyDate = getStudyDate(new Date(startedAt));
                setMaintenanceUi(isMaintenanceTime(new Date()));
                onStart?.({ restored: true });
                render();
            } else {
                status = "idle";
                currentTimerRunId = null;
                startedAt = 0;
                setMaintenanceUi(isMaintenanceTime(new Date()));
                render();
            }
        } catch (error) {
            console.error("타이머 상태 조회 실패:", error);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            setMaintenanceUi(isMaintenanceTime(new Date()));
            render();
        }
    }

    async function start() {
        const now = new Date();
        synchronize(now);
        if (isMaintenanceTime(now) || status === "running" || isTransitioning) {
            return;
        }

        if (!api?.startTimer) {
            onError?.(new Error("타이머 API가 설정되지 않았습니다."));
            return;
        }

        isTransitioning = true;
        setMaintenanceUi(false);

        try {
            const res = await api.startTimer();
            currentTimerRunId = res?.timerRunId;
            status = "running";
            startedAt = res?.startedAt ? new Date(res.startedAt).getTime() : now.getTime();
            studyDate = getStudyDate(new Date(startedAt));
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
            setMaintenanceUi(isMaintenanceTime(new Date()));
        }
    }

    async function stop(reason = "user") {
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
        setMaintenanceUi(false);

        try {
            await api.stopTimer(timerRunId);
            status = "idle";
            currentTimerRunId = null;
            startedAt = 0;
            onPause?.({ reason, elapsedSeconds: elapsed });
            render();
        } catch (error) {
            console.error("타이머 정지 실패:", error);
            onError?.(error);
        } finally {
            isTransitioning = false;
            setMaintenanceUi(isMaintenanceTime(new Date()));
        }
    }

    function init() {
        toggle?.addEventListener("click", () => {
            if (status === "running") {
                stop("user");
            } else {
                start();
            }
        });

        window.addEventListener("pagehide", () => {
            if (status === "running" && currentTimerRunId) {
                if (typeof api?.stopTimerKeepalive === "function") {
                    api.stopTimerKeepalive(currentTimerRunId);
                }
            }
        });

        tickId = window.setInterval(render, 1000);
        render();

        syncWithServer();
    }

    return {
        init,
        getElapsedSeconds,
        isRunning: () => status === "running",
        getTimerRunId: () => currentTimerRunId,
        syncWithServer,
        destroy: () => window.clearInterval(tickId)
    };
}
