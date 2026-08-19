import { escapeHtml, formatDuration } from "./utils.js";

const KST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;
const STUDY_DAY_START_HOUR = 4;
const HEAT_THRESHOLDS = [2, 4, 6, 8].map((hours) => hours * 60 * 60);
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(value) {
    return String(value).padStart(2, "0");
}

function dateKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
}

function currentAggregationDate(now = new Date()) {
    const kst = new Date(now.getTime() + KST_OFFSET_MILLISECONDS);
    if (kst.getUTCHours() < STUDY_DAY_START_HOUR) {
        kst.setUTCDate(kst.getUTCDate() - 1);
    }
    return dateKey(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate());
}

function parseMonth(month) {
    const matched = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
    if (!matched) return null;
    const year = Number(matched[1]);
    const monthNumber = Number(matched[2]);
    if (monthNumber < 1 || monthNumber > 12) return null;
    return { year, month: monthNumber };
}

function monthOf(date) {
    return String(date || "").slice(0, 7);
}

function daysInMonth(month) {
    const parsed = parseMonth(month);
    return parsed ? new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate() : 0;
}

function firstWeekdayOfMonth(month) {
    const parsed = parseMonth(month);
    return parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, 1)).getUTCDay() : 0;
}

function moveMonth(month, amount) {
    const parsed = parseMonth(month);
    if (!parsed) return month;
    const moved = new Date(Date.UTC(parsed.year, parsed.month - 1 + amount, 1));
    return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}`;
}

function moveDate(date, amount) {
    const moved = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(moved.getTime())) return date;
    moved.setUTCDate(moved.getUTCDate() + amount);
    return dateKey(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

function selectedDateForMonth(month, previousDate, maximumDate) {
    const previousDay = Number(String(previousDate || "").slice(8, 10)) || 1;
    const lastDay = daysInMonth(month);
    const maximumDay = month === monthOf(maximumDate)
        ? Number(maximumDate.slice(8, 10))
        : lastDay;
    return `${month}-${pad(Math.min(previousDay, lastDay, maximumDay))}`;
}

function formatMonthLabel(month) {
    const parsed = parseMonth(month);
    return parsed ? `${parsed.year}년 ${parsed.month}월` : "조회 월";
}

function formatDateLabel(date) {
    const [year, month, day] = String(date || "").split("-").map(Number);
    if (!year || !month || !day) return "선택 날짜";
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function instantToKstParts(instant) {
    const parsed = new Date(instant);
    if (Number.isNaN(parsed.getTime())) return null;
    const kst = new Date(parsed.getTime() + KST_OFFSET_MILLISECONDS);
    return {
        date: dateKey(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate()),
        time: `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
    };
}

function formatRecordRange(record) {
    const start = instantToKstParts(record.startTime);
    const end = instantToKstParts(record.endTime);
    if (!start || !end) return "시간 정보 오류";
    return `${start.time}–${end.time}`;
}

function canEditWithCurrentContract(record) {
    const start = instantToKstParts(record.startTime);
    const end = instantToKstParts(record.endTime);
    return Boolean(start && end && start.date === end.date);
}

function getHeatLevel(seconds) {
    const normalized = Number(seconds) || 0;
    if (normalized <= 0) return 0;
    for (let index = HEAT_THRESHOLDS.length - 1; index >= 0; index -= 1) {
        if (normalized >= HEAT_THRESHOLDS[index]) return index + 2;
    }
    return 1;
}

function formatCompactDuration(seconds) {
    const total = Number(seconds) || 0;
    if (total <= 0) return "기록 없음";
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function timelinePosition(record, aggregationDate) {
    const windowStart = new Date(`${aggregationDate}T04:00:00+09:00`).getTime();
    const windowEnd = windowStart + 24 * 60 * 60 * 1000;
    const start = new Date(record.startTime).getTime();
    const end = new Date(record.endTime).getTime();
    if (![windowStart, start, end].every(Number.isFinite) || end <= start) return null;
    const visibleStart = Math.max(start, windowStart);
    const visibleEnd = Math.min(end, windowEnd);
    if (visibleEnd <= visibleStart) return null;
    return {
        left: ((visibleStart - windowStart) / (windowEnd - windowStart)) * 100,
        width: ((visibleEnd - visibleStart) / (windowEnd - windowStart)) * 100
    };
}

function validateMonthlyResponse(response, requestedMonth) {
    const dailyTotalsValid = Array.isArray(response?.dailyTotals)
        && response.dailyTotals.every((item) => (
            monthOf(item?.aggregationDate) === requestedMonth
            && Number.isFinite(Number(item?.studySeconds))
            && Number(item.studySeconds) >= 0
        ));
    if (response?.aggregationMonth !== requestedMonth
        || !Number.isFinite(Number(response?.totalStudySeconds))
        || !dailyTotalsValid) {
        throw new Error("월간 공부 시간 응답 형식이 올바르지 않습니다.");
    }
    return response;
}

function validateDailyResponse(response, requestedDate) {
    const recordsValid = Array.isArray(response?.records)
        && response.records.every((record) => (
            record?.id !== null
            && record?.id !== undefined
            && record?.aggregationDate === requestedDate
            && Number.isFinite(new Date(record?.startTime).getTime())
            && Number.isFinite(new Date(record?.endTime).getTime())
            && Number.isFinite(Number(record?.studySeconds))
            && Number(record.studySeconds) >= 0
            && Number.isInteger(Number(record?.version))
            && Number(record.version) >= 0
        ));
    if (response?.aggregationDate !== requestedDate
        || !Number.isFinite(Number(response?.totalStudySeconds))
        || !recordsValid) {
        throw new Error("선택 날짜 기록 응답 형식이 올바르지 않습니다.");
    }
    return response;
}

function studyRecordErrorMessage(error, action) {
    const messages = {
        STUDY_RECORD_NOT_FOUND: "공부 기록을 찾을 수 없습니다. 최신 기록을 다시 불러옵니다.",
        STUDY_RECORD_OVERLAP: "기존 공부 기록과 시간이 겹칩니다.",
        STUDY_RECORD_AGGREGATION_BOUNDARY_CROSSED: "오전 4시 집계 경계를 넘는 하나의 기록으로 수정할 수 없습니다.",
        STUDY_RECORD_ACTIVE_TIMER_CONFLICT: "실행 중인 타이머를 종료한 뒤 기록을 수정해 주세요.",
        STUDY_RECORD_VERSION_CONFLICT: "다른 변경이 먼저 반영되었습니다. 최신 기록을 다시 불러옵니다.",
        STUDY_RECORD_WRITE_LOCK_TIMEOUT: "다른 공부 기록 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.",
        COHORT_NOT_FOUND: "이용 가능한 기수를 확인할 수 없습니다.",
        AUTH_AUTHENTICATION_REQUIRED: "로그인이 만료되었습니다. 다시 로그인해 주세요."
    };
    if (error?.code && messages[error.code]) return messages[error.code];
    if (error?.kind === "NETWORK") return "서버에 연결할 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
    if (error?.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    if (error?.status === 404 && !error?.code) return "공부 기록 API 연결 경로를 찾을 수 없습니다.";
    return error?.message || `${action} 중 오류가 발생했습니다.`;
}

function selectorValue(value) {
    const normalized = String(value ?? "");
    return window.CSS?.escape ? window.CSS.escape(normalized) : normalized.replaceAll('"', '\\"');
}

export async function resolveMyActiveCohortId(api) {
    if (typeof api?.getContext !== "function") {
        throw new Error("내 공부 기록 API가 준비되지 않았습니다.");
    }
    const context = await api.getContext();
    return context?.cohortId ?? null;
}

function renderStateMessage(message, { error = false, retry = null } = {}) {
    return `
        <div class="remote-study-state${error ? " is-error" : ""}" role="${error ? "alert" : "status"}">
            <p>${escapeHtml(message)}</p>
            ${retry ? `<button type="button" data-study-retry="${retry}">다시 시도</button>` : ""}
        </div>
    `;
}

export function createMyStudyRecords({ api, getCohortId, preview = false }) {
    let container = null;
    const state = {
        cohortId: null,
        viewMode: "month",
        displayMonth: monthOf(currentAggregationDate()),
        selectedDate: currentAggregationDate(),
        monthData: null,
        dailyData: null,
        selectedRecordId: null,
        bootstrapLoading: false,
        bootstrapError: null,
        monthLoading: false,
        monthError: null,
        dailyLoading: false,
        dailyError: null,
        editingRecordId: null,
        editDraft: null,
        editError: null,
        deleteRecordId: null,
        deleteError: null,
        mutationPending: false,
        notice: null,
        bootstrapSequence: 0,
        monthSequence: 0,
        dailySequence: 0
    };

    function records() {
        return Array.isArray(state.dailyData?.records) ? state.dailyData.records : [];
    }

    function findRecord(recordId) {
        return records().find((record) => String(record.id) === String(recordId)) || null;
    }

    function renderCalendar() {
        if (state.monthLoading && !state.monthData) {
            return renderStateMessage("월간 공부 시간을 불러오는 중입니다.");
        }
        if (state.monthError && !state.monthData) {
            return renderStateMessage(state.monthError, { error: true, retry: "month" });
        }
        if (!state.monthData) {
            return renderStateMessage("표시할 월간 공부 시간이 없습니다.");
        }

        const totals = new Map(state.monthData.dailyTotals.map((item) => [
            item.aggregationDate,
            Number(item.studySeconds) || 0
        ]));
        const parsedMonth = parseMonth(state.displayMonth);
        const cells = [];
        for (let index = 0; index < firstWeekdayOfMonth(state.displayMonth); index += 1) {
            cells.push('<li class="study-calendar-empty" aria-hidden="true"></li>');
        }
        for (let day = 1; day <= daysInMonth(state.displayMonth); day += 1) {
            const date = `${state.displayMonth}-${pad(day)}`;
            const seconds = totals.get(date) || 0;
            const weekday = new Date(Date.UTC(parsedMonth.year, parsedMonth.month - 1, day)).getUTCDay();
            const future = date > currentAggregationDate();
            cells.push(`
                <li>
                    <button type="button"
                            class="study-calendar-day heat-${getHeatLevel(seconds)}${date === state.selectedDate ? " is-selected" : ""}${date === currentAggregationDate() ? " is-today" : ""}${weekday === 0 ? " is-sunday" : ""}${weekday === 6 ? " is-saturday" : ""}"
                            data-study-date="${date}"
                            aria-pressed="${date === state.selectedDate}"
                            aria-label="${parsedMonth.month}월 ${day}일, ${formatCompactDuration(seconds)}"
                            ${future || state.mutationPending ? "disabled" : ""}>
                        <span>${day}</span>
                        <strong>${seconds ? formatCompactDuration(seconds) : "—"}</strong>
                    </button>
                </li>
            `);
        }

        return `
            <ol class="study-calendar-weekdays" aria-hidden="true">
                ${WEEKDAYS.map((weekday, index) => `<li class="${index === 0 ? "is-sunday" : index === 6 ? "is-saturday" : ""}">${weekday}</li>`).join("")}
            </ol>
            <ol class="study-calendar-grid">${cells.join("")}</ol>
            <div class="study-heat-legend" aria-label="공부 시간 색상 범례: 0시간부터 8시간 이상까지 여섯 단계">
                <span>0시간</span>
                ${[0, 1, 2, 3, 4, 5].map((level) => `<i class="heat-${level}" aria-hidden="true"></i>`).join("")}
                <span>8시간 이상</span>
            </div>
        `;
    }

    function renderTimeline() {
        const selected = findRecord(state.selectedRecordId);
        const bars = records().map((record) => {
            const position = timelinePosition(record, state.selectedDate);
            if (!position) return "";
            const selectedClass = String(record.id) === String(state.selectedRecordId) ? " is-selected" : "";
            return `
                <button type="button" class="remote-study-timeline-bar${selectedClass}"
                        data-study-select-record="${escapeHtml(String(record.id))}"
                        style="left:${position.left}%;width:${Math.max(position.width, 0.5)}%"
                        aria-label="${escapeHtml(formatRecordRange(record))}, ${escapeHtml(formatDuration(record.studySeconds))}"
                        ${state.mutationPending ? "disabled" : ""}></button>
            `;
        }).join("");
        const caption = selected
            ? `<strong>${escapeHtml(formatRecordRange(selected))}</strong> · 인정 ${escapeHtml(formatDuration(selected.studySeconds))}`
            : state.dailyLoading
                ? "타임라인을 불러오는 중입니다."
                : records().length
                    ? "막대 또는 구간 기록을 선택하면 상세 시간이 강조됩니다."
                    : "이 날짜에는 표시할 공부 구간이 없습니다.";
        return `
            <div class="remote-study-timeline" aria-label="선택 날짜의 오전 4시 기준 24시간 공부 타임라인">
                <div class="remote-study-timeline-axis" aria-hidden="true">
                    ${["04", "07", "10", "13", "16", "19", "22", "01", "04"].map((label, index) => `<span style="left:${index * 12.5}%">${label}</span>`).join("")}
                </div>
                <div class="remote-study-timeline-track">${bars}</div>
                <p class="remote-study-timeline-caption">${caption}</p>
            </div>
        `;
    }

    function renderEditForm(record) {
        const start = instantToKstParts(record.startTime);
        const end = instantToKstParts(record.endTime);
        const draft = state.editDraft || {
            date: start?.date || "",
            startTime: start?.time || "",
            endTime: end?.time || ""
        };
        return `
            <form class="remote-study-edit-form" data-study-edit-form="${escapeHtml(String(record.id))}">
                <p>현재 Learning 계약상 같은 달력 날짜 안의 구간만 수정할 수 있습니다.</p>
                <div class="remote-study-edit-fields">
                    <label><span>날짜</span><input type="date" name="date" value="${escapeHtml(draft.date)}" required></label>
                    <label><span>시작</span><input type="time" name="startTime" step="60" value="${escapeHtml(draft.startTime)}" required></label>
                    <label><span>종료</span><input type="time" name="endTime" step="60" value="${escapeHtml(draft.endTime)}" required></label>
                </div>
                ${state.editError ? `<p class="remote-study-form-error" role="alert">${escapeHtml(state.editError)}</p>` : ""}
                <div class="remote-study-form-actions">
                    <button type="button" data-study-cancel-edit ${state.mutationPending ? "disabled" : ""}>취소</button>
                    <button type="submit" class="is-primary" ${state.mutationPending ? "disabled" : ""}>${state.mutationPending ? "저장 중…" : "저장"}</button>
                </div>
            </form>
        `;
    }

    function renderRecordList() {
        if (state.dailyLoading && !state.dailyData) {
            return renderStateMessage("선택 날짜의 구간 기록을 불러오는 중입니다.");
        }
        if (state.dailyError && !state.dailyData) {
            return renderStateMessage(state.dailyError, { error: true, retry: "daily" });
        }
        if (!records().length) {
            return renderStateMessage("선택한 날짜에는 저장된 구간이 없습니다.");
        }

        return `
            <ol class="remote-study-record-list">
                ${records().map((record, index) => {
                    const recordId = escapeHtml(String(record.id));
                    const selected = String(record.id) === String(state.selectedRecordId);
                    const editable = canEditWithCurrentContract(record);
                    return `
                        <li class="remote-study-record${selected ? " is-selected" : ""}" data-study-record-id="${recordId}">
                            <button type="button" class="remote-study-record-main" data-study-select-record="${recordId}" aria-pressed="${selected}" ${state.mutationPending ? "disabled" : ""}>
                                <span class="remote-study-record-index">${index + 1}</span>
                                <span><strong>${escapeHtml(formatRecordRange(record))}</strong><small>실제 공부 구간</small></span>
                                <span><strong>${escapeHtml(formatDuration(record.studySeconds))}</strong><small>인정 학습 시간</small></span>
                            </button>
                            <div class="remote-study-record-actions">
                                <button type="button" data-study-edit-record="${recordId}" ${editable && !state.mutationPending ? "" : "disabled"}
                                        title="${editable ? "공부 기록 수정" : "자정을 넘는 기록은 현재 API 계약으로 수정할 수 없습니다."}">수정</button>
                                <button type="button" class="is-danger" data-study-delete-record="${recordId}" ${state.mutationPending ? "disabled" : ""}>삭제</button>
                            </div>
                            ${state.editingRecordId === String(record.id) ? renderEditForm(record) : ""}
                        </li>
                    `;
                }).join("")}
            </ol>
        `;
    }

    function renderDeleteConfirmation() {
        const record = findRecord(state.deleteRecordId);
        if (!record) return "";
        return `
            <section class="remote-study-confirm" role="alertdialog" aria-labelledby="remote-study-delete-title" aria-describedby="remote-study-delete-description">
                <h4 id="remote-study-delete-title">이 공부 기록을 삭제하시겠습니까?</h4>
                <p id="remote-study-delete-description"><strong>${escapeHtml(formatRecordRange(record))}</strong>, ${escapeHtml(formatDuration(record.studySeconds))} 기록이 목록과 통계에서 제거됩니다. 이 작업은 화면에서 되돌릴 수 없습니다.</p>
                ${state.deleteError ? `<p class="remote-study-form-error" role="alert">${escapeHtml(state.deleteError)}</p>` : ""}
                <div class="remote-study-form-actions">
                    <button type="button" data-study-cancel-delete ${state.mutationPending ? "disabled" : ""}>취소</button>
                    <button type="button" class="is-danger" data-study-confirm-delete ${state.mutationPending ? "disabled" : ""}>${state.mutationPending ? "삭제 중…" : "삭제"}</button>
                </div>
            </section>
        `;
    }

    function renderMonthlyView() {
        const nextMonth = moveMonth(state.displayMonth, 1);
        const nextDisabled = nextMonth > monthOf(currentAggregationDate());
        return `
            <header class="remote-study-toolbar">
                <div>
                    <span>MONTHLY STUDY LOG</span>
                    <h3>월간 공부 기록</h3>
                </div>
                <nav class="study-period-navigation" aria-label="조회 월 이동">
                    <button type="button" data-study-move-month="-1" aria-label="이전 달" ${state.mutationPending ? "disabled" : ""}>←</button>
                    <strong>${escapeHtml(formatMonthLabel(state.displayMonth))}</strong>
                    <button type="button" data-study-current-month ${state.mutationPending ? "disabled" : ""}>이번 달</button>
                    <button type="button" data-study-move-month="1" aria-label="다음 달" ${nextDisabled || state.mutationPending ? "disabled" : ""}>→</button>
                </nav>
            </header>
            <section class="study-calendar remote-study-calendar" aria-label="${escapeHtml(formatMonthLabel(state.displayMonth))} 공부 시간 달력">
                <header>
                    <div><span>STUDY GRASS</span><h3>날짜별 공부 시간</h3></div>
                    <div class="remote-study-month-metric"><span>월간 총 공부</span><strong>${state.monthData ? escapeHtml(formatDuration(state.monthData.totalStudySeconds)) : "—"}</strong></div>
                </header>
                <p class="remote-study-view-note">오전 4시부터 다음 날 오전 4시까지를 하루로 표시합니다. 날짜를 선택하면 일간 타임라인으로 이동합니다.</p>
                ${renderCalendar()}
            </section>
        `;
    }

    function renderDailyView() {
        const nextDateDisabled = moveDate(state.selectedDate, 1) > currentAggregationDate();
        return `
            <header class="remote-study-toolbar">
                <div>
                    <span>DAILY STUDY LOG</span>
                    <h3>${escapeHtml(formatDateLabel(state.selectedDate))}</h3>
                </div>
                <div class="remote-study-view-actions">
                    <button type="button" data-study-show-month ${state.mutationPending ? "disabled" : ""}>월간 달력</button>
                    <nav class="remote-study-day-navigation" aria-label="조회 날짜 이동">
                        <button type="button" data-study-move-day="-1" aria-label="이전 날짜" ${state.mutationPending ? "disabled" : ""}>←</button>
                        <button type="button" data-study-current-day ${state.mutationPending ? "disabled" : ""}>오늘</button>
                        <button type="button" data-study-move-day="1" aria-label="다음 날짜" ${nextDateDisabled || state.mutationPending ? "disabled" : ""}>→</button>
                    </nav>
                </div>
            </header>
            <section class="remote-study-day" aria-labelledby="remote-study-day-title">
                <header>
                    <div><span>04:00 — NEXT 04:00</span><h3 id="remote-study-day-title">24시간 공부 타임라인</h3></div>
                    <strong>${state.dailyData ? escapeHtml(formatDuration(state.dailyData.totalStudySeconds)) : "—"}</strong>
                </header>
                ${renderTimeline()}
                <div class="remote-study-record-heading"><h4>공부 상세 구간</h4><span>${records().length}개 기록</span></div>
                ${renderRecordList()}
            </section>
            ${renderDeleteConfirmation()}
        `;
    }

    function renderContent() {
        return `
            <section class="remote-study-records" aria-label="내 공부 기록" aria-busy="${state.monthLoading || state.dailyLoading || state.mutationPending}">
                ${preview ? '<p class="remote-study-preview" role="status">로컬 미리보기 데이터입니다. 새로고침하면 수정·삭제 내용이 초기화됩니다.</p>' : ""}
                ${state.notice ? `<p class="remote-study-notice" role="status">${escapeHtml(state.notice)}</p>` : ""}
                ${state.viewMode === "month" ? renderMonthlyView() : renderDailyView()}
            </section>
        `;
    }

    function render() {
        if (!container) return;
        if (state.bootstrapLoading) {
            container.innerHTML = renderStateMessage("내 공부 기록을 준비하는 중입니다.");
            return;
        }
        if (state.bootstrapError) {
            container.innerHTML = renderStateMessage(state.bootstrapError, { error: true, retry: "bootstrap" });
            return;
        }
        if (!state.cohortId) {
            container.innerHTML = renderStateMessage("승인된 활성 기수가 없어 공부 기록을 조회할 수 없습니다.", { error: true, retry: "bootstrap" });
            return;
        }
        container.innerHTML = renderContent();
    }

    async function loadMonth(month = state.displayMonth) {
        const sequence = ++state.monthSequence;
        state.monthLoading = true;
        state.monthError = null;
        state.monthData = null;
        render();
        try {
            const response = validateMonthlyResponse(
                await api.getMonthlySummary(state.cohortId, month),
                month
            );
            if (sequence !== state.monthSequence) return;
            state.monthData = response;
        } catch (error) {
            if (sequence !== state.monthSequence) return;
            state.monthError = studyRecordErrorMessage(error, "월간 공부 시간 조회");
        } finally {
            if (sequence === state.monthSequence) {
                state.monthLoading = false;
                render();
            }
        }
    }

    async function loadDaily(date = state.selectedDate, preferredRecordId = null) {
        const sequence = ++state.dailySequence;
        state.selectedDate = date;
        state.dailyLoading = true;
        state.dailyError = null;
        state.dailyData = null;
        state.selectedRecordId = preferredRecordId;
        state.editingRecordId = null;
        state.editDraft = null;
        state.editError = null;
        state.deleteRecordId = null;
        state.deleteError = null;
        render();
        try {
            const response = validateDailyResponse(
                await api.getDailyRecords(state.cohortId, date),
                date
            );
            if (sequence !== state.dailySequence) return;
            state.dailyData = response;
            if (preferredRecordId && response.records.some((record) => String(record.id) === String(preferredRecordId))) {
                state.selectedRecordId = String(preferredRecordId);
            } else {
                state.selectedRecordId = null;
            }
        } catch (error) {
            if (sequence !== state.dailySequence) return;
            state.dailyError = studyRecordErrorMessage(error, "선택 날짜 기록 조회");
        } finally {
            if (sequence === state.dailySequence) {
                state.dailyLoading = false;
                render();
            }
        }
    }

    async function loadContext() {
        const sequence = ++state.bootstrapSequence;
        state.bootstrapLoading = true;
        state.bootstrapError = null;
        render();
        try {
            if (typeof getCohortId !== "function"
                || !["getMonthlySummary", "getDailyRecords", "updateRecord", "deleteRecord"]
                    .every((method) => typeof api?.[method] === "function")) {
                throw new Error("내 공부 기록 API가 준비되지 않았습니다.");
            }
            const cohortId = await getCohortId();
            if (sequence !== state.bootstrapSequence) return;
            if (cohortId === null || cohortId === undefined || cohortId === "") {
                throw new Error("승인된 활성 기수가 없습니다.");
            }
            state.cohortId = cohortId;
            state.viewMode = "month";
            state.displayMonth = monthOf(currentAggregationDate());
            state.selectedDate = currentAggregationDate();
        } catch (error) {
            if (sequence !== state.bootstrapSequence) return;
            state.cohortId = null;
            state.bootstrapError = studyRecordErrorMessage(error, "활성 기수 확인");
        } finally {
            if (sequence === state.bootstrapSequence) {
                state.bootstrapLoading = false;
                render();
            }
        }
        if (sequence === state.bootstrapSequence && state.cohortId) {
            await loadMonth();
        }
    }

    async function changeMonth(amount) {
        const nextMonth = moveMonth(state.displayMonth, amount);
        if (nextMonth > monthOf(currentAggregationDate())) return;
        state.displayMonth = nextMonth;
        state.selectedDate = selectedDateForMonth(nextMonth, state.selectedDate, currentAggregationDate());
        state.monthData = null;
        state.notice = null;
        await loadMonth(nextMonth);
    }

    async function showDaily(date) {
        state.viewMode = "day";
        state.displayMonth = monthOf(date);
        state.notice = null;
        await loadDaily(date);
    }

    function showMonthly() {
        state.viewMode = "month";
        state.dailySequence += 1;
        state.dailyLoading = false;
        state.editingRecordId = null;
        state.deleteRecordId = null;
        state.notice = null;
        render();
        if (state.monthData?.aggregationMonth !== state.displayMonth || state.monthError) {
            void loadMonth(state.displayMonth);
        }
    }

    async function changeDay(amount) {
        const nextDate = moveDate(state.selectedDate, amount);
        if (nextDate > currentAggregationDate()) return;
        state.displayMonth = monthOf(nextDate);
        state.notice = null;
        await loadDaily(nextDate);
    }

    function beginEdit(recordId) {
        const record = findRecord(recordId);
        if (!record || !canEditWithCurrentContract(record)) return;
        const start = instantToKstParts(record.startTime);
        const end = instantToKstParts(record.endTime);
        state.editingRecordId = String(record.id);
        state.editDraft = { date: start.date, startTime: start.time, endTime: end.time };
        state.editError = null;
        state.deleteRecordId = null;
        state.notice = null;
        render();
        queueMicrotask(() => container?.querySelector("[data-study-edit-form] input")?.focus());
    }

    async function submitEdit(form) {
        const record = findRecord(form.dataset.studyEditForm);
        if (!record || state.mutationPending) return;
        const formData = new FormData(form);
        const draft = {
            date: String(formData.get("date") || ""),
            startTime: String(formData.get("startTime") || ""),
            endTime: String(formData.get("endTime") || "")
        };
        state.editDraft = draft;
        state.editError = null;
        if (!draft.date || !draft.startTime || !draft.endTime || draft.startTime >= draft.endTime) {
            state.editError = "같은 날짜 안에서 종료 시각은 시작 시각보다 늦어야 합니다.";
            render();
            return;
        }
        state.mutationPending = true;
        render();
        try {
            const updated = await api.updateRecord(state.cohortId, record.id, {
                date: draft.date,
                startTime: draft.startTime,
                endTime: draft.endTime,
                expectedVersion: record.version
            });
            if (!updated?.id || !updated?.aggregationDate) {
                throw new Error("수정 응답 형식이 올바르지 않습니다.");
            }
            state.notice = "공부 기록을 수정했습니다.";
            state.editingRecordId = null;
            state.editDraft = null;
            state.displayMonth = monthOf(updated.aggregationDate);
            state.selectedDate = updated.aggregationDate;
            await Promise.all([
                loadMonth(state.displayMonth),
                loadDaily(state.selectedDate, updated.id)
            ]);
        } catch (error) {
            if (["STUDY_RECORD_VERSION_CONFLICT", "STUDY_RECORD_NOT_FOUND"].includes(error?.code)) {
                state.notice = studyRecordErrorMessage(error, "공부 기록 수정");
                state.editingRecordId = null;
                state.editDraft = null;
                await loadDaily(state.selectedDate);
            } else {
                state.editError = studyRecordErrorMessage(error, "공부 기록 수정");
            }
        } finally {
            state.mutationPending = false;
            render();
        }
    }

    async function confirmDelete() {
        const record = findRecord(state.deleteRecordId);
        if (!record || state.mutationPending) return;
        const recordId = String(record.id);
        state.mutationPending = true;
        state.deleteError = null;
        render();
        try {
            await api.deleteRecord(state.cohortId, record.id, record.version);
            state.notice = "공부 기록을 삭제했습니다.";
            state.deleteRecordId = null;
            state.selectedRecordId = null;
            await Promise.all([loadMonth(state.displayMonth), loadDaily(state.selectedDate)]);
        } catch (error) {
            if (["STUDY_RECORD_VERSION_CONFLICT", "STUDY_RECORD_NOT_FOUND"].includes(error?.code)) {
                state.notice = studyRecordErrorMessage(error, "공부 기록 삭제");
                state.deleteRecordId = null;
                await Promise.all([loadMonth(state.displayMonth), loadDaily(state.selectedDate)]);
            } else if (error?.kind === "NETWORK" || error?.status >= 500) {
                const ambiguousMessage = studyRecordErrorMessage(error, "공부 기록 삭제");
                try {
                    const latest = validateDailyResponse(
                        await api.getDailyRecords(state.cohortId, state.selectedDate),
                        state.selectedDate
                    );
                    state.dailyData = latest;
                    state.dailyError = null;
                    if (latest.records.some((item) => String(item.id) === recordId)) {
                        state.deleteRecordId = recordId;
                        state.deleteError = `${ambiguousMessage} 서버에 기록이 남아 있어 다시 시도할 수 있습니다.`;
                    } else {
                        state.deleteRecordId = null;
                        state.selectedRecordId = null;
                        state.notice = "삭제 응답은 확인하지 못했지만 최신 조회에서 기록이 제거된 것을 확인했습니다.";
                        await loadMonth(state.displayMonth);
                    }
                } catch {
                    state.deleteRecordId = recordId;
                    state.deleteError = `${ambiguousMessage} 삭제 여부도 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.`;
                }
            } else {
                state.deleteError = studyRecordErrorMessage(error, "공부 기록 삭제");
            }
        } finally {
            state.mutationPending = false;
            render();
        }
    }

    function handleClick(event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const retry = target.closest("[data-study-retry]");
        const move = target.closest("[data-study-move-month]");
        const currentMonth = target.closest("[data-study-current-month]");
        const showMonth = target.closest("[data-study-show-month]");
        const moveDayButton = target.closest("[data-study-move-day]");
        const currentDay = target.closest("[data-study-current-day]");
        const date = target.closest("[data-study-date]");
        const select = target.closest("[data-study-select-record]");
        const edit = target.closest("[data-study-edit-record]");
        const cancelEdit = target.closest("[data-study-cancel-edit]");
        const remove = target.closest("[data-study-delete-record]");
        const cancelDelete = target.closest("[data-study-cancel-delete]");
        const confirmRemove = target.closest("[data-study-confirm-delete]");

        if (retry) {
            if (retry.dataset.studyRetry === "bootstrap") void loadContext();
            if (retry.dataset.studyRetry === "month") void loadMonth();
            if (retry.dataset.studyRetry === "daily") void loadDaily();
        } else if (move) {
            void changeMonth(Number(move.dataset.studyMoveMonth));
        } else if (currentMonth) {
            state.displayMonth = monthOf(currentAggregationDate());
            state.selectedDate = currentAggregationDate();
            void loadMonth();
        } else if (showMonth) {
            if (state.viewMode !== "month") {
                history.pushState({ viewMode: "month" }, "", window.location.pathname + window.location.search);
            }
            showMonthly();
        } else if (moveDayButton) {
            void changeDay(Number(moveDayButton.dataset.studyMoveDay));
        } else if (currentDay) {
            void showDaily(currentAggregationDate());
        } else if (date) {
            const selectedDate = date.dataset.studyDate;
            if (state.viewMode !== "day" || state.selectedDate !== selectedDate) {
                history.pushState({ viewMode: "day", date: selectedDate }, "", `#${selectedDate}`);
            }
            void showDaily(selectedDate);
        } else if (select) {
            state.selectedRecordId = select.dataset.studySelectRecord;
            state.editingRecordId = null;
            state.deleteRecordId = null;
            render();
            queueMicrotask(() => {
                const selectedRecord = container?.querySelector(`[data-study-record-id="${selectorValue(state.selectedRecordId)}"]`);
                selectedRecord?.scrollIntoView({ block: "nearest" });
                selectedRecord?.querySelector("[data-study-select-record]")?.focus();
            });
        } else if (edit) {
            beginEdit(edit.dataset.studyEditRecord);
        } else if (cancelEdit) {
            const editingId = state.editingRecordId;
            state.editingRecordId = null;
            state.editDraft = null;
            state.editError = null;
            render();
            queueMicrotask(() => container?.querySelector(`[data-study-edit-record="${selectorValue(editingId)}"]`)?.focus());
        } else if (remove) {
            state.deleteRecordId = remove.dataset.studyDeleteRecord;
            state.deleteError = null;
            state.editingRecordId = null;
            render();
            queueMicrotask(() => container?.querySelector("[data-study-cancel-delete]")?.focus());
        } else if (cancelDelete) {
            const deletingId = state.deleteRecordId;
            state.deleteRecordId = null;
            state.deleteError = null;
            render();
            queueMicrotask(() => container?.querySelector(`[data-study-delete-record="${selectorValue(deletingId)}"]`)?.focus());
        } else if (confirmRemove) {
            void confirmDelete();
        }
    }

    function handleKeydown(event) {
        if (event.key !== "Escape" || !state.deleteRecordId || state.mutationPending) return;
        const deletingId = state.deleteRecordId;
        state.deleteRecordId = null;
        state.deleteError = null;
        render();
        queueMicrotask(() => container?.querySelector(`[data-study-delete-record="${selectorValue(deletingId)}"]`)?.focus());
    }

    function handleSubmit(event) {
        const form = event.target instanceof Element
            ? event.target.closest("[data-study-edit-form]")
            : null;
        if (!form) return;
        event.preventDefault();
        void submitEdit(form);
    }

    function handlePopstate(event) {
        if (!container) return;
        const s = event.state;
        if (s?.viewMode === "day" && s.date) {
            void showDaily(s.date);
        } else {
            showMonthly();
        }
    }

    function unmount() {
        state.bootstrapSequence += 1;
        state.monthSequence += 1;
        state.dailySequence += 1;
        if (container) {
            container.removeEventListener("click", handleClick);
            container.removeEventListener("submit", handleSubmit);
            container.removeEventListener("keydown", handleKeydown);
            window.removeEventListener("popstate", handlePopstate);
        }
        container = null;
    }

    function mount(target) {
        if (!target) return;
        unmount();
        container = target;
        container.addEventListener("click", handleClick);
        container.addEventListener("submit", handleSubmit);
        container.addEventListener("keydown", handleKeydown);
        window.addEventListener("popstate", handlePopstate);
        
        const historyState = history.state;
        if (historyState?.viewMode === "day" && historyState.date) {
            state.viewMode = "day";
            state.selectedDate = historyState.date;
            state.displayMonth = monthOf(historyState.date);
        } else {
            state.viewMode = "month";
            if (!historyState || historyState.viewMode !== "month") {
                history.replaceState({ viewMode: "month" }, "", window.location.pathname + window.location.search);
            }
        }
        
        state.notice = null;
        render();
        if (state.cohortId) {
            if (state.viewMode === "day") {
                void loadDaily(state.selectedDate);
            } else {
                void loadMonth();
            }
        } else {
            void loadContext();
        }
    }

    return { mount, unmount };
}
