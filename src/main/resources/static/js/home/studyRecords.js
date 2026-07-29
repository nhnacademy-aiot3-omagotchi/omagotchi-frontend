import { escapeHtml, formatDuration } from "./utils.js";

const PAGE_SIZE = 5;

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

function filterRecords(records, viewMode, referenceDate) {
    return records.filter((record) => {
        const recordedAt = parseRecordedAt(record);

        if (!recordedAt || recordedAt.getFullYear() !== referenceDate.getFullYear()) {
            return false;
        }

        if (viewMode === "yearly") {
            return true;
        }

        if (recordedAt.getMonth() !== referenceDate.getMonth()) {
            return false;
        }

        return viewMode === "monthly" || isSameDay(recordedAt, referenceDate);
    });
}

function formatPeriod(viewMode, date) {
    if (viewMode === "yearly") {
        return `${date.getFullYear()}년`;
    }

    if (viewMode === "monthly") {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short"
    }).format(date);
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

function createPeriodSummary(records, viewMode, referenceDate) {
    const itemCount = viewMode === "monthly"
        ? new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate()
        : 12;
    const values = Array.from({ length: itemCount }, (_, index) => ({
        label: viewMode === "monthly" ? `${index + 1}일` : `${index + 1}월`,
        seconds: 0
    }));

    records.forEach((record) => {
        const date = parseRecordedAt(record);
        const index = viewMode === "monthly" ? date.getDate() - 1 : date.getMonth();
        values[index].seconds += Number(record.durationSeconds) || 0;
    });

    return values;
}

// 구간 기록의 계산, 저장, 편집 화면을 한 곳에서 관리한다.
export function createStudyRecords({ storageKey, getElapsedSeconds }) {
    const sessionId = createId("timer");
    let lastRecordedElapsed = 0;
    let editingId = null;
    let container = null;
    let viewMode = "daily";
    let referenceDate = new Date();
    let currentPage = 1;

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

    function addRecord() {
        const elapsedSeconds = getElapsedSeconds();
        const durationSeconds = elapsedSeconds - lastRecordedElapsed;

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
            name: `구간 ${sequence}`,
            tags: [],
            durationSeconds,
            elapsedSeconds,
            recordedAt: now,
            updatedAt: now
        };

        // 랩 타이머처럼 첫 구간부터 시간순으로 읽을 수 있게 뒤에 추가한다.
        records.push(record);
        writeRecords(records);
        lastRecordedElapsed = elapsedSeconds;
        editingId = null;
        viewMode = "daily";
        referenceDate = new Date(now);
        currentPage = Math.ceil(
            filterRecords(records, viewMode, referenceDate).length / PAGE_SIZE
        );
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

    function renderPeriodOverview(records) {
        const periods = createPeriodSummary(records, viewMode, referenceDate);
        const maximum = Math.max(...periods.map((period) => period.seconds), 1);
        const periodName = viewMode === "monthly" ? "일자" : "월";

        return `
            <section class="study-period-overview" aria-label="${periodName}별 학습 시간">
                <header>
                    <div>
                        <span>${viewMode === "monthly" ? "DAILY TOTAL" : "MONTHLY TOTAL"}</span>
                        <h3>${periodName}별 누적 학습</h3>
                    </div>
                    <p>막대는 선택한 기간의 학습 시간을 비교합니다.</p>
                </header>
                <ol>
                    ${periods.map((period) => `
                        <li class="${period.seconds ? "has-record" : ""}">
                            <span>${period.label}</span>
                            <div aria-hidden="true">
                                <i style="width: ${Math.round((period.seconds / maximum) * 100)}%"></i>
                            </div>
                            <strong>${formatDuration(period.seconds)}</strong>
                        </li>
                    `).join("")}
                </ol>
            </section>
        `;
    }

    function renderDailyRecords(records) {
        const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
        currentPage = Math.min(Math.max(currentPage, 1), totalPages);
        const pageStart = (currentPage - 1) * PAGE_SIZE;
        const pageRecords = records.slice(pageStart, pageStart + PAGE_SIZE);

        if (!records.length) {
            return `
                <div class="study-record-empty">
                    <strong>이 날짜에는 저장된 구간이 없습니다.</strong>
                    <p>홈에서 타이머를 시작한 뒤 구간 기록을 눌러 보세요.</p>
                </div>
            `;
        }

        return `
            <ol class="study-record-list">${pageRecords.map(renderRecord).join("")}</ol>
            <nav class="study-record-pagination" aria-label="학습 기록 페이지">
                <button type="button" data-study-record-page="prev" ${currentPage === 1 ? "disabled" : ""}>
                    이전
                </button>
                <span><strong>${currentPage}</strong> / ${totalPages}</span>
                <button type="button" data-study-record-page="next" ${currentPage === totalPages ? "disabled" : ""}>
                    다음
                </button>
            </nav>
        `;
    }

    function render() {
        if (!container) {
            return;
        }

        const records = readRecords();
        const visibleRecords = filterRecords(records, viewMode, referenceDate);
        const totalSeconds = visibleRecords.reduce(
            (sum, record) => sum + (Number(record.durationSeconds) || 0),
            0
        );

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
                        <strong>${formatPeriod(viewMode, referenceDate)}</strong>
                        <button type="button" data-study-period-today>오늘</button>
                        <button type="button" data-study-period-move="1" aria-label="다음 기간">→</button>
                    </div>
                </header>
                <header class="study-records-summary">
                    <div>
                        <span>선택 기간의 구간</span>
                        <strong>${visibleRecords.length}개</strong>
                    </div>
                    <div>
                        <span>선택 기간 합계</span>
                        <strong>${formatDuration(totalSeconds)}</strong>
                    </div>
                    <p>구간 기록을 눌러도 타이머는 계속 흐릅니다.</p>
                </header>
                ${viewMode === "daily"
                    ? renderDailyRecords(visibleRecords)
                    : renderPeriodOverview(visibleRecords)}
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
        const pageButton = event.target.closest("[data-study-record-page]");

        if (viewButton) {
            viewMode = viewButton.dataset.studyRecordView;
            currentPage = 1;
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
            currentPage = 1;
            editingId = null;
            render();
            return true;
        }

        if (todayButton) {
            referenceDate = new Date();
            currentPage = 1;
            editingId = null;
            render();
            return true;
        }

        if (pageButton && !pageButton.disabled) {
            currentPage += pageButton.dataset.studyRecordPage === "next" ? 1 : -1;
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
        editingId = null;
        render();
        return true;
    }

    return {
        addRecord,
        mount,
        handleClick,
        handleSubmit
    };
}
