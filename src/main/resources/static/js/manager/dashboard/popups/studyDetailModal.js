/**
 * 관리자 공부 통계의 수강생별 상세 보기.
 * 외부에는 openStudyDetailModal만 공개하고 기간·날짜·타임라인 상태는 이 모듈이 관리한다.
 */
(() => {
    function addDays(isoDate, amount) {
        const date = new Date(`${isoDate}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + amount);
        return date.toISOString().slice(0, 10);
    }

    function datesBetween(from, to) {
        if (!from || !to) return [];
        const dates = [];
        for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
        return dates;
    }

    function currentKstAggregationDate() {
        const shifted = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(shifted);
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    }

    function formatDuration(seconds) {
        const value = Math.max(0, Number(seconds) || 0);
        if (value === 0) return "0분";
        if (value < 60) return "1분 미만";
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        if (hours && minutes) return `${hours}시간 ${minutes}분`;
        if (hours) return `${hours}시간`;
        return `${minutes}분`;
    }

    function formatTimelineDuration(seconds) {
        const totalMinutes = Math.max(1, Math.round((Number(seconds) || 0) / 60));
        if (totalMinutes < 120) return `${totalMinutes}분`;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    }

    function formatDateLabel(isoDate) {
        if (!isoDate) return "날짜를 선택해 주세요.";
        const date = new Date(`${isoDate}T00:00:00Z`);
        const dateLabel = new Intl.DateTimeFormat("ko-KR", {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(date);
        const weekday = new Intl.DateTimeFormat("ko-KR", {
            timeZone: "UTC",
            weekday: "short"
        }).format(date);
        return `${dateLabel} (${weekday})`;
    }

    function formatChartDate(isoDate) {
        const date = new Date(`${isoDate}T00:00:00Z`);
        return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
    }

    function formatKstTime(value) {
        if (!value) return "-";
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(new Date(value));
    }

    function formatKstDateTime(value) {
        if (!value) return "-";
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(new Date(value));
    }

    function createTimelineBar(template, record, position) {
        const bar = template.content.firstElementChild.cloneNode(true);
        const label = `${formatKstTime(record.startTime)}부터 ${formatKstTime(record.endTime)}, ${formatDuration(record.studySeconds)}`;
        bar.style.left = `${position.left.toFixed(4)}%`;
        bar.style.width = `${position.width.toFixed(4)}%`;
        bar.dataset.timelineRecord = String(record.id);
        bar.setAttribute("aria-label", label);
        bar.title = label;
        bar.querySelector("[data-detail-timeline-duration]").textContent = formatTimelineDuration(record.studySeconds);
        return bar;
    }

    function createDetailRecord(template, record, index) {
        const article = template.content.firstElementChild.cloneNode(true);
        article.dataset.detailRecordId = String(record.id);
        article.querySelector("[data-detail-record-index]").textContent = String(index + 1);
        article.querySelector("[data-detail-record-range]").textContent = `${formatKstTime(record.startTime)} ~ ${formatKstTime(record.endTime)}`;
        article.querySelector("[data-detail-record-duration]").textContent = formatDuration(record.studySeconds);
        article.querySelector("[data-detail-record-updated-at]").textContent = formatKstDateTime(record.updatedAt);
        return article;
    }

    function initializeStudyDetailModal() {
        const dialog = document.querySelector("[data-study-detail-dialog]");
        if (!dialog) return;

        const elements = {
            name: dialog.querySelector("[data-detail-name]"),
            email: dialog.querySelector("[data-detail-email]"),
            period: dialog.querySelector("[data-detail-period]"),
            status: dialog.querySelector("[data-detail-status]"),
            total: dialog.querySelector("[data-detail-total]"),
            average: dialog.querySelector("[data-detail-average]"),
            activeDays: dialog.querySelector("[data-detail-active-days]"),
            recordCount: dialog.querySelector("[data-detail-record-count]"),
            periodButtons: [...dialog.querySelectorAll("[data-detail-period-days]")],
            chart: dialog.querySelector("[data-detail-trend-chart]"),
            chartEmpty: dialog.querySelector("[data-detail-chart-empty]"),
            selectedDateLabel: dialog.querySelector("[data-detail-selected-date-label]"),
            dateInput: dialog.querySelector("[data-detail-date]"),
            previousDate: dialog.querySelector("[data-detail-previous-date]"),
            nextDate: dialog.querySelector("[data-detail-next-date]"),
            today: dialog.querySelector("[data-detail-today]"),
            timelineTrack: dialog.querySelector("[data-detail-timeline-track]"),
            timelineEmpty: dialog.querySelector("[data-detail-timeline-empty]"),
            selectedCount: dialog.querySelector("[data-detail-selected-count]"),
            list: dialog.querySelector("[data-study-detail-list]"),
            timelineBarTemplate: dialog.querySelector("[data-detail-timeline-bar-template]"),
            recordTemplate: dialog.querySelector("[data-detail-record-template]"),
            recordEmptyTemplate: dialog.querySelector("[data-detail-record-empty-template]"),
            closeButtons: [...dialog.querySelectorAll("[data-detail-close]")]
        };

        const state = {
            cohortId: null,
            cohortMembershipId: null,
            memberName: "수강생",
            memberEmail: "",
            currentAggregationDate: null,
            periodDays: 7,
            from: null,
            to: null,
            selectedDate: null,
            records: [],
            totalStudySeconds: 0,
            loading: false,
            error: null,
            requestSequence: 0,
            previousFocus: null
        };

        let trendChart = null;

        function selectedDateRecords() {
            return state.records
                .filter((record) => record.aggregationDate === state.selectedDate)
                .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));
        }

        function dailyTotals() {
            const totals = new Map(datesBetween(state.from, state.to).map((date) => [date, 0]));
            state.records.forEach((record) => {
                if (!totals.has(record.aggregationDate)) return;
                totals.set(
                    record.aggregationDate,
                    totals.get(record.aggregationDate) + Math.max(0, Number(record.studySeconds) || 0)
                );
            });
            return [...totals].map(([date, seconds]) => ({ date, seconds }));
        }

        function renderSummary() {
            const activeDays = new Set(
                state.records
                    .filter((record) => Number(record.studySeconds) > 0)
                    .map((record) => record.aggregationDate)
            ).size;
            const total = Math.max(0, Number(state.totalStudySeconds) || 0);

            elements.total.textContent = formatDuration(total);
            elements.average.textContent = formatDuration(activeDays ? Math.floor(total / activeDays) : 0);
            elements.activeDays.textContent = `${activeDays}일`;
            elements.recordCount.textContent = `${state.records.length}회`;
        }

        function renderTrendChart() {
            trendChart?.destroy();
            trendChart = null;
            if (!elements.chart) return;

            const totals = dailyTotals();
            const hasRecords = totals.some((item) => item.seconds > 0);
            elements.chartEmpty.hidden = state.loading || Boolean(state.error) || hasRecords;
            elements.chart.hidden = !hasRecords;
            if (!hasRecords || typeof window.Chart !== "function") return;

            trendChart = new window.Chart(elements.chart, {
                type: "bar",
                data: {
                    labels: totals.map((item) => formatChartDate(item.date)),
                    datasets: [{
                        label: "학습 시간",
                        data: totals.map((item) => Number((item.seconds / 3600).toFixed(2))),
                        backgroundColor: totals.map((item) => item.date === state.selectedDate ? "#176044" : "#9ad9ba"),
                        hoverBackgroundColor: "#20b978",
                        borderRadius: 5,
                        maxBarThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    resizeDelay: 100,
                    onClick: (_event, activeElements) => {
                        const selected = activeElements[0];
                        if (!selected) return;
                        selectDate(totals[selected.index].date);
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) => formatDateLabel(totals[items[0].dataIndex].date),
                                label: (context) => ` ${formatDuration(totals[context.dataIndex].seconds)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                autoSkip: true,
                                color: "#66736c",
                                maxRotation: 0,
                                maxTicksLimit: state.periodDays === 30 ? 10 : 7
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: "#e5eee8" },
                            ticks: {
                                color: "#66736c",
                                callback: (value) => `${value}h`
                            }
                        }
                    }
                }
            });
        }

        function timelinePosition(record) {
            const startOfDay = new Date(`${state.selectedDate}T04:00:00+09:00`).getTime();
            const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
            const recordStart = new Date(record.startTime).getTime();
            const recordEnd = new Date(record.endTime).getTime();
            const clippedStart = Math.max(startOfDay, recordStart);
            const clippedEnd = Math.min(endOfDay, recordEnd);
            if (!Number.isFinite(recordStart) || !Number.isFinite(recordEnd) || clippedEnd <= clippedStart) return null;

            return {
                left: (clippedStart - startOfDay) * 100 / (endOfDay - startOfDay),
                width: (clippedEnd - clippedStart) * 100 / (endOfDay - startOfDay)
            };
        }

        function focusRecord(recordId) {
            const row = elements.list.querySelector(`[data-detail-record-id="${CSS.escape(String(recordId))}"]`);
            if (!row) return;
            elements.list.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
            row.classList.add("is-selected");
            row.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        function renderSelectedDate() {
            const records = selectedDateRecords();
            elements.selectedDateLabel.textContent = formatDateLabel(state.selectedDate);
            elements.dateInput.value = state.selectedDate || "";
            elements.dateInput.min = state.from || "";
            elements.dateInput.max = state.to || "";
            elements.previousDate.disabled = !state.selectedDate || state.selectedDate <= state.from;
            elements.nextDate.disabled = !state.selectedDate || state.selectedDate >= state.to;
            elements.today.disabled = state.selectedDate === state.currentAggregationDate;
            elements.selectedCount.textContent = `${records.length}개 세션`;
            elements.timelineEmpty.hidden = records.length > 0;

            const timelineFragment = document.createDocumentFragment();
            records.forEach((record) => {
                const position = timelinePosition(record);
                if (position) timelineFragment.append(createTimelineBar(elements.timelineBarTemplate, record, position));
            });
            elements.timelineTrack.replaceChildren(timelineFragment);

            if (!records.length) {
                elements.list.replaceChildren(elements.recordEmptyTemplate.content.cloneNode(true));
                return;
            }
            const recordFragment = document.createDocumentFragment();
            records.forEach((record, index) => {
                recordFragment.append(createDetailRecord(elements.recordTemplate, record, index));
            });
            elements.list.replaceChildren(recordFragment);
        }

        function render() {
            elements.name.textContent = state.memberName;
            elements.email.textContent = state.memberEmail;
            elements.email.hidden = !state.memberEmail;
            elements.period.textContent = state.from && state.to
                ? `${state.from} ~ ${state.to} · 최근 ${state.periodDays}일`
                : `최근 ${state.periodDays}일의 학습 기록입니다.`;
            elements.periodButtons.forEach((button) => {
                const active = Number(button.dataset.detailPeriodDays) === state.periodDays;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
                button.disabled = state.loading;
            });

            elements.status.textContent = state.loading
                ? "개인 공부 기록을 불러오는 중입니다."
                : state.error || "";
            elements.status.hidden = !state.loading && !state.error;

            renderSummary();
            renderTrendChart();
            renderSelectedDate();
        }

        function selectDate(date) {
            if (!date || date < state.from || date > state.to) return;
            state.selectedDate = date;
            renderTrendChart();
            renderSelectedDate();
        }

        async function loadRecords() {
            const sequence = ++state.requestSequence;
            state.to = state.currentAggregationDate;
            state.from = addDays(state.to, -(state.periodDays - 1));
            if (!state.selectedDate || state.selectedDate < state.from || state.selectedDate > state.to) {
                state.selectedDate = state.to;
            }
            state.loading = true;
            state.error = null;
            state.records = [];
            state.totalStudySeconds = 0;
            render();

            try {
                const response = await window.OmagotchiApi?.manager?.getStudyMemberRecords?.(
                    state.cohortId,
                    state.cohortMembershipId,
                    { from: state.from, to: state.to }
                );
                if (sequence !== state.requestSequence) return;

                if (!Array.isArray(response?.records)) {
                    throw new Error("개인 공부 기록 응답을 확인할 수 없습니다.");
                }
                state.records = response.records;
                state.totalStudySeconds = Number(response.totalStudySeconds) || state.records.reduce(
                    (total, record) => total + (Number(record.studySeconds) || 0),
                    0
                );
            } catch (error) {
                if (sequence !== state.requestSequence) return;
                state.error = error?.message || "개인 공부 기록을 불러오지 못했습니다.";
            } finally {
                if (sequence === state.requestSequence) {
                    state.loading = false;
                    render();
                }
            }
        }

        function close() {
            state.requestSequence += 1;
            trendChart?.destroy();
            trendChart = null;
            dialog.hidden = true;
            state.previousFocus?.focus?.();
        }

        window.openStudyDetailModal = function(options) {
            if (!options?.cohortMembershipId) return;
            state.previousFocus = document.activeElement;
            state.cohortId = options.cohortId;
            state.cohortMembershipId = options.cohortMembershipId;
            state.memberName = options.memberName || "수강생";
            state.memberEmail = options.memberEmail || "";
            state.currentAggregationDate = options.currentAggregationDate || options.to || currentKstAggregationDate();
            state.periodDays = 7;
            state.selectedDate = state.currentAggregationDate;
            dialog.hidden = false;
            elements.closeButtons[0]?.focus();
            loadRecords();
        };

        elements.closeButtons.forEach((button) => button.addEventListener("click", close));
        elements.periodButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const periodDays = Number(button.dataset.detailPeriodDays);
                if (![7, 30].includes(periodDays) || periodDays === state.periodDays) return;
                state.periodDays = periodDays;
                loadRecords();
            });
        });
        elements.dateInput.addEventListener("change", () => selectDate(elements.dateInput.value));
        elements.previousDate.addEventListener("click", () => selectDate(addDays(state.selectedDate, -1)));
        elements.nextDate.addEventListener("click", () => selectDate(addDays(state.selectedDate, 1)));
        elements.today.addEventListener("click", () => selectDate(state.currentAggregationDate));
        elements.timelineTrack.addEventListener("click", (event) => {
            const bar = event.target.closest("[data-timeline-record]");
            if (bar) focusRecord(bar.dataset.timelineRecord);
        });
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !dialog.hidden) close();
        });
    }

    document.addEventListener("DOMContentLoaded", initializeStudyDetailModal);
})();
