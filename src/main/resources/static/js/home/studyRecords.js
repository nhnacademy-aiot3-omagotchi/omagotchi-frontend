import { escapeHtml, formatDuration } from "./utils.js";

const HEAT_THRESHOLDS = [2, 4, 6, 8].map((hours) => hours * 60 * 60);
const HEAT_LEGEND_LEVELS = [0, 1, 2, 3, 4, 5];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_LONG = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const STUDY_DAY_START_HOUR = 7;

function createId(prefix) {
    if (window.crypto?.randomUUID) {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseTags(value) {
    return [...new Set(
        String(value || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
    )].slice(0, 5);
}

function parseRecordedAt(record) {
    const date = new Date(record.recordedAt);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toStudyDateKey(date) {
    const studyDate = new Date(date);
    if (studyDate.getHours() < STUDY_DAY_START_HOUR) {
        studyDate.setDate(studyDate.getDate() - 1);
    }
    return toDateKey(studyDate);
}

function getRecordStudyDateKey(record) {
    const recordedAt = parseRecordedAt(record);
    const storedStudyDate = String(record.studyDate || "");

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

function filterRecords(records, viewMode, referenceDate) {
    return records.filter((record) => {
        const studyDate = parseRecordStudyDate(record);

        if (!studyDate || studyDate.getFullYear() !== referenceDate.getFullYear()) {
            return false;
        }

        if (viewMode === "yearly") {
            return true;
        }

        if (studyDate.getMonth() !== referenceDate.getMonth()) {
            return false;
        }

        return viewMode === "monthly" || isSameDay(studyDate, referenceDate);
    });
}

function formatPeriod(viewMode, date) {
    const shortYear = String(date.getFullYear()).slice(-2).padStart(2, "0");

    if (viewMode === "yearly") {
        return `${shortYear}년`;
    }

    if (viewMode === "monthly") {
        return `${shortYear}년 ${date.getMonth() + 1}월`;
    }

    return `${shortYear}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}`;
}

function formatPeriodLabel(viewMode, date) {
    if (viewMode === "yearly") {
        return `${date.getFullYear()}년`;
    }

    if (viewMode === "monthly") {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }

    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS_LONG[date.getDay()]}`;
}

function movePeriod(viewMode, date, amount) {
    const next = new Date(date);

    if (viewMode === "yearly") {
        next.setFullYear(next.getFullYear() + amount);
    } else if (viewMode === "monthly") {
        next.setDate(1);
        next.setMonth(next.getMonth() + amount);
    } else {
        next.setDate(next.getDate() + amount);
    }

    return next;
}

function sumDuration(records) {
    return records.reduce(
        (sum, record) => sum + (Number(record.durationSeconds) || 0),
        0
    );
}

function groupDailyTotals(records) {
    return records.reduce((totals, record) => {
        const key = getRecordStudyDateKey(record);

        if (!key) {
            return totals;
        }

        totals.set(key, (totals.get(key) || 0) + (Number(record.durationSeconds) || 0));
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

function createMonthTotals(records) {
    const totals = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        seconds: 0
    }));

    records.forEach((record) => {
        const date = parseRecordStudyDate(record);

        if (date) {
            totals[date.getMonth()].seconds += Number(record.durationSeconds) || 0;
        }
    });

    return totals;
}

// 구간 기록의 계산, 저장, 편집 화면을 한 곳에서 관리한다.
export function createStudyRecords({ storageKey, getElapsedSeconds, api }) {
    const sessionId = createId("timer");
    let lastRecordedElapsed = null;
    let editingId = null;
    let container = null;
    let viewMode = "daily";
    let referenceDate = getCurrentStudyDate();
    let loadErrorMessage = "";
    // [API-REPLACE] 학습 기록 목록 조회 API로 교체
    function readRecords() {
        try {
            const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
            return Array.isArray(records) ? records : [];
        } catch {
            return [];
        }
    }
    // [API-REPLACE] 학습 기록 생성 수정 API로 교체
    function writeRecords(records) {
        localStorage.setItem(storageKey, JSON.stringify(records));
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

    async function loadRecords() {
        try {
            const records = await api?.list?.();
            if (!Array.isArray(records)) return;

            writeRecords(records);
            lastRecordedElapsed = null;
            loadErrorMessage = "";
            render();
        } catch {
            loadErrorMessage = "학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
            render();
        }
    }
    // [API-REPLACE] ID 순서 기록 시각은 서버가 최종 결정하도록 변경
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
        const sequence = records.filter((record) => record.sessionId === sessionId).length + 1;
        const now = new Date().toISOString();
        const record = {
            id: createId("segment"),
            sessionId,
            sequence,
            name: `${sequence}`,
            tags: [],
            durationSeconds,
            elapsedSeconds,
            studyDate: toStudyDateKey(new Date(now)),
            recordedAt: now,
            updatedAt: now
        };

        records.push(record);
        writeRecords(records);
        api?.create?.(record).then((saved) => {
            if (!saved?.id || saved.id === record.id) return;
            const latest = readRecords().map((item) => item.id === record.id ? { ...item, ...saved } : item);
            writeRecords(latest);
            render();
        });
        lastRecordedElapsed = elapsedSeconds;
        editingId = null;
        viewMode = "daily";
        referenceDate = parseRecordStudyDate(record) || getCurrentStudyDate();
        render();

        return { ok: true, record };
    }

    function renderRecord(record) {
        const isEditing = editingId === record.id;
        const duration = formatDuration(record.durationSeconds);
        const elapsed = formatDuration(record.elapsedSeconds);
        const segmentTime = record.sequence === 1 ? duration : `+${duration}`;
        const tags = record.tags?.length
            ? `<ul class="study-record-tags" aria-label="태그">
                ${record.tags.map((tag) => `<li>#${escapeHtml(tag)}</li>`).join("")}
            </ul>`
            : `<span class="study-record-no-tag">태그 없음</span>`;

        return `
            <li class="study-record${isEditing ? " is-editing" : ""}" data-study-record-id="${record.id}">
                <div class="study-record-sequence" aria-label="${record.sequence}번째 구간">
                    ${record.sequence}
                </div>
                <div class="study-record-content">
                    <div class="study-record-view">
                        <header>
                            <div>
                                <h3>${escapeHtml(record.name)}</h3>
                                ${tags}
                            </div>
                            <div class="study-record-time">
                                <strong>${segmentTime}</strong>
                                <span>누적 ${elapsed}</span>
                            </div>
                        </header>
                        <button type="button" data-study-record-edit="${record.id}">수정</button>
                    </div>
                    <form class="study-record-edit" data-study-record-form="${record.id}">
                        <label>
                            <span>구간 이름</span>
                            <input name="name" type="text" maxlength="40" value="${escapeHtml(record.name)}" required />
                        </label>
                        <label>
                            <span>태그</span>
                            <input name="tags" type="text" maxlength="100"
                                   value="${escapeHtml((record.tags || []).join(", "))}"
                                   placeholder="예: Java, API 명세" />
                            <small>쉼표로 구분하며 최대 5개까지 저장됩니다.</small>
                        </label>
                        <div>
                            <button type="button" data-study-record-cancel>취소</button>
                            <button type="submit">저장</button>
                        </div>
                    </form>
                </div>
            </li>
        `;
    }

    function renderRecordList(records, emptyMessage) {
        if (!records.length) {
            return `
                <div class="study-record-empty">
                    <strong>${emptyMessage}</strong>
                    <p>홈에서 타이머를 시작하고 정지를 누르면 학습 기록이 저장됩니다.</p>
                </div>
            `;
        }

        return `<ol class="study-record-list">${records.map(renderRecord).join("")}</ol>`;
    }

    function renderDaily(records) {
        return `
            <section class="study-day-detail" aria-label="선택 날짜의 구간 기록">
                <header>
                    <div>
                        <span>DAILY LOG</span>
                        <h3>${referenceDate.getMonth() + 1}월 ${referenceDate.getDate()}일 구간 기록</h3>
                    </div>
                    <strong>${formatDuration(sumDuration(records))}</strong>
                </header>
                ${renderRecordList(records, "이 날짜에는 저장된 구간이 없습니다.")}
            </section>
        `;
    }

    function renderMonthly(records) {
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        const totals = groupDailyTotals(records);
        const selectedKey = toDateKey(referenceDate);
        const selectedRecords = records.filter((record) => (
            getRecordStudyDateKey(record) === selectedKey
        ));
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
                <section class="study-calendar" aria-label="${year}년 ${month + 1}월 학습 달력">
                    <header>
                        <div>
                            <span>MONTHLY HEATMAP</span>
                            <h3>날짜별 학습 시간</h3>
                        </div>
                        <p>공부 시간이 길수록 진한 색으로 표시됩니다.</p>
                    </header>
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
                <section class="study-selected-day" aria-label="선택 날짜 기록">
                    <header>
                        <div>
                            <span>SELECTED DAY</span>
                            <h3>${month + 1}월 ${referenceDate.getDate()}일</h3>
                        </div>
                        <strong>${formatDuration(sumDuration(selectedRecords))}</strong>
                    </header>
                    ${renderRecordList(selectedRecords, "선택한 날짜에는 기록이 없습니다.")}
                </section>
            </div>
        `;
    }

    function renderYearly(records) {
        const monthTotals = createMonthTotals(records);
        const dailyTotals = groupDailyTotals(records);
        const totalSeconds = sumDuration(records);
        const activeDays = [...dailyTotals.values()].filter((seconds) => seconds > 0).length;
        const averageSeconds = activeDays ? Math.round(totalSeconds / activeDays) : 0;
        const bestMonth = monthTotals.reduce(
            (best, month) => month.seconds > best.seconds ? month : best,
            monthTotals[0]
        );
        const maximum = Math.max(...monthTotals.map((month) => month.seconds), 1);

        return `
            <section class="study-year-dashboard" aria-label="${referenceDate.getFullYear()}년 학습 통계">
                <div class="study-year-stats">
                    <article>
                        <span>연간 총 학습</span>
                        <strong>${formatDuration(totalSeconds)}</strong>
                    </article>
                    <article>
                        <span>학습한 날</span>
                        <strong>${activeDays}일</strong>
                    </article>
                    <article>
                        <span>학습일 평균</span>
                        <strong>${formatDuration(averageSeconds)}</strong>
                    </article>
                    <article>
                        <span>가장 많이 공부한 달</span>
                        <strong>${bestMonth.seconds ? `${bestMonth.month}월` : "—"}</strong>
                    </article>
                </div>
                <section class="study-year-chart">
                    <header>
                        <div>
                            <span>YEARLY TREND</span>
                            <h3>월별 누적 학습</h3>
                        </div>
                        <p>한 해의 학습 흐름을 월 단위로 비교합니다.</p>
                    </header>
                    <ol>
                        ${monthTotals.map((month) => `
                            <li class="${month.seconds ? "has-record" : ""}">
                                <span>${month.month}월</span>
                                <div aria-hidden="true">
                                    <i style="width: ${Math.round((month.seconds / maximum) * 100)}%"></i>
                                </div>
                                <strong>${formatDuration(month.seconds)}</strong>
                            </li>
                        `).join("")}
                    </ol>
                </section>
            </section>
        `;
    }

    function render() {
        if (!container) {
            return;
        }

        const records = readRecords();
        const visibleRecords = filterRecords(records, viewMode, referenceDate);
        const totalSeconds = sumDuration(visibleRecords);
        const periodLabel = formatPeriodLabel(viewMode, referenceDate);
        const periodText = formatPeriod(viewMode, referenceDate);

        container.innerHTML = `
            <section class="study-records" aria-label="학습 기록">
                <header class="study-record-toolbar">
                    <div class="study-record-tabs" role="tablist" aria-label="기록 조회 기간">
                        <button type="button" role="tab" data-study-record-view="daily"
                                aria-selected="${viewMode === "daily"}"
                                class="${viewMode === "daily" ? "is-active" : ""}">일간</button>
                        <button type="button" role="tab" data-study-record-view="monthly"
                                aria-selected="${viewMode === "monthly"}"
                                class="${viewMode === "monthly" ? "is-active" : ""}">월간</button>
                        <button type="button" role="tab" data-study-record-view="yearly"
                                aria-selected="${viewMode === "yearly"}"
                                class="${viewMode === "yearly" ? "is-active" : ""}">연간</button>
                    </div>
                    <div class="study-period-navigation">
                        <button type="button" data-study-period-move="-1" aria-label="이전 기간">←</button>
                        <strong title="${escapeHtml(periodLabel)}">
                            <span aria-hidden="true">${escapeHtml(periodText)}</span>
                            <span class="sr-only">${escapeHtml(periodLabel)}</span>
                        </strong>
                        <button type="button" data-study-period-today>오늘</button>
                        <button type="button" data-study-period-move="1" aria-label="다음 기간">→</button>
                    </div>
                </header>
                ${loadErrorMessage
                    ? `<p class="study-record-load-error" role="status">${escapeHtml(loadErrorMessage)}</p>`
                    : ""}
                <header class="study-records-summary">
                    <div>
                        <span>선택 기간의 구간</span>
                        <strong>${visibleRecords.length}개</strong>
                    </div>
                    <div>
                        <span>선택 기간 합계</span>
                        <strong>${formatDuration(totalSeconds)}</strong>
                    </div>
                    <p>창을 닫아도 타이머는 계속 실행됩니다.</p>
                </header>
                ${viewMode === "daily"
                    ? renderDaily(visibleRecords)
                    : viewMode === "monthly"
                        ? renderMonthly(visibleRecords)
                        : renderYearly(visibleRecords)}
            </section>
        `;

        if (editingId) {
            container.querySelector(`[data-study-record-form="${editingId}"] input`)?.focus();
        }
    }

    function mount(target) {
        container = target;
        render();
    }

    function handleClick(event) {
        const editButton = event.target.closest("[data-study-record-edit]");
        const cancelButton = event.target.closest("[data-study-record-cancel]");
        const viewButton = event.target.closest("[data-study-record-view]");
        const periodButton = event.target.closest("[data-study-period-move]");
        const todayButton = event.target.closest("[data-study-period-today]");
        const calendarDay = event.target.closest("[data-study-calendar-day]");

        if (viewButton) {
            viewMode = viewButton.dataset.studyRecordView;
            editingId = null;
            render();
            return true;
        }

        if (periodButton) {
            referenceDate = movePeriod(
                viewMode,
                referenceDate,
                Number(periodButton.dataset.studyPeriodMove)
            );
            editingId = null;
            render();
            return true;
        }

        if (todayButton) {
            referenceDate = getCurrentStudyDate();
            editingId = null;
            render();
            return true;
        }

        if (calendarDay) {
            const [year, month, day] = calendarDay.dataset.studyCalendarDay
                .split("-")
                .map(Number);
            referenceDate = new Date(year, month - 1, day);
            editingId = null;
            render();
            return true;
        }

        if (editButton) {
            editingId = editButton.dataset.studyRecordEdit;
            render();
            return true;
        }

        if (cancelButton) {
            editingId = null;
            render();
            return true;
        }

        return false;
    }
    // [API-REPLACE] 학습 기록 수정 PATH API 호출
    function handleSubmit(event) {
        const form = event.target.closest("[data-study-record-form]");

        if (!form) {
            return false;
        }

        event.preventDefault();
        const records = readRecords();
        const record = records.find((item) => item.id === form.dataset.studyRecordForm);

        if (!record) {
            return true;
        }

        const formData = new FormData(form);
        record.name = String(formData.get("name") || "").trim() || `구간 ${record.sequence}`;
        record.tags = parseTags(formData.get("tags"));
        record.updatedAt = new Date().toISOString();
        writeRecords(records);
        api?.update?.(record.id, record);
        editingId = null;
        render();
        return true;
    }

    return {
        addRecord,
        getUnrecordedSeconds,
        mount: (target) => {
            mount(target);
            loadRecords();
        },
        handleClick,
        handleSubmit
    };
}
