(() => {
    const PAGE_SIZE = 10;
    const TOP_SIZE = 5;
    const DEFAULT_SORT = Object.freeze({ field: "periodStudySeconds", direction: "desc" });
    const BUCKET_LABELS = Object.freeze({
        NO_RECORD: "기록 없음",
        UNDER_ONE_HOUR: "1시간 미만",
        ONE_TO_TWO_HOURS: "1~2시간",
        TWO_TO_FOUR_HOURS: "2~4시간",
        FOUR_HOURS_OR_MORE: "4시간 이상"
    });

    function createResource() {
        return { data: null, loading: false, error: null, sequence: 0 };
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

    function formatDateTime(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function errorMessage(error, fallback) {
        const requestId = error?.requestId ? ` (요청 ID: ${error.requestId})` : "";
        return `${error?.message || fallback}${requestId}`;
    }

    function assertPage(response) {
        if (!response || !Array.isArray(response.items)
            || !Number.isInteger(response.page) || !Number.isInteger(response.totalPages)) {
            throw new Error("수강생 공부 통계 응답을 확인할 수 없습니다.");
        }
        return response;
    }

    function createEmptyRow(template, message) {
        const row = template.content.firstElementChild.cloneNode(true);
        row.querySelector("[data-studystats-empty-message]").textContent = message;
        return row;
    }

    function createPageButton(template, pageNumber, currentPage) {
        const button = template.content.firstElementChild.cloneNode(true);
        const current = pageNumber === currentPage;
        button.classList.toggle("is-active", current);
        button.dataset.goPage = String(pageNumber);
        button.textContent = String(pageNumber + 1);
        button.setAttribute("aria-label", `${pageNumber + 1}페이지`);
        if (current) button.setAttribute("aria-current", "page");
        return button;
    }

    function createMemberRow(template, member) {
        const row = template.content.firstElementChild.cloneNode(true);
        const membershipId = String(member.cohortMembershipId ?? "");
        const label = `수강생 #${membershipId}`;
        row.querySelector("[data-studystats-member-label]").textContent = label;
        row.querySelector("[data-studystats-today]").textContent = formatDuration(member.todayStudySeconds);
        row.querySelector("[data-studystats-period-total]").textContent = formatDuration(member.periodStudySeconds);
        row.querySelector("[data-studystats-active-days]").textContent = `${Number(member.activeStudyDays) || 0}일`;
        row.querySelector("[data-studystats-record-count]").textContent = `${Number(member.recordCount) || 0}회`;
        row.querySelector("[data-studystats-last-studied]").textContent = formatDateTime(member.lastStudiedAt);
        row.querySelectorAll("[data-view-detail]").forEach((button) => {
            button.dataset.viewDetail = membershipId;
            button.dataset.viewLabel = label;
        });
        return row;
    }

    function create({ root, getToday, getTrend, getMembers, openMemberDetail }) {
        if (!root) throw new Error("Study statistics panel root is required.");
        if (![getToday, getTrend, getMembers].every((dependency) => typeof dependency === "function")) {
            throw new Error("Study statistics API functions are required.");
        }

        const elements = {
            period: root.querySelector("[data-studystats-period]"),
            list: root.querySelector("[data-studystats-list]"),
            pageNumbers: root.querySelector("[data-page-numbers]"),
            totalTime: root.querySelector("[data-kpi-total-time]"),
            participation: root.querySelector("[data-kpi-participation]"),
            averageTime: root.querySelector("[data-kpi-avg-time]"),
            noRecord: root.querySelector("[data-kpi-no-record]"),
            trendTitle: root.querySelector("[data-trend-chart-title]"),
            topTitle: root.querySelector("[data-top-chart-title]"),
            trendChart: root.querySelector("#trendChart"),
            topChart: root.querySelector("#topStudentsChart"),
            durationChart: root.querySelector("#durationDistributionChart"),
            rowTemplate: root.querySelector("[data-studystats-row-template]"),
            emptyTemplate: root.querySelector("[data-studystats-empty-template]"),
            pageTemplate: root.querySelector("[data-studystats-page-template]"),
            statuses: new Map([...root.querySelectorAll("[data-study-status]")]
                .map((element) => [element.dataset.studyStatus, element]))
        };

        const state = {
            active: false,
            cohortId: null,
            periodDays: 7,
            page: 0,
            sort: { ...DEFAULT_SORT },
            today: createResource(),
            trend: createResource(),
            members: createResource(),
            top: createResource()
        };
        const charts = { trend: null, top: null, duration: null };

        function selectedWindow() {
            return `${state.periodDays}d`;
        }

        function renderStatus(key, resource, loadingMessage, failureMessage) {
            const status = elements.statuses.get(key);
            if (!status) return;
            const message = status.querySelector("[data-study-status-message]");
            const retry = status.querySelector("[data-study-retry]");
            if (resource.loading) {
                message.textContent = loadingMessage;
                retry.hidden = true;
                status.hidden = false;
                return;
            }
            if (resource.error) {
                message.textContent = errorMessage(resource.error, failureMessage);
                retry.hidden = false;
                status.hidden = false;
                return;
            }
            status.hidden = true;
        }

        function renderToday() {
            const today = state.today.data;
            elements.totalTime.textContent = today ? formatDuration(today.totalStudySeconds) : "—";
            if (today) {
                const active = Number(today.activeStudentCount) || 0;
                const participants = Number(today.participantCount) || 0;
                const rate = active ? Math.round(participants * 100 / active) : 0;
                elements.participation.textContent = `${participants} / ${active}명 (${rate}%)`;
                elements.averageTime.textContent = formatDuration(today.averageParticipantStudySeconds);
                elements.noRecord.textContent = `${Number(today.noRecordStudentCount) || 0}명`;
            } else {
                elements.participation.textContent = "—";
                elements.averageTime.textContent = "—";
                elements.noRecord.textContent = "—";
            }
            renderStatus("today", state.today, "오늘 통계를 불러오는 중입니다.", "오늘 통계를 불러오지 못했습니다.");
            renderDurationChart();
        }

        function renderPagination(pageData) {
            const totalPages = Number(pageData?.totalPages) || 0;
            if (!elements.pageNumbers || totalPages <= 1) {
                elements.pageNumbers?.replaceChildren();
                return;
            }
            const start = Math.max(0, Math.min(state.page - 2, totalPages - 5));
            const end = Math.min(totalPages, start + 5);
            const fragment = document.createDocumentFragment();
            for (let pageNumber = start; pageNumber < end; pageNumber += 1) {
                fragment.append(createPageButton(elements.pageTemplate, pageNumber, state.page));
            }
            elements.pageNumbers.replaceChildren(fragment);
        }

        function renderSort() {
            root.querySelectorAll("[data-sort-heading]").forEach((heading) => {
                const active = heading.dataset.sortHeading === state.sort.field;
                const direction = active ? state.sort.direction : null;
                heading.setAttribute(
                    "aria-sort",
                    direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"
                );
                const icon = heading.querySelector("[aria-hidden='true']");
                if (icon) icon.textContent = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
            });
        }

        function renderMembers() {
            renderStatus("members", state.members, "수강생 통계를 불러오는 중입니다.", "수강생 통계를 불러오지 못했습니다.");
            renderSort();
            const pageData = state.members.data;
            if (!pageData) {
                elements.list.replaceChildren(createEmptyRow(
                    elements.emptyTemplate,
                    state.members.loading ? "수강생 통계를 불러오는 중입니다." : "수강생 통계를 불러오지 못했습니다."
                ));
                renderPagination(null);
                return;
            }
            if (!pageData.items.length) {
                elements.list.replaceChildren(createEmptyRow(elements.emptyTemplate, "조회된 수강생이 없습니다."));
            } else {
                const fragment = document.createDocumentFragment();
                pageData.items.forEach((member) => fragment.append(createMemberRow(elements.rowTemplate, member)));
                elements.list.replaceChildren(fragment);
            }
            renderPagination(pageData);
        }

        function destroyChart(key) {
            charts[key]?.destroy();
            charts[key] = null;
        }

        function renderTrendChart() {
            elements.trendTitle.textContent = `최근 ${state.periodDays}일 기수 학습량 추이`;
            renderStatus("trend", state.trend, "기수 학습량 추이를 불러오는 중입니다.", "기수 학습량 추이를 불러오지 못했습니다.");
            destroyChart("trend");
            const dailyTotals = state.trend.data?.dailyTotals;
            if (typeof window.Chart !== "function" || !Array.isArray(dailyTotals)) return;
            charts.trend = new window.Chart(elements.trendChart, {
                type: "line",
                data: {
                    labels: dailyTotals.map((item) => item.aggregationDate.slice(5).replace("-", "/")),
                    datasets: [{
                        label: "학습량 (시간)",
                        data: dailyTotals.map((item) => Number((Number(item.studySeconds) / 3600).toFixed(2))),
                        borderColor: "#2b5c43",
                        backgroundColor: "rgba(43, 92, 67, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    resizeDelay: 100,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { autoSkip: true, maxRotation: 0, maxTicksLimit: state.periodDays === 30 ? 8 : 7 } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        function renderTopChart() {
            elements.topTitle.textContent = `최근 ${state.periodDays}일 학습량 Top 5`;
            renderStatus("top", state.top, "상위 학습량을 불러오는 중입니다.", "상위 학습량을 불러오지 못했습니다.");
            destroyChart("top");
            const members = state.top.data?.items;
            if (typeof window.Chart !== "function" || !Array.isArray(members)) return;
            charts.top = new window.Chart(elements.topChart, {
                type: "bar",
                data: {
                    labels: members.map((member) => `수강생 #${member.cohortMembershipId}`),
                    datasets: [{
                        label: "조회 기간 학습 (시간)",
                        data: members.map((member) => Number((Number(member.periodStudySeconds) / 3600).toFixed(2))),
                        backgroundColor: "#529b74",
                        borderRadius: 0
                    }]
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    resizeDelay: 100,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } }
                }
            });
        }

        function renderDurationChart() {
            destroyChart("duration");
            const buckets = state.today.data?.durationBuckets;
            if (typeof window.Chart !== "function" || !Array.isArray(buckets)) return;
            charts.duration = new window.Chart(elements.durationChart, {
                type: "doughnut",
                data: {
                    labels: buckets.map((bucket) => BUCKET_LABELS[bucket.code] || bucket.code),
                    datasets: [{
                        data: buckets.map((bucket) => Number(bucket.memberCount) || 0),
                        backgroundColor: ["#d7e4dc", "#c2e3d3", "#8ecbb0", "#529b74", "#2b5c43"],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    resizeDelay: 100,
                    plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12, usePointStyle: true } } }
                }
            });
        }

        function renderAll() {
            if (!state.active) return;
            renderToday();
            renderTrendChart();
            renderTopChart();
            renderMembers();
        }

        function cancelResource(resource) {
            resource.sequence += 1;
            resource.loading = false;
        }

        function clearResource(resource) {
            cancelResource(resource);
            resource.data = null;
            resource.error = null;
        }

        async function loadToday() {
            const resource = state.today;
            const cohortAtRequest = state.cohortId;
            const sequence = ++resource.sequence;
            resource.loading = true;
            resource.error = null;
            renderToday();
            try {
                const response = await getToday(cohortAtRequest);
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId) return;
                resource.data = response;
            } catch (error) {
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId) return;
                resource.error = error;
                console.error("Failed to load today's study statistics:", error);
            } finally {
                if (sequence === resource.sequence) {
                    resource.loading = false;
                    if (state.active) renderToday();
                }
            }
        }

        async function loadTrend() {
            const resource = state.trend;
            const cohortAtRequest = state.cohortId;
            const windowAtRequest = selectedWindow();
            const sequence = ++resource.sequence;
            resource.loading = true;
            resource.error = null;
            renderTrendChart();
            try {
                const response = await getTrend(cohortAtRequest, windowAtRequest);
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId || windowAtRequest !== selectedWindow()) return;
                if (!Array.isArray(response?.dailyTotals)) throw new Error("기수 학습량 추이 응답을 확인할 수 없습니다.");
                resource.data = response;
            } catch (error) {
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId) return;
                resource.error = error;
                console.error("Failed to load study trend:", error);
            } finally {
                if (sequence === resource.sequence) {
                    resource.loading = false;
                    if (state.active) renderTrendChart();
                }
            }
        }

        async function loadMembers() {
            const resource = state.members;
            const cohortAtRequest = state.cohortId;
            const windowAtRequest = selectedWindow();
            const pageAtRequest = state.page;
            const sortAtRequest = `${state.sort.field},${state.sort.direction}`;
            const sequence = ++resource.sequence;
            resource.loading = true;
            resource.error = null;
            renderMembers();
            try {
                const response = assertPage(await getMembers(cohortAtRequest, {
                    window: windowAtRequest,
                    page: pageAtRequest,
                    size: PAGE_SIZE,
                    sort: sortAtRequest
                }));
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId
                    || windowAtRequest !== selectedWindow()
                    || sortAtRequest !== `${state.sort.field},${state.sort.direction}`) return;
                if (response.totalPages > 0 && pageAtRequest >= response.totalPages) {
                    resource.loading = false;
                    state.page = response.totalPages - 1;
                    void loadMembers();
                    return;
                }
                state.page = response.totalPages === 0 ? 0 : response.page;
                resource.data = response;
            } catch (error) {
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId) return;
                resource.error = error;
                console.error("Failed to load member study statistics:", error);
            } finally {
                if (sequence === resource.sequence) {
                    resource.loading = false;
                    if (state.active) renderMembers();
                }
            }
        }

        async function loadTop() {
            const resource = state.top;
            const cohortAtRequest = state.cohortId;
            const windowAtRequest = selectedWindow();
            const sequence = ++resource.sequence;
            resource.loading = true;
            resource.error = null;
            renderTopChart();
            try {
                const response = assertPage(await getMembers(cohortAtRequest, {
                    window: windowAtRequest,
                    page: 0,
                    size: TOP_SIZE,
                    sort: "periodStudySeconds,desc"
                }));
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId || windowAtRequest !== selectedWindow()) return;
                resource.data = response;
            } catch (error) {
                if (sequence !== resource.sequence || cohortAtRequest !== state.cohortId) return;
                resource.error = error;
                console.error("Failed to load top study statistics:", error);
            } finally {
                if (sequence === resource.sequence) {
                    resource.loading = false;
                    if (state.active) renderTopChart();
                }
            }
        }

        function loadMissingResources() {
            if (!state.today.data && !state.today.loading) void loadToday();
            if (!state.trend.data && !state.trend.loading) void loadTrend();
            if (!state.members.data && !state.members.loading) void loadMembers();
            if (!state.top.data && !state.top.loading) void loadTop();
        }

        function resetForCohort() {
            [state.today, state.trend, state.members, state.top].forEach(clearResource);
            state.page = 0;
            Object.keys(charts).forEach(destroyChart);
        }

        function invalidate() {
            resetForCohort();
            if (state.active) {
                renderAll();
                loadMissingResources();
            }
        }

        function activate(context = {}) {
            const cohortChanged = state.cohortId !== context.cohortId;
            state.cohortId = context.cohortId;
            state.active = true;
            if (cohortChanged) resetForCohort();
            renderAll();
            loadMissingResources();
        }

        function deactivate() {
            state.active = false;
            [state.today, state.trend, state.members, state.top].forEach(cancelResource);
            Object.keys(charts).forEach(destroyChart);
        }

        elements.period?.addEventListener("change", () => {
            const days = Number(elements.period.value);
            if (![7, 30].includes(days) || days === state.periodDays) return;
            state.periodDays = days;
            state.page = 0;
            [state.trend, state.members, state.top].forEach(clearResource);
            if (state.active) {
                renderTrendChart();
                renderTopChart();
                renderMembers();
                void loadTrend();
                void loadMembers();
                void loadTop();
            }
        });

        root.addEventListener("click", (event) => {
            const sortButton = event.target.closest("[data-study-sort]");
            if (sortButton) {
                const field = sortButton.dataset.studySort;
                state.sort = state.sort.field === field
                    ? { field, direction: state.sort.direction === "asc" ? "desc" : "asc" }
                    : { field, direction: "asc" };
                state.page = 0;
                clearResource(state.members);
                renderMembers();
                if (state.active) void loadMembers();
                return;
            }

            const pageButton = event.target.closest("[data-go-page]");
            if (pageButton) {
                const targetPage = Number(pageButton.dataset.goPage);
                if (!Number.isInteger(targetPage) || targetPage === state.page) return;
                state.page = targetPage;
                clearResource(state.members);
                renderMembers();
                if (state.active) void loadMembers();
                return;
            }

            const retry = event.target.closest("[data-study-retry]");
            if (retry) {
                const loaders = { today: loadToday, trend: loadTrend, members: loadMembers, top: loadTop };
                void loaders[retry.dataset.studyRetry]?.();
                return;
            }

            const detail = event.target.closest("[data-view-detail]");
            if (!detail || !state.members.data) return;
            openMemberDetail?.({
                cohortId: state.cohortId,
                cohortMembershipId: detail.dataset.viewDetail,
                memberLabel: detail.dataset.viewLabel,
                currentAggregationDate: state.members.data.to
            });
        });

        return Object.freeze({ activate, deactivate, invalidate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "studyStats",
        route: "study-stats",
        label: "공부 통계",
        order: 80,
        topics: ["selection"],
        invalidateOn: ["selection"],
        create
    });
})();
