/**
 * 관리자 공부 통계의 수강생별 상세 보기.
 * 기간 overview와 선택 날짜 records를 독립적으로 조회한다.
 */
(() => {
    function addDays(isoDate, amount) {
        if (!isoDate) return "";
        const date = new Date(`${isoDate}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return "";
        date.setUTCDate(date.getUTCDate() + amount);
        return date.toISOString().slice(0, 10);
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
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function errorMessage(error, fallback) {
        const requestId = error?.requestId ? ` (요청 ID: ${error.requestId})` : "";
        return `${error?.message || fallback}${requestId}`;
    }

    function trendBackgroundColors(dates, selectedDate) {
        return dates.map((date) => date === selectedDate ? "#176044" : "#9ad9ba");
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
        return article;
    }

    function initializeStudyDetailModal() {
        const dialog = document.querySelector("[data-study-detail-dialog]");
        if (!dialog) return;

        const elements = {
            name: dialog.querySelector("[data-detail-name]"),
            period: dialog.querySelector("[data-detail-period]"),
            status: dialog.querySelector("[data-detail-status]"),
            statusMessage: dialog.querySelector("[data-detail-status-message]"),
            overviewRetry: dialog.querySelector("[data-detail-overview-retry]"),
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
            dailyStatus: dialog.querySelector("[data-detail-daily-status]"),
            dailyStatusMessage: dialog.querySelector("[data-detail-daily-status-message]"),
            dailyRetry: dialog.querySelector("[data-detail-daily-retry]"),
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
            memberLabel: "수강생",
            periodDays: 7,
            requestedPeriodDays: null,
            overviewRetryDays: null,
            currentAggregationDate: null,
            selectedDate: null,
            overview: null,
            overviewLoading: false,
            overviewError: null,
            overviewSequence: 0,
            daily: null,
            dailyLoading: false,
            dailyError: null,
            dailySequence: 0,
            previousFocus: null
        };

        let trendChart = null;
        let trendDates = [];

        function overviewRangeContains(date) {
            return Boolean(date && state.overview
                && date >= state.overview.from && date <= state.overview.to);
        }

        function validOverview(response, requestedDays) {
            if (!response || response.window !== `${requestedDays}d`
                || !response.from || !response.to || response.from > response.to
                || !Array.isArray(response.dailyTotals)) {
                throw new Error("개인 공부 통계 응답을 확인할 수 없습니다.");
            }
            return response;
        }

        function validDaily(response, requestedDate) {
            if (!response || response.date !== requestedDate || !Array.isArray(response.records)) {
                throw new Error("날짜별 공부 기록 응답을 확인할 수 없습니다.");
            }
            return response;
        }

        function renderOverviewStatus() {
            if (state.overviewLoading) {
                elements.statusMessage.textContent = "개인 공부 통계를 불러오는 중입니다.";
                elements.overviewRetry.hidden = true;
                elements.status.hidden = false;
                return;
            }
            if (state.overviewError) {
                elements.statusMessage.textContent = errorMessage(state.overviewError, "개인 공부 통계를 불러오지 못했습니다.");
                elements.overviewRetry.hidden = false;
                elements.status.hidden = false;
                return;
            }
            elements.status.hidden = true;
        }

        function renderOverview() {
            elements.name.textContent = state.memberLabel;
            elements.period.textContent = state.overview
                ? `${state.overview.from} ~ ${state.overview.to} · 최근 ${state.periodDays}일`
                : `최근 ${state.requestedPeriodDays || state.periodDays}일의 학습 기록입니다.`;
            elements.periodButtons.forEach((button) => {
                const days = Number(button.dataset.detailPeriodDays);
                const active = days === state.periodDays;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
                button.disabled = state.overviewLoading;
            });

            const overview = state.overview;
            elements.total.textContent = overview ? formatDuration(overview.totalStudySeconds) : "—";
            elements.average.textContent = overview ? formatDuration(overview.averageDailyStudySeconds) : "—";
            elements.activeDays.textContent = overview ? `${Number(overview.activeStudyDays) || 0}일` : "—";
            elements.recordCount.textContent = overview ? `${Number(overview.recordCount) || 0}회` : "—";
            renderOverviewStatus();
            renderDateControls();
        }

        function renderTrendChart() {
            trendChart?.destroy();
            trendChart = null;
            trendDates = [];
            const totals = state.overview?.dailyTotals || [];
            trendDates = totals.map((item) => item.aggregationDate);
            const hasRecords = totals.some((item) => Number(item.studySeconds) > 0);
            elements.chartEmpty.hidden = !state.overview || state.overviewLoading || hasRecords;
            elements.chart.hidden = !hasRecords;
            if (!hasRecords || typeof window.Chart !== "function") return;

            trendChart = new window.Chart(elements.chart, {
                type: "bar",
                data: {
                    labels: totals.map((item) => formatChartDate(item.aggregationDate)),
                    datasets: [{
                        label: "학습 시간",
                        data: totals.map((item) => Number((Number(item.studySeconds) / 3600).toFixed(2))),
                        backgroundColor: trendBackgroundColors(trendDates, state.selectedDate),
                        hoverBackgroundColor: "#20b978",
                        borderRadius: 0,
                        maxBarThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    resizeDelay: 100,
                    onClick: (_event, activeElements) => {
                        const selected = activeElements[0];
                        if (selected) selectDate(totals[selected.index].aggregationDate);
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) => formatDateLabel(totals[items[0].dataIndex].aggregationDate),
                                label: (context) => ` ${formatDuration(totals[context.dataIndex].studySeconds)}`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { autoSkip: true, color: "#66736c", maxRotation: 0, maxTicksLimit: state.periodDays === 30 ? 10 : 7 } },
                        y: { beginAtZero: true, grid: { color: "#e5eee8" }, ticks: { color: "#66736c", callback: (value) => `${value}h` } }
                    }
                }
            });
        }

        function updateTrendSelection() {
            const dataset = trendChart?.data.datasets[0];
            if (!dataset) return;
            dataset.backgroundColor = trendBackgroundColors(trendDates, state.selectedDate);
            trendChart.update("none");
        }

        function renderDateControls() {
            const from = state.overview?.from || "";
            const to = state.overview?.to || "";
            elements.selectedDateLabel.textContent = formatDateLabel(state.selectedDate);
            elements.dateInput.value = state.selectedDate || "";
            elements.dateInput.min = from;
            elements.dateInput.max = to;
            elements.dateInput.disabled = !state.overview;
            elements.previousDate.disabled = !state.overview || !state.selectedDate || state.selectedDate <= from;
            elements.nextDate.disabled = !state.overview || !state.selectedDate || state.selectedDate >= to;
            elements.today.disabled = !state.overview || state.selectedDate === state.currentAggregationDate;
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

        function renderDailyStatus() {
            if (state.dailyLoading) {
                elements.dailyStatusMessage.textContent = "선택 날짜의 공부 기록을 불러오는 중입니다.";
                elements.dailyRetry.hidden = true;
                elements.dailyStatus.hidden = false;
                return;
            }
            if (state.dailyError) {
                elements.dailyStatusMessage.textContent = errorMessage(state.dailyError, "선택 날짜의 공부 기록을 불러오지 못했습니다.");
                elements.dailyRetry.hidden = false;
                elements.dailyStatus.hidden = false;
                return;
            }
            elements.dailyStatus.hidden = true;
        }

        function renderDaily() {
            renderDateControls();
            renderDailyStatus();
            const matchesSelection = state.daily?.date === state.selectedDate;
            const records = matchesSelection ? state.daily.records : [];
            const total = matchesSelection ? Number(state.daily.totalStudySeconds) || 0 : 0;
            elements.selectedCount.textContent = matchesSelection
                ? `${records.length}개 세션 · ${formatDuration(total)}`
                : "0개 세션";
            elements.timelineEmpty.hidden = state.dailyLoading || Boolean(state.dailyError) || records.length > 0;

            const timelineFragment = document.createDocumentFragment();
            records.forEach((record) => {
                const position = timelinePosition(record);
                if (position) timelineFragment.append(createTimelineBar(elements.timelineBarTemplate, record, position));
            });
            elements.timelineTrack.replaceChildren(timelineFragment);

            if (state.dailyLoading && !matchesSelection) {
                const loading = document.createElement("p");
                loading.className = "study-detail-empty";
                loading.textContent = "날짜별 기록을 불러오는 중입니다.";
                elements.list.replaceChildren(loading);
                return;
            }
            if (state.dailyError && !matchesSelection) {
                const failure = document.createElement("p");
                failure.className = "study-detail-empty";
                failure.textContent = "날짜별 기록을 표시할 수 없습니다.";
                elements.list.replaceChildren(failure);
                return;
            }
            if (!records.length) {
                elements.list.replaceChildren(elements.recordEmptyTemplate.content.cloneNode(true));
                return;
            }
            const fragment = document.createDocumentFragment();
            records.forEach((record, index) => fragment.append(createDetailRecord(elements.recordTemplate, record, index)));
            elements.list.replaceChildren(fragment);
        }

        function focusRecord(recordId) {
            const escapedId = CSS.escape(String(recordId));
            const row = elements.list.querySelector(`[data-detail-record-id="${escapedId}"]`);
            if (!row) return;
            elements.list.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
            elements.timelineTrack.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
            elements.timelineTrack.querySelector(`[data-timeline-record="${escapedId}"]`)?.classList.add("is-selected");
            row.classList.add("is-selected");
            row.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        async function loadDaily(date = state.selectedDate) {
            if (!overviewRangeContains(date)) {
                renderDateControls();
                return;
            }
            const sequence = ++state.dailySequence;
            const cohortAtRequest = state.cohortId;
            const membershipAtRequest = state.cohortMembershipId;
            if (state.daily?.date !== date) state.daily = null;
            state.dailyLoading = true;
            state.dailyError = null;
            renderDaily();
            try {
                const response = validDaily(await window.OmagotchiApi?.manager?.getStudyMemberRecords?.(
                    cohortAtRequest,
                    membershipAtRequest,
                    date
                ), date);
                if (sequence !== state.dailySequence || cohortAtRequest !== state.cohortId
                    || membershipAtRequest !== state.cohortMembershipId || date !== state.selectedDate) return;
                state.daily = response;
            } catch (error) {
                if (sequence !== state.dailySequence || cohortAtRequest !== state.cohortId
                    || membershipAtRequest !== state.cohortMembershipId || date !== state.selectedDate) return;
                state.dailyError = error;
                console.error("Failed to load member daily study records:", error);
            } finally {
                if (sequence === state.dailySequence) {
                    state.dailyLoading = false;
                    renderDaily();
                }
            }
        }

        function selectDate(date) {
            if (!overviewRangeContains(date)) {
                renderDateControls();
                return;
            }
            if (date === state.selectedDate) {
                renderDateControls();
                if (state.dailyError || state.daily?.date !== date) void loadDaily(date);
                return;
            }
            state.dailySequence += 1;
            state.selectedDate = date;
            state.daily = null;
            state.dailyError = null;
            state.dailyLoading = false;
            updateTrendSelection();
            renderDaily();
            void loadDaily(date);
        }

        async function loadOverview(requestedDays = state.periodDays) {
            if (![7, 30].includes(requestedDays)) return;
            const sequence = ++state.overviewSequence;
            const cohortAtRequest = state.cohortId;
            const membershipAtRequest = state.cohortMembershipId;
            const currentAtRequest = state.currentAggregationDate;
            const followedCurrentAtRequest = state.selectedDate === currentAtRequest;
            state.requestedPeriodDays = requestedDays;
            state.overviewLoading = true;
            state.overviewError = null;
            renderOverview();
            try {
                const response = validOverview(await window.OmagotchiApi?.manager?.getStudyMemberOverview?.(
                    cohortAtRequest,
                    membershipAtRequest,
                    `${requestedDays}d`
                ), requestedDays);
                if (sequence !== state.overviewSequence || cohortAtRequest !== state.cohortId
                    || membershipAtRequest !== state.cohortMembershipId) return;

                const followsCurrent = followedCurrentAtRequest && state.selectedDate === currentAtRequest;
                const outside = !state.selectedDate || state.selectedDate < response.from || state.selectedDate > response.to;
                const previousSelectedDate = state.selectedDate;
                state.overview = response;
                state.periodDays = requestedDays;
                state.overviewRetryDays = null;
                state.currentAggregationDate = response.to;
                if (followsCurrent || outside) state.selectedDate = response.to;
                renderOverview();
                renderTrendChart();

                if (state.selectedDate !== previousSelectedDate || state.daily?.date !== state.selectedDate) {
                    state.dailySequence += 1;
                    state.daily = null;
                    state.dailyError = null;
                    state.dailyLoading = false;
                    renderDaily();
                    void loadDaily(state.selectedDate);
                } else {
                    updateTrendSelection();
                    renderDaily();
                }
            } catch (error) {
                if (sequence !== state.overviewSequence || cohortAtRequest !== state.cohortId
                    || membershipAtRequest !== state.cohortMembershipId) return;
                state.overviewError = error;
                state.overviewRetryDays = requestedDays;
                console.error("Failed to load member study overview:", error);
            } finally {
                if (sequence === state.overviewSequence) {
                    state.overviewLoading = false;
                    state.requestedPeriodDays = null;
                    renderOverview();
                }
            }
        }

        function close() {
            state.overviewSequence += 1;
            state.dailySequence += 1;
            state.overviewLoading = false;
            state.dailyLoading = false;
            trendChart?.destroy();
            trendChart = null;
            trendDates = [];
            dialog.hidden = true;
            state.previousFocus?.focus?.();
        }

        window.openStudyDetailModal = function(options) {
            if (!options?.cohortId || !options?.cohortMembershipId) return;
            state.overviewSequence += 1;
            state.dailySequence += 1;
            state.previousFocus = document.activeElement;
            state.cohortId = options.cohortId;
            state.cohortMembershipId = options.cohortMembershipId;
            state.memberLabel = options.memberLabel || `수강생 #${options.cohortMembershipId}`;
            state.periodDays = 7;
            state.requestedPeriodDays = null;
            state.overviewRetryDays = null;
            state.currentAggregationDate = options.currentAggregationDate || currentKstAggregationDate();
            state.selectedDate = state.currentAggregationDate;
            state.overview = null;
            state.overviewLoading = false;
            state.overviewError = null;
            state.daily = null;
            state.dailyLoading = false;
            state.dailyError = null;
            trendChart?.destroy();
            trendChart = null;
            trendDates = [];
            elements.chart.hidden = true;
            elements.chartEmpty.hidden = true;
            dialog.hidden = false;
            renderOverview();
            renderDaily();
            elements.closeButtons[0]?.focus();
            void loadOverview(7);
        };

        elements.closeButtons.forEach((button) => button.addEventListener("click", close));
        elements.periodButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const days = Number(button.dataset.detailPeriodDays);
                if (![7, 30].includes(days)) return;
                if (days === state.periodDays && !state.overviewError) return;
                void loadOverview(days);
            });
        });
        elements.overviewRetry.addEventListener("click", () => {
            void loadOverview(state.overviewRetryDays || state.periodDays);
        });
        elements.dailyRetry.addEventListener("click", () => void loadDaily());
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
