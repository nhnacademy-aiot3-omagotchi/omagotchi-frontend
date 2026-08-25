import { escapeHtml, formatDuration } from "./utils.js";

const HEAT_THRESHOLDS = [2, 4, 6, 8].map((hours) => hours * 60 * 60);
const HEAT_LEGEND_LEVELS = [0, 1, 2, 3, 4, 5];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STUDY_DAY_START_HOUR = 4;
const MINUTE_MILLISECONDS = 60 * 1000;
const SEOUL_MINUTE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});
const SEOUL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});

function createId(prefix) {
    if (window.crypto?.randomUUID) {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseInstant(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseRecordedAt(record) {
    return parseInstant(record.endTime || record.recordedAt);
}

function getRecordStudySeconds(record) {
    const seconds = Number(record.studySeconds ?? record.durationSeconds);
    return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}

function getRecordTimeRange(record) {
    const endTime = parseInstant(record.endTime || record.recordedAt);
    const explicitStartTime = parseInstant(record.startTime);
    const startTime = explicitStartTime || (endTime
        ? new Date(endTime.getTime() - getRecordStudySeconds(record) * 1000)
        : null);

    return { startTime, endTime };
}

function formatMinuteTime(date) {
    if (!date) {
        return "시간 정보 없음";
    }

    return SEOUL_MINUTE_FORMATTER.format(date);
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
    return toDateKey(date).slice(0, 7);
}

function toStudyDateKey(date) {
    const localDateTime = formatDateTimeInput(date);
    const hour = Number(localDateTime.slice(11, 13));

    if (hour < STUDY_DAY_START_HOUR) {
        return formatDateTimeInput(new Date(date.getTime() - 24 * 60 * MINUTE_MILLISECONDS)).slice(0, 10);
    }

    return localDateTime.slice(0, 10);
}

function getRecordStudyDateKey(record) {
    const recordedAt = parseRecordedAt(record);
    const storedStudyDate = String(record.aggregationDate || record.studyDate || "");

    if (/^\d{4}-\d{2}-\d{2}$/.test(storedStudyDate)) {
        return storedStudyDate;
    }

    return recordedAt ? toStudyDateKey(recordedAt) : null;
}

function parseRecordStudyDate(record) {
    const dateKey = getRecordStudyDateKey(record);
    return parseStudyDateKey(dateKey);
}

function parseStudyDateKey(dateKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || "");

    if (!match) {
        return null;
    }

    const [, year, month, day] = match.map(Number);
    const date = new Date(year, month - 1, day, 12);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getCurrentStudyDate() {
    return parseStudyDateKey(toStudyDateKey(new Date())) || new Date();
}

function filterMonthlyRecords(records, referenceDate) {
    return records.filter((record) => {
        const studyDate = parseRecordStudyDate(record);

        return studyDate?.getFullYear() === referenceDate.getFullYear()
            && studyDate.getMonth() === referenceDate.getMonth();
    });
}

function formatPeriod(date) {
    const shortYear = String(date.getFullYear()).slice(-2).padStart(2, "0");
    return `${shortYear}년 ${date.getMonth() + 1}월`;
}

function formatPeriodLabel(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function moveMonth(date, amount) {
    const next = new Date(date);

    next.setDate(1);
    next.setMonth(next.getMonth() + amount);

    return next;
}

function sumDuration(records) {
    return records.reduce(
        (sum, record) => sum + getRecordStudySeconds(record),
        0
    );
}

function groupDailyTotals(records) {
    return records.reduce((totals, record) => {
        const key = getRecordStudyDateKey(record);

        if (!key) {
            return totals;
        }

        totals.set(key, (totals.get(key) || 0) + getRecordStudySeconds(record));
        return totals;
    }, new Map());
}

function getHeatLevel(seconds) {
    if (seconds <= 0) {
        return 0;
    }

    for (let index = HEAT_THRESHOLDS.length - 1; index >= 0; index -= 1) {
        if (seconds >= HEAT_THRESHOLDS[index]) {
            return index + 2;
        }
    }

    return 1;
}

function formatCalendarTime(seconds) {
    if (!seconds) {
        return "기록 없음";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours) {
        return `${hours}시간 ${minutes}분`;
    }

    return `${minutes}분`;
}

function getReadableDurationParts(totalSeconds) {
    const normalizedSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(normalizedSeconds / 3600);
    const minutes = Math.floor((normalizedSeconds % 3600) / 60);
    const seconds = normalizedSeconds % 60;
    const primary = [
        hours ? `${hours}시간` : "",
        minutes ? `${minutes}분` : ""
    ].filter(Boolean).join(" ") || "0분";

    return {
        primary,
        secondary: seconds ? `${seconds}초` : ""
    };
}

function formatReadableDuration(totalSeconds, { includeSeconds = false } = {}) {
    const { primary, secondary } = getReadableDurationParts(totalSeconds);
    return includeSeconds && secondary ? `${primary} ${secondary}` : primary;
}

function formatDateTimeInput(date) {
    if (!date) {
        return "";
    }

    const parts = Object.fromEntries(
        SEOUL_DATE_TIME_FORMATTER
            .formatToParts(date)
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, value])
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function formatTimeInput(date) {
    return date ? formatDateTimeInput(date).slice(11) : "";
}

function formatTimeTypingValue(value) {
    const sanitized = String(value || "").replace(/[^\d:]/g, "").slice(0, 5);
    if (sanitized.includes(":")) {
        const [hour = "", minute = ""] = sanitized.split(":");
        return `${hour.slice(0, 2)}:${minute.slice(0, 2)}`;
    }

    const digits = sanitized.replace(/\D/g, "").slice(0, 4);
    return digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function normalizeTimeInputValue(value, allowThreeDigits = true) {
    const text = String(value || "").trim();
    const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(text);
    const compactMatch = /^(\d{4})$/.exec(text)
        || (allowThreeDigits ? /^(\d{3})$/.exec(text) : null);
    const hourText = colonMatch?.[1]
        ?? (compactMatch?.[1].length === 3 ? compactMatch[1].slice(0, 1) : compactMatch?.[1].slice(0, 2));
    const minuteText = colonMatch?.[2] ?? compactMatch?.[1].slice(-2);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23
        || !Number.isInteger(minute) || minute < 0 || minute > 59) {
        return null;
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toSeoulInstant(dateTime) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime)) {
        return null;
    }

    const instant = new Date(`${dateTime}:00+09:00`);
    return Number.isNaN(instant.getTime()) ? null : instant;
}

function toStudyDayTimeInstant(time, aggregationDate, windowStart, windowEnd, field) {
    const normalizedTime = normalizeTimeInputValue(time);
    if (!normalizedTime
        || !/^\d{4}-\d{2}-\d{2}$/.test(aggregationDate)
        || !windowStart
        || !windowEnd) {
        return null;
    }

    const sameDate = new Date(`${aggregationDate}T${normalizedTime}:00+09:00`);
    if (Number.isNaN(sameDate.getTime())) {
        return null;
    }

    const { start: studyDayStart, end: studyDayEnd } = getStudyDayBounds(
        parseStudyDateKey(aggregationDate)
    );
    const candidates = [sameDate, new Date(sameDate.getTime() + 24 * 60 * MINUTE_MILLISECONDS)]
        .filter((candidate) => candidate >= studyDayStart && candidate <= studyDayEnd)
        .sort((left, right) => {
            const distance = (candidate) => {
                if (candidate < windowStart) return windowStart.getTime() - candidate.getTime();
                if (candidate > windowEnd) return candidate.getTime() - windowEnd.getTime();
                return 0;
            };
            const distanceDifference = distance(left) - distance(right);

            if (distanceDifference !== 0) {
                return distanceDifference;
            }

            return field === "end"
                ? right.getTime() - left.getTime()
                : left.getTime() - right.getTime();
        });

    return candidates[0] || null;
}

function floorToMinute(date) {
    return new Date(Math.floor(date.getTime() / MINUTE_MILLISECONDS) * MINUTE_MILLISECONDS);
}

function ceilToMinute(date) {
    return new Date(Math.ceil(date.getTime() / MINUTE_MILLISECONDS) * MINUTE_MILLISECONDS);
}

function getStudyDayBounds(referenceDate) {
    const dateKey = toDateKey(referenceDate);
    const start = new Date(`${dateKey}T04:00:00+09:00`);
    return {
        start,
        end: new Date(start.getTime() + 24 * 60 * MINUTE_MILLISECONDS)
    };
}

function getStudyDayInputLimit(referenceDate, now = new Date()) {
    const { start, end } = getStudyDayBounds(referenceDate);
    const currentMinute = floorToMinute(now);

    if (currentMinute <= start) {
        return start;
    }

    return currentMinute < end ? currentMinute : end;
}

function formatTimelinePoint(date, referenceDate) {
    const localDateTime = formatDateTimeInput(date);
    const dateKey = localDateTime.slice(0, 10);
    const time = localDateTime.slice(11);
    return dateKey === toDateKey(referenceDate) ? time : `익일 ${time}`;
}

function getSortedRecords(records) {
    return [...records].sort((left, right) => {
        const leftStart = getRecordTimeRange(left).startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightStart = getRecordTimeRange(right).startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftStart - rightStart;
    });
}

function createSlot(start, end, position) {
    if (!start || !end) {
        return null;
    }

    const roundedStart = ceilToMinute(start);
    const roundedEnd = floorToMinute(end);

    if (roundedEnd.getTime() - roundedStart.getTime() < MINUTE_MILLISECONDS) {
        return null;
    }

    return {
        start: roundedStart,
        end: roundedEnd,
        position,
        key: `${roundedStart.getTime()}-${roundedEnd.getTime()}`
    };
}

// 학습 기록의 계산, 저장, 편집 화면을 한 곳에서 관리한다.
export function createStudyRecords({ storageKey, getElapsedSeconds, api }) {
    const sessionId = createId("timer");
    let lastRecordedElapsed = null;
    let container = null;
    let referenceDate = getCurrentStudyDate();
    let monthlySummary = null;
    let loadErrorMessage = "";
    let actionErrorMessage = "";
    let editingRecordId = null;
    let pendingRecordId = null;
    let activeInsertSlot = null;
    let pendingInsertSlotKey = null;
    let loadRequestId = 0;

    function readRecords() {
        try {
            const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
            return Array.isArray(records) ? records : [];
        } catch {
            return [];
        }
    }

    function writeRecords(records) {
        localStorage.setItem(storageKey, JSON.stringify(records));
    }

    function replaceRecordsForDate(dateKey, records) {
        const retained = readRecords().filter((record) => (
            getRecordStudyDateKey(record) !== dateKey
        ));
        writeRecords([...retained, ...records]);
    }

    function getMonthlyTotals(records) {
        if (monthlySummary?.aggregationMonth === toMonthKey(referenceDate)) {
            return new Map((monthlySummary.dailyTotals || []).map((daily) => [
                daily.aggregationDate,
                Math.max(0, Number(daily.studySeconds) || 0)
            ]));
        }

        return groupDailyTotals(records);
    }

    function getMonthlyTotal(records) {
        if (monthlySummary?.aggregationMonth === toMonthKey(referenceDate)) {
            return Math.max(0, Number(monthlySummary.totalStudySeconds) || 0);
        }

        return sumDuration(records);
    }

    function getRecordedElapsedBaseline() {
        const currentStudyDate = toStudyDateKey(new Date());
        return readRecords().reduce((latest, record) => {
            const recordedAt = parseRecordedAt(record);
            const recordStudyDate = record.studyDate
                || (recordedAt ? toStudyDateKey(recordedAt) : null);
            const elapsedSeconds = Number(record.elapsedSeconds) || 0;
            return recordStudyDate === currentStudyDate
                ? Math.max(latest, elapsedSeconds)
                : latest;
        }, 0);
    }

    function getUnrecordedSeconds() {
        const elapsedSeconds = getElapsedSeconds();
        const recordedElapsed = Math.max(
            lastRecordedElapsed || 0,
            getRecordedElapsedBaseline()
        );
        return Math.max(0, elapsedSeconds - recordedElapsed);
    }

    async function loadRecords({ includeMonthly = true } = {}) {
        const monthKey = toMonthKey(referenceDate);
        const dateKey = toDateKey(referenceDate);
        const canLoadMonthly = includeMonthly && typeof api?.getMonthlySummary === "function";
        const canLoadDaily = typeof api?.getDailyRecords === "function";

        if (!canLoadMonthly && !canLoadDaily) {
            return;
        }

        const requestId = ++loadRequestId;
        const [monthlyResult, dailyResult] = await Promise.allSettled([
            canLoadMonthly ? api.getMonthlySummary(monthKey) : Promise.resolve(null),
            canLoadDaily ? api.getDailyRecords(dateKey) : Promise.resolve(null)
        ]);

        if (requestId !== loadRequestId) {
            return;
        }

        if (monthlyResult.status === "fulfilled" && monthlyResult.value) {
            monthlySummary = monthlyResult.value;
        }

        if (dailyResult.status === "fulfilled" && dailyResult.value) {
            const payload = dailyResult.value;
            const records = Array.isArray(payload) ? payload : payload.records;
            if (Array.isArray(records)) {
                replaceRecordsForDate(dateKey, records);
                lastRecordedElapsed = null;
            }
        }

        loadErrorMessage = monthlyResult.status === "rejected" || dailyResult.status === "rejected"
            ? "학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "";
        render();
    }

    function addRecord() {
        const elapsedSeconds = getElapsedSeconds();
        const recordedElapsed = Math.max(
            lastRecordedElapsed || 0,
            getRecordedElapsedBaseline()
        );
        const durationSeconds = elapsedSeconds - recordedElapsed;

        if (elapsedSeconds <= 0) {
            return { ok: false, message: "타이머를 먼저 시작해 주세요." };
        }

        if (durationSeconds <= 0) {
            return { ok: false, message: "같은 시간은 다시 기록할 수 없어요." };
        }

        const records = readRecords();
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - durationSeconds * 1000);
        const record = {
            id: createId("segment"),
            sessionId,
            aggregationDate: toStudyDateKey(startTime),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            studySeconds: durationSeconds,
            version: 0,
            elapsedSeconds,
            createdAt: endTime.toISOString(),
            updatedAt: endTime.toISOString()
        };

        records.push(record);
        writeRecords(records);
        if (typeof api?.createRecord === "function") {
            api.createRecord({
                startDateTime: formatDateTimeInput(startTime),
                endDateTime: formatDateTimeInput(endTime)
            }).then((saved) => {
                if (!saved?.id) return;
                const latest = readRecords().map((item) => (
                    item.id === record.id ? { ...item, ...saved } : item
                ));
                writeRecords(latest);
                monthlySummary = null;
                loadRecords();
            }).catch(() => {
                actionErrorMessage = "학습 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
                render();
            });
        }
        lastRecordedElapsed = elapsedSeconds;
        referenceDate = parseRecordStudyDate(record) || getCurrentStudyDate();
        monthlySummary = null;
        activeInsertSlot = null;
        render();

        return { ok: true, record };
    }

    function getRecordEditWindow(records, index) {
        const { start: dayStart } = getStudyDayBounds(referenceDate);
        const inputLimit = getStudyDayInputLimit(referenceDate);
        const previousRange = index > 0 ? getRecordTimeRange(records[index - 1]) : null;
        const nextRange = index < records.length - 1 ? getRecordTimeRange(records[index + 1]) : null;
        const windowStart = ceilToMinute(previousRange?.endTime || dayStart);
        const windowEnd = floorToMinute(nextRange?.startTime || inputLimit);

        return windowEnd.getTime() - windowStart.getTime() >= MINUTE_MILLISECONDS
            ? { start: windowStart, end: windowEnd }
            : null;
    }

    function clampTimeRange(start, end, windowStart, windowEnd, changedField = "start") {
        const latestStart = new Date(windowEnd.getTime() - MINUTE_MILLISECONDS);
        const earliestEnd = new Date(windowStart.getTime() + MINUTE_MILLISECONDS);
        let adjustedStart = new Date(Math.min(Math.max(start.getTime(), windowStart.getTime()), latestStart.getTime()));
        let adjustedEnd = new Date(Math.min(Math.max(end.getTime(), earliestEnd.getTime()), windowEnd.getTime()));

        if (adjustedEnd <= adjustedStart) {
            if (changedField === "end") {
                adjustedStart = new Date(Math.max(windowStart.getTime(), adjustedEnd.getTime() - MINUTE_MILLISECONDS));
            } else {
                adjustedEnd = new Date(Math.min(windowEnd.getTime(), adjustedStart.getTime() + MINUTE_MILLISECONDS));
                if (adjustedEnd <= adjustedStart) {
                    adjustedStart = new Date(adjustedEnd.getTime() - MINUTE_MILLISECONDS);
                }
            }
        }

        return { start: adjustedStart, end: adjustedEnd };
    }

    function renderTimeRangeFields({ startTime, endTime, windowStart, windowEnd, pending }) {
        const inputStart = toSeoulInstant(formatDateTimeInput(startTime)) || windowStart;
        const inputEnd = toSeoulInstant(formatDateTimeInput(endTime)) || windowEnd;
        const initialRange = clampTimeRange(inputStart, inputEnd, windowStart, windowEnd);
        const durationSeconds = Math.floor((initialRange.end.getTime() - initialRange.start.getTime()) / 1000);
        const rangeLabel = `${formatTimelinePoint(windowStart, referenceDate)} ~ ${formatTimelinePoint(windowEnd, referenceDate)}`;

        return `
            <fieldset ${pending ? "disabled" : ""}>
                <legend class="sr-only">학습 시간 입력</legend>
                <p class="study-time-window">
                    <span>입력 가능</span>
                    <strong>${escapeHtml(rangeLabel)}</strong>
                </p>
                <label>
                    <span>시작 시간 · 24시간</span>
                    <input type="text" inputmode="numeric" name="startDateTime"
                           data-study-time-input
                           value="${escapeHtml(formatTimeInput(initialRange.start))}"
                           placeholder="HH:mm" maxlength="5"
                           pattern="(?:[01]\\d|2[0-3]):[0-5]\\d" autocomplete="off" required>
                </label>
                <label>
                    <span>종료 시간 · 24시간</span>
                    <input type="text" inputmode="numeric" name="endDateTime"
                           data-study-time-input
                           value="${escapeHtml(formatTimeInput(initialRange.end))}"
                           placeholder="HH:mm" maxlength="5"
                           pattern="(?:[01]\\d|2[0-3]):[0-5]\\d" autocomplete="off" required>
                </label>
                <div class="study-time-draft-duration">
                    <span>예상 공부 시간</span>
                    <output data-study-record-draft-duration>${formatReadableDuration(durationSeconds, { includeSeconds: true })}</output>
                </div>
                <p class="study-time-feedback" data-study-time-feedback aria-live="polite"></p>
        `;
    }

    function renderRecordEditor(record, startTime, endTime, editWindow) {
        const isPending = pendingRecordId === String(record.id);

        return `
            <form class="study-record-edit study-time-range-form"
                  data-study-record-edit="${escapeHtml(record.id)}"
                  data-aggregation-date="${escapeHtml(toDateKey(referenceDate))}"
                  data-window-start="${editWindow.start.toISOString()}"
                  data-window-end="${editWindow.end.toISOString()}">
                ${renderTimeRangeFields({
                    startTime,
                    endTime,
                    windowStart: editWindow.start,
                    windowEnd: editWindow.end,
                    pending: isPending
                })}
                    <div class="study-record-edit-actions">
                        <button class="ui-button ui-button--secondary" type="button"
                                data-study-record-edit-cancel>취소</button>
                        <button class="ui-button ui-button--primary" type="submit">
                            ${isPending ? "저장 중" : "저장"}
                        </button>
                    </div>
                </fieldset>
            </form>
        `;
    }

    function renderRecord(record, records, index) {
        const studySeconds = getRecordStudySeconds(record);
        const durationParts = getReadableDurationParts(studySeconds);
        const { startTime, endTime } = getRecordTimeRange(record);
        const startLabel = formatMinuteTime(startTime);
        const endLabel = formatMinuteTime(endTime);
        const recordId = String(record.id);
        const isPending = pendingRecordId === recordId;
        const isEditing = editingRecordId === recordId;
        const editWindow = getRecordEditWindow(records, index);
        const canEdit = Boolean(editWindow);

        return `
            <article class="study-record study-timeline-entry" data-study-record-id="${escapeHtml(recordId)}">
                <span class="study-timeline-marker study-timeline-marker--record" aria-hidden="true"><i></i></span>
                <div class="study-record-content">
                    ${isEditing && canEdit ? renderRecordEditor(record, startTime, endTime, editWindow) : `
                    <div class="study-record-view" ${isPending ? "aria-busy=\"true\"" : ""}>
                        <div class="study-record-duration">
                            <span>공부 시간</span>
                            <p>
                                <strong>${durationParts.primary}</strong>
                                ${durationParts.secondary ? `<small>${durationParts.secondary}</small>` : ""}
                            </p>
                        </div>
                        <div class="study-record-details">
                            <span>학습 시간대</span>
                            <p class="study-record-range">
                                <time datetime="${startTime?.toISOString() || ""}">${startLabel}</time>
                                <span aria-hidden="true">–</span>
                                <time datetime="${endTime?.toISOString() || ""}">${endLabel}</time>
                            </p>
                        </div>
                        <div class="study-record-actions" aria-label="학습 기록 관리">
                            <button class="ui-button ui-button--secondary" type="button"
                                    data-study-record-edit-start
                                    ${isPending || !canEdit ? "disabled" : ""}
                                    ${!canEdit ? "title=\"인접 기록 사이에 분 단위 수정 공간이 없습니다.\"" : ""}>수정</button>
                            <button class="ui-button ui-button--danger" type="button"
                                    data-study-record-delete ${isPending ? "disabled" : ""}>
                                ${isPending ? "처리 중" : "삭제"}
                            </button>
                        </div>
                    </div>`}
                </div>
            </article>
        `;
    }

    function renderInsertSlot(slot) {
        const isActive = activeInsertSlot?.key === slot.key;
        const isPending = pendingInsertSlotKey === slot.key;
        const rangeLabel = `${formatTimelinePoint(slot.start, referenceDate)} ~ ${formatTimelinePoint(slot.end, referenceDate)}`;

        if (!isActive) {
            return `
                <div class="study-timeline-slot study-timeline-entry study-timeline-slot--${slot.position}"
                     data-study-timeline-slot="${slot.key}">
                    <span class="study-timeline-marker study-timeline-marker--add" aria-hidden="true"><i>＋</i></span>
                    <button type="button" data-study-record-insert="${slot.key}"
                            data-window-start="${slot.start.toISOString()}"
                            data-window-end="${slot.end.toISOString()}"
                            data-slot-position="${slot.position}"
                            aria-label="${escapeHtml(rangeLabel)} 사이에 학습 기록 추가">
                        <span class="study-timeline-slot-copy">
                            <strong>기록 추가</strong>
                            <small>${escapeHtml(rangeLabel)}</small>
                        </span>
                    </button>
                </div>
            `;
        }

        const draftStart = activeInsertSlot.start || slot.start;
        const draftEnd = activeInsertSlot.end || slot.end;

        return `
            <div class="study-timeline-slot study-timeline-entry is-editing" data-study-timeline-slot="${slot.key}">
                <span class="study-timeline-marker study-timeline-marker--add" aria-hidden="true"><i>＋</i></span>
                <form class="study-record-create study-time-range-form"
                      data-study-record-create="${slot.key}"
                      data-aggregation-date="${escapeHtml(toDateKey(referenceDate))}"
                      data-window-start="${slot.start.toISOString()}"
                      data-window-end="${slot.end.toISOString()}">
                    ${renderTimeRangeFields({
                        startTime: draftStart,
                        endTime: draftEnd,
                        windowStart: slot.start,
                        windowEnd: slot.end,
                        pending: isPending
                    })}
                        <div class="study-record-edit-actions">
                            <button class="ui-button ui-button--secondary" type="button"
                                    data-study-record-insert-cancel>취소</button>
                            <button class="ui-button ui-button--primary" type="submit">
                                ${isPending ? "저장 중" : "저장"}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        `;
    }

    function renderRecordTimeline(records, emptyMessage) {
        const sortedRecords = getSortedRecords(records);
        const { start: dayStart } = getStudyDayBounds(referenceDate);
        const inputLimit = getStudyDayInputLimit(referenceDate);
        const timeline = [];
        let cursor = dayStart;

        sortedRecords.forEach((record, index) => {
            const range = getRecordTimeRange(record);
            const slotEnd = range.startTime && range.startTime < inputLimit
                ? range.startTime
                : inputLimit;
            const slot = createSlot(cursor, slotEnd, index === 0 ? "top" : "between");

            if (slot) {
                timeline.push(renderInsertSlot(slot));
            }

            timeline.push(renderRecord(record, sortedRecords, index));
            if (range.endTime && range.endTime > cursor) {
                cursor = range.endTime;
            }
        });

        const lastSlot = createSlot(cursor, inputLimit, sortedRecords.length ? "bottom" : "only");
        if (lastSlot) {
            timeline.push(renderInsertSlot(lastSlot));
        }

        const emptyState = !sortedRecords.length
            ? `<div class="study-record-empty ui-state-message" role="status"><strong>${emptyMessage}</strong></div>`
            : "";

        return `<div class="study-record-list study-record-timeline">${emptyState}${timeline.join("")}</div>`;
    }

    function getInitialSlotDraft(start, end, position) {
        const oneHour = 60 * MINUTE_MILLISECONDS;

        if (position === "top") {
            return {
                start: new Date(Math.max(start.getTime(), end.getTime() - oneHour)),
                end
            };
        }

        return {
            start,
            end: new Date(Math.min(end.getTime(), start.getTime() + oneHour))
        };
    }

    function normalizeTimeRangeForm(form, changedInput = null, { allowThreeDigits = true } = {}) {
        const startInput = form.elements.namedItem("startDateTime");
        const endInput = form.elements.namedItem("endDateTime");
        const feedback = form.querySelector("[data-study-time-feedback]");
        const durationOutput = form.querySelector("[data-study-record-draft-duration]");
        const windowStart = parseInstant(form.dataset.windowStart);
        const windowEnd = parseInstant(form.dataset.windowEnd);
        const aggregationDate = form.dataset.aggregationDate;

        if (!(startInput instanceof HTMLInputElement)
            || !(endInput instanceof HTMLInputElement)
            || !windowStart
            || !windowEnd) {
            return null;
        }

        const startValue = normalizeTimeInputValue(startInput.value, allowThreeDigits);
        const endValue = normalizeTimeInputValue(endInput.value, allowThreeDigits);
        let start = toStudyDayTimeInstant(
            startValue,
            aggregationDate,
            windowStart,
            windowEnd,
            "start"
        );
        let end = toStudyDayTimeInstant(
            endValue,
            aggregationDate,
            windowStart,
            windowEnd,
            "end"
        );
        const originalStart = start?.getTime();
        const originalEnd = end?.getTime();
        if (!start || !end) {
            if (feedback) {
                feedback.textContent = "24시간 형식(HH:mm)으로 시작과 종료 시간을 입력해 주세요.";
            }
            return null;
        }

        ({ start, end } = clampTimeRange(
            start,
            end,
            windowStart,
            windowEnd,
            changedInput === endInput ? "end" : "start"
        ));

        const wasAdjusted = originalStart !== start.getTime() || originalEnd !== end.getTime();
        startInput.value = formatTimeInput(start);
        endInput.value = formatTimeInput(end);

        if (durationOutput) {
            durationOutput.textContent = formatReadableDuration(
                Math.floor((end.getTime() - start.getTime()) / 1000),
                { includeSeconds: true }
            );
        }
        if (feedback) {
            feedback.textContent = wasAdjusted ? "입력 가능한 시간 범위로 조정했습니다." : "";
        }

        if (form.matches("[data-study-record-create]") && activeInsertSlot) {
            activeInsertSlot = { ...activeInsertSlot, start, end };
        }

        return {
            start,
            end,
            startDateTime: formatDateTimeInput(start),
            endDateTime: formatDateTimeInput(end)
        };
    }

    async function createRecord(form) {
        const slotKey = form.dataset.studyRecordCreate;
        const timeRange = normalizeTimeRangeForm(form);

        if (!slotKey || !timeRange) {
            return;
        }

        pendingInsertSlotKey = slotKey;
        actionErrorMessage = "";
        render();

        try {
            const payload = {
                startDateTime: timeRange.startDateTime,
                endDateTime: timeRange.endDateTime
            };
            const saved = typeof api?.createRecord === "function"
                ? await api.createRecord(payload)
                : null;
            const now = new Date();
            const record = {
                id: createId("record"),
                aggregationDate: toStudyDateKey(timeRange.start),
                startTime: timeRange.start.toISOString(),
                endTime: timeRange.end.toISOString(),
                studySeconds: Math.floor((timeRange.end.getTime() - timeRange.start.getTime()) / 1000),
                version: 0,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                ...saved
            };

            writeRecords([...readRecords(), record]);
            referenceDate = parseStudyDateKey(record.aggregationDate) || referenceDate;
            monthlySummary = null;
            activeInsertSlot = null;
            pendingInsertSlotKey = null;
            render();
            await loadRecords();
        } catch (error) {
            pendingInsertSlotKey = null;
            actionErrorMessage = error?.message || "학습 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            render();
        }
    }

    function renderDaily(records) {
        const recordCountLabel = `기록 ${records.length}개`;

        return `
            <section class="study-day-detail ui-menu-section" aria-label="선택 날짜의 학습 기록">
                <header>
                    <div>
                        <span>선택한 날짜</span>
                        <h3>
                            ${referenceDate.getMonth() + 1}월 ${referenceDate.getDate()}일
                            <small>${recordCountLabel}</small>
                        </h3>
                    </div>
                    <div class="study-section-total">
                        <span>총 공부 시간</span>
                        <strong>${formatReadableDuration(sumDuration(records))}</strong>
                    </div>
                </header>
                ${renderRecordTimeline(records, "선택한 날짜에 기록이 없습니다.")}
            </section>
        `;
    }

    function renderMonthly(records) {
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        const totals = getMonthlyTotals(records);
        const selectedKey = toDateKey(referenceDate);
        const selectedRecords = records.filter((record) => (
            getRecordStudyDateKey(record) === selectedKey
        ));
        const periodLabel = formatPeriodLabel(referenceDate);
        const periodText = formatPeriod(referenceDate);
        const cells = [];

        for (let index = 0; index < firstDay; index += 1) {
            cells.push(`<li class="study-calendar-empty" aria-hidden="true"></li>`);
        }

        for (let day = 1; day <= lastDate; day += 1) {
            const date = new Date(year, month, day);
            const key = toDateKey(date);
            const seconds = totals.get(key) || 0;
            const weekday = date.getDay();
            const isSelected = key === selectedKey;
            const isToday = key === toStudyDateKey(new Date());

            cells.push(`
                <li>
                    <button type="button"
                            class="study-calendar-day heat-${getHeatLevel(seconds)}
                                   ${isSelected ? "is-selected" : ""}
                                   ${isToday ? "is-today" : ""}
                                   ${weekday === 0 ? "is-sunday" : ""}
                                   ${weekday === 6 ? "is-saturday" : ""}"
                            data-study-calendar-day="${key}"
                            aria-pressed="${isSelected}"
                            aria-label="${month + 1}월 ${day}일, ${formatCalendarTime(seconds)}">
                        <span>${day}</span>
                        <strong>${seconds ? formatDuration(seconds).slice(0, 5) : "—"}</strong>
                    </button>
                </li>
            `);
        }

        return `
            <div class="study-month-layout">
                <section class="study-calendar ui-menu-section" aria-label="${year}년 ${month + 1}월 학습 달력">
                    <header>
                        <div>
                            <span>월간 학습</span>
                            <h3>날짜별 공부 시간</h3>
                        </div>
                        <div class="study-calendar-overview">
                            <div class="study-section-total">
                                <span>이달의 공부</span>
                                <strong>${formatReadableDuration(getMonthlyTotal(records))}</strong>
                            </div>
                            <div class="study-period-navigation" role="group" aria-label="조회 기간 이동">
                                <button class="ui-button ui-button--secondary" type="button" data-study-period-move="-1" aria-label="이전 달">←</button>
                                <strong title="${escapeHtml(periodLabel)}">
                                    <span aria-hidden="true">${escapeHtml(periodText)}</span>
                                    <span class="sr-only">${escapeHtml(periodLabel)}</span>
                                </strong>
                                <button class="ui-button ui-button--soft" type="button" data-study-period-today>오늘</button>
                                <button class="ui-button ui-button--secondary" type="button" data-study-period-move="1" aria-label="다음 달">→</button>
                            </div>
                        </div>
                    </header>
                    <p class="study-calendar-guide">공부 시간이 길수록 진한 색으로 표시됩니다.</p>
                    <ol class="study-calendar-weekdays" aria-hidden="true">
                        ${WEEKDAYS.map((day, index) => `
                            <li class="${index === 0 ? "is-sunday" : index === 6 ? "is-saturday" : ""}">${day}</li>
                        `).join("")}
                    </ol>
                    <ol class="study-calendar-grid">${cells.join("")}</ol>
                    <div class="study-heat-legend" aria-label="학습 시간 색상 범례">
                        <span>0시간</span>
                        ${HEAT_LEGEND_LEVELS.map((level) => `<i class="heat-${level}" aria-hidden="true"></i>`).join("")}
                        <span>8시간 이상</span>
                    </div>
                </section>
                ${renderDaily(selectedRecords)}
            </div>
        `;
    }

    async function updateRecord(form) {
        const recordId = form.dataset.studyRecordEdit;
        const record = readRecords().find((item) => String(item.id) === recordId);
        if (!record) {
            return;
        }

        const timeRange = normalizeTimeRangeForm(form);

        if (!timeRange) {
            return;
        }

        pendingRecordId = recordId;
        actionErrorMessage = "";
        render();

        try {
            const payload = {
                startDateTime: timeRange.startDateTime,
                endDateTime: timeRange.endDateTime,
                expectedVersion: Math.max(0, Number(record.version) || 0)
            };
            const saved = typeof api?.updateRecord === "function"
                ? await api.updateRecord(record.id, payload)
                : null;
            const updated = {
                ...record,
                aggregationDate: toStudyDateKey(timeRange.start),
                startTime: timeRange.start.toISOString(),
                endTime: timeRange.end.toISOString(),
                studySeconds: Math.floor((timeRange.end.getTime() - timeRange.start.getTime()) / 1000),
                ...saved
            };
            writeRecords(readRecords().map((item) => (
                String(item.id) === recordId ? updated : item
            )));
            referenceDate = parseStudyDateKey(updated.aggregationDate) || referenceDate;
            monthlySummary = null;
            editingRecordId = null;
            pendingRecordId = null;
            render();
            await loadRecords();
        } catch (error) {
            pendingRecordId = null;
            actionErrorMessage = error?.message || "학습 기록을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            render();
        }
    }

    async function deleteRecord(recordId) {
        const record = readRecords().find((item) => String(item.id) === recordId);
        if (!record || !window.confirm("이 학습 기록을 삭제할까요?")) {
            return;
        }

        pendingRecordId = recordId;
        actionErrorMessage = "";
        render();

        try {
            if (typeof api?.deleteRecord === "function") {
                await api.deleteRecord(record.id, Math.max(0, Number(record.version) || 0));
            }
            writeRecords(readRecords().filter((item) => String(item.id) !== recordId));
            monthlySummary = null;
            editingRecordId = null;
            activeInsertSlot = null;
            pendingRecordId = null;
            render();
            await loadRecords();
        } catch (error) {
            pendingRecordId = null;
            actionErrorMessage = error?.message || "학습 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            render();
        }
    }

    function render() {
        if (!container) {
            return;
        }

        const records = readRecords();
        const monthlyRecords = filterMonthlyRecords(records, referenceDate);

        container.innerHTML = `
            <section class="study-records" aria-label="학습 기록" data-ui-state="ready">
                ${loadErrorMessage
                    ? `<p class="study-record-load-error" role="status">${escapeHtml(loadErrorMessage)}</p>`
                    : ""}
                ${actionErrorMessage
                    ? `<p class="study-record-action-error" role="alert">${escapeHtml(actionErrorMessage)}</p>`
                    : ""}
                ${renderMonthly(monthlyRecords)}
            </section>
        `;

    }

    function mount(target) {
        container = target;
        render();
    }

    function handleClick(event) {
        const periodButton = event.target.closest("[data-study-period-move]");
        const todayButton = event.target.closest("[data-study-period-today]");
        const calendarDay = event.target.closest("[data-study-calendar-day]");
        const editButton = event.target.closest("[data-study-record-edit-start]");
        const cancelButton = event.target.closest("[data-study-record-edit-cancel]");
        const deleteButton = event.target.closest("[data-study-record-delete]");
        const insertButton = event.target.closest("[data-study-record-insert]");
        const insertCancelButton = event.target.closest("[data-study-record-insert-cancel]");
        const recordElement = event.target.closest("[data-study-record-id]");

        if (insertButton) {
            const start = parseInstant(insertButton.dataset.windowStart);
            const end = parseInstant(insertButton.dataset.windowEnd);

            if (start && end) {
                const draft = getInitialSlotDraft(start, end, insertButton.dataset.slotPosition);
                activeInsertSlot = {
                    key: insertButton.dataset.studyRecordInsert,
                    ...draft
                };
                editingRecordId = null;
                actionErrorMessage = "";
                render();
            }
            return true;
        }

        if (insertCancelButton) {
            activeInsertSlot = null;
            actionErrorMessage = "";
            render();
            return true;
        }

        if (editButton && recordElement) {
            editingRecordId = recordElement.dataset.studyRecordId;
            activeInsertSlot = null;
            actionErrorMessage = "";
            render();
            return true;
        }

        if (cancelButton) {
            editingRecordId = null;
            actionErrorMessage = "";
            render();
            return true;
        }

        if (deleteButton && recordElement) {
            void deleteRecord(recordElement.dataset.studyRecordId);
            return true;
        }

        if (periodButton) {
            referenceDate = moveMonth(referenceDate, Number(periodButton.dataset.studyPeriodMove));
            monthlySummary = null;
            editingRecordId = null;
            activeInsertSlot = null;
            render();
            void loadRecords();
            return true;
        }

        if (todayButton) {
            referenceDate = getCurrentStudyDate();
            monthlySummary = null;
            editingRecordId = null;
            activeInsertSlot = null;
            render();
            void loadRecords();
            return true;
        }

        if (calendarDay) {
            const [year, month, day] = calendarDay.dataset.studyCalendarDay
                .split("-")
                .map(Number);
            referenceDate = new Date(year, month - 1, day);
            editingRecordId = null;
            activeInsertSlot = null;
            render();
            void loadRecords({ includeMonthly: monthlySummary?.aggregationMonth !== toMonthKey(referenceDate) });
            return true;
        }

        return false;
    }

    return {
        addRecord,
        getUnrecordedSeconds,
        mount: (target) => {
            mount(target);
            loadRecords();
        },
        handleClick,
        handleInput: (event) => {
            const input = event.target.closest(".study-time-range-form [data-study-time-input]");
            const form = input?.closest(".study-time-range-form");

            if (!input || !form) {
                return false;
            }

            input.value = formatTimeTypingValue(input.value);
            normalizeTimeRangeForm(form, input, { allowThreeDigits: false });
            return true;
        },
        handleSubmit: (event) => {
            const createForm = event.target.closest("[data-study-record-create]");
            const editForm = event.target.closest("[data-study-record-edit]");

            if (createForm) {
                event.preventDefault();
                void createRecord(createForm);
                return true;
            }

            const form = editForm;
            if (!form) {
                return false;
            }

            event.preventDefault();
            void updateRecord(form);
            return true;
        }
    };
}
