import { formatDuration } from "./utils.js";

const TIMER_STATE_VERSION = 1;
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

function readState(storageKey) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved?.version !== TIMER_STATE_VERSION) {
            return null;
        }
        return saved;
    } catch {
        return null;
    }
}

// 학습 타이머 생성
export function createTimer({
    display,
    toggle,
    statusMessage,
    storageKey,
    onStart,
    onPause
}) {
    let status = "idle";
    let studyDate = getStudyDate();
    let startedAt = 0;
    let elapsedBeforeStart = 0;
    let tickId = null;

    function getElapsedSeconds(now = Date.now()) {
        if (status !== "running") {
            return elapsedBeforeStart;
        }

        const cappedNow = Math.min(now, getStudyDayCloseAt(studyDate));
        return elapsedBeforeStart + Math.max(0, Math.floor((cappedNow - startedAt) / 1000));
    }

    function saveState(now = Date.now()) {
        const elapsedSeconds = getElapsedSeconds(now);
        localStorage.setItem(storageKey, JSON.stringify({
            version: TIMER_STATE_VERSION,
            studyDate,
            status,
            elapsedSeconds,
            startedAt: status === "running" ? now : null,
            updatedAt: now
        }));
    }

    function setMaintenanceUi(maintenance) {
        if (!toggle) {
            return;
        }

        toggle.disabled = maintenance;
        toggle.textContent = maintenance
            ? "이용 준비 중"
            : status === "running" ? "정지" : "시작";

        if (statusMessage) {
            statusMessage.textContent = maintenance
                ? "매일 04:00~07:00에는 학습일을 정리합니다."
                : "오늘의 학습 시간은 다음 날 04:00에 마감됩니다.";
        }
    }

    function stop(reason = "user", now = Date.now()) {
        elapsedBeforeStart = getElapsedSeconds(now);
        status = "idle";
        startedAt = 0;
        saveState(now);
        setMaintenanceUi(isMaintenanceTime(new Date(now)));
        onPause?.({ reason, elapsedSeconds: elapsedBeforeStart });
    }

    function synchronize(now = new Date()) {
        const nowMs = now.getTime();
        const currentStudyDate = getStudyDate(now);

        if (status === "running" && nowMs >= getStudyDayCloseAt(studyDate)) {
            stop("daily-close", getStudyDayCloseAt(studyDate));
        }

        if (currentStudyDate !== studyDate && !isMaintenanceTime(now)) {
            studyDate = currentStudyDate;
            status = "idle";
            startedAt = 0;
            elapsedBeforeStart = 0;
            saveState(nowMs);
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

    function start() {
        const now = new Date();
        synchronize(now);
        if (isMaintenanceTime(now) || status === "running") {
            return;
        }

        status = "running";
        startedAt = now.getTime();
        saveState(startedAt);
        setMaintenanceUi(false);
        onStart?.({ restored: false });
        render();
    }

    function restore() {
        const now = new Date();
        const saved = readState(storageKey);
        studyDate = getStudyDate(now);

        if (!saved || saved.studyDate !== studyDate) {
            saveState(now.getTime());
            return;
        }

        elapsedBeforeStart = Math.max(0, Number(saved.elapsedSeconds) || 0);

        if (saved.status !== "running") {
            return;
        }

        const savedStartedAt = Number(saved.startedAt) || Number(saved.updatedAt) || now.getTime();
        const cappedNow = Math.min(now.getTime(), getStudyDayCloseAt(studyDate));
        elapsedBeforeStart += Math.max(0, Math.floor((cappedNow - savedStartedAt) / 1000));

        if (now.getTime() >= getStudyDayCloseAt(studyDate) || isMaintenanceTime(now)) {
            status = "idle";
            saveState(now.getTime());
            return;
        }

        status = "running";
        startedAt = now.getTime();
        saveState(startedAt);
        onStart?.({ restored: true });
    }

    function init() {
        restore();

        toggle?.addEventListener("click", () => {
            if (status === "running") {
                stop("user");
            } else {
                start();
            }
        });

        const persist = () => saveState();
        window.addEventListener("pagehide", persist);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                persist();
            }
        });

        tickId = window.setInterval(render, 1000);
        render();
    }

    return {
        init,
        getElapsedSeconds,
        isRunning: () => status === "running",
        destroy: () => window.clearInterval(tickId)
    };
}
