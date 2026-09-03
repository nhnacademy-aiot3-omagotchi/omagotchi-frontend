(() => {
    const PAGE_SIZE = 5;
    const DEFAULT_BOUNDARY_NOTE = "Asia/Seoul 오전 4시를 하루의 시작으로 집계합니다.";

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
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(new Date(value));
    }

    function createEmptyRow(template, message) {
        const row = template.content.firstElementChild.cloneNode(true);
        row.querySelector("[data-studystats-empty-message]").textContent = message;
        return row;
    }

    function createPageButton(template, pageNumber, currentPage) {
        const button = template.content.firstElementChild.cloneNode(true);
        button.classList.toggle("is-active", pageNumber === currentPage);
        button.dataset.goPage = String(pageNumber);
        button.textContent = String(pageNumber + 1);
        return button;
    }

    function createMemberRow(template, member) {
        const row = template.content.firstElementChild.cloneNode(true);
        const membershipId = String(member.cohortMembershipId ?? "");
        const name = String(member.name ?? "");
        const email = String(member.email ?? "");
        const runningBadge = row.querySelector("[data-studystats-running]");

        row.querySelector("[data-studystats-member-name]").textContent = name;
        runningBadge.hidden = !member.isRunning;
        row.querySelector("[data-studystats-member-email]").textContent = email;
        row.querySelector("[data-studystats-today]").textContent = formatDuration(member.todayStudySeconds);
        row.querySelector("[data-studystats-period-total]").textContent = formatDuration(member.periodStudySeconds);
        row.querySelector("[data-studystats-active-days]").textContent = `${Number(member.activeStudyDays) || 0}일`;
        row.querySelector("[data-studystats-last-studied]").textContent = formatDateTime(member.lastStudiedAt);
        row.querySelectorAll("[data-view-detail]").forEach((button) => {
            button.dataset.viewDetail = membershipId;
            button.dataset.viewName = name;
            button.dataset.viewEmail = email;
        });
        return row;
    }

    function create({
        root,
        fetchTodayStats = (cid) => window.OmagotchiApi?.manager?.getStudyStatsToday?.(cid),
        fetchTrendStats = (cid, win) => window.OmagotchiApi?.manager?.getStudyStatsTrend?.(cid, win),
        fetchMemberStats = (cid, q) => window.OmagotchiApi?.manager?.getStudyStatsMembers?.(cid, q),
        getMemberProfiles,
        openMemberDetail
    }) {
        if (!root) {
            throw new Error("Study statistics panel root is required.");
        }

        const elements = {
            search: root.querySelector("[data-studystats-search]"),
            period: root.querySelector("[data-studystats-period]"),
            list: root.querySelector("[data-studystats-list]"),
            pageNumbers: root.querySelector("[data-page-numbers]"),
            totalTime: root.querySelector("[data-kpi-total-time]"),
            participation: root.querySelector("[data-kpi-participation]"),
            averageTime: root.querySelector("[data-kpi-avg-time]"),
            runningTimer: root.querySelector("[data-kpi-running-timer]"),
            trendTitle: root.querySelector("[data-trend-chart-title]"),
            topTitle: root.querySelector("[data-top-chart-title]"),
            boundaryNote: root.querySelector("[data-study-boundary-note]"),
            trendChart: root.querySelector("#trendChart"),
            topStudentsChart: root.querySelector("#topStudentsChart"),
            durationDistributionChart: root.querySelector("#durationDistributionChart"),
            rowTemplate: root.querySelector("[data-studystats-row-template]"),
            emptyTemplate: root.querySelector("[data-studystats-empty-template]"),
            pageTemplate: root.querySelector("[data-studystats-page-template]")
        };

        let active = false;
        let cohortId;
        let page = 0;
        let sort = { key: "period", dir: "desc" };
        let todayData = null;
        let trendData = null;
        let membersData = null;
        let loading = false;
        let requestSequence = 0;
        let trendChartInstance = null;
        let topStudentsChartInstance = null;
        let durationDistributionChartInstance = null;

        function selectedPeriodDays() {
            return Number(elements.period?.value) || 7;
        }

        function memberRows() {
            if (!membersData?.items) return [];
            const profiles = getMemberProfiles?.() || [];
            const profileByUserId = new Map(
                profiles.map((member) => [String(member.userId ?? member.id), member])
            );
            const profileByMembershipId = new Map(
                profiles
                    .filter((member) => member.cohortMembershipId ?? member.membershipId)
                    .map((member) => [String(member.cohortMembershipId ?? member.membershipId), member])
            );

            return membersData.items.map((memberStatistics) => {
                const profile = profileByUserId.get(String(memberStatistics.userId))
                    || profileByMembershipId.get(String(memberStatistics.cohortMembershipId));
                return {
                    ...memberStatistics,
                    name: memberStatistics.nickname
                        || profile?.nickname
                        || "닉네임 미설정",
                    email: profile?.email || "-"
                };
            });
        }

        function sortedAndFilteredMembers() {
            const query = (elements.search?.value || "").trim().toLowerCase();
            const direction = sort.dir === "desc" ? -1 : 1;
            const selectors = {
                name: (member) => member.name.toLocaleLowerCase("ko-KR"),
                today: (member) => Number(member.todayStudySeconds) || 0,
                period: (member) => Number(member.periodStudySeconds) || 0,
                days: (member) => Number(member.activeStudyDays) || 0,
                last: (member) => member.lastStudiedAt || ""
            };
            const selector = selectors[sort.key] || selectors.period;

            return memberRows()
                .filter((member) => member.name.toLowerCase().includes(query)
                    || member.email.toLowerCase().includes(query))
                .sort((left, right) => {
                    const a = selector(left);
                    const b = selector(right);
                    if (typeof a === "string") return a.localeCompare(b, "ko-KR") * direction;
                    return (a - b) * direction;
                });
        }

        function renderPagination(totalPages) {
            if (!elements.pageNumbers) return;
            if (totalPages <= 1) {
                elements.pageNumbers.replaceChildren();
                return;
            }

            const start = Math.max(0, Math.min(page - 2, totalPages - 5));
            const end = Math.min(totalPages, start + 5);
            const fragment = document.createDocumentFragment();
            for (let pageNumber = start; pageNumber < end; pageNumber += 1) {
                fragment.append(createPageButton(elements.pageTemplate, pageNumber, page));
            }
            elements.pageNumbers.replaceChildren(fragment);
        }

        function renderTable() {
            if (!elements.list) return;
            if (loading) {
                elements.list.replaceChildren(createEmptyRow(
                    elements.emptyTemplate,
                    "공부 통계를 불러오는 중입니다."
                ));
                renderPagination(0);
                return;
            }
            if (!membersData) {
                elements.list.replaceChildren(createEmptyRow(
                    elements.emptyTemplate,
                    "공부 통계를 불러오지 못했습니다."
                ));
                renderPagination(0);
                return;
            }

            const members = sortedAndFilteredMembers();
            const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
            page = Math.min(page, totalPages - 1);
            const currentPage = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

            if (!currentPage.length) {
                elements.list.replaceChildren(createEmptyRow(
                    elements.emptyTemplate,
                    "조회된 수강생이 없습니다."
                ));
            } else {
                const fragment = document.createDocumentFragment();
                currentPage.forEach((member) => fragment.append(createMemberRow(elements.rowTemplate, member)));
                elements.list.replaceChildren(fragment);
            }

            renderPagination(totalPages);
            root.querySelectorAll(".sortable").forEach((heading) => {
                if (heading.dataset.sort === sort.key) heading.dataset.dir = sort.dir;
                else delete heading.dataset.dir;
            });
        }

        function destroyCharts() {
            trendChartInstance?.destroy();
            topStudentsChartInstance?.destroy();
            durationDistributionChartInstance?.destroy();
            trendChartInstance = null;
            topStudentsChartInstance = null;
            durationDistributionChartInstance = null;
        }

        function renderCharts() {
            const activeStudentCount = Number(todayData?.activeStudentCount) || 0;
            const participantCount = Number(todayData?.participantCount) || 0;
            const participationRate = activeStudentCount
                ? Math.round(participantCount * 100 / activeStudentCount)
                : 0;

            elements.totalTime.textContent = formatDuration(todayData?.totalStudySeconds);
            elements.participation.textContent = `${participantCount} / ${activeStudentCount}명 (${participationRate}%)`;
            elements.averageTime.textContent = formatDuration(todayData?.averageParticipantStudySeconds);
            elements.runningTimer.textContent = `${Number(todayData?.runningTimerCount) || 0}명`;

            const periodDays = selectedPeriodDays();
            elements.trendTitle.textContent = `최근 ${periodDays}일 기수 학습량 추이`;
            elements.topTitle.textContent = `최근 ${periodDays}일 학습량 Top 5`;
            elements.boundaryNote.textContent = DEFAULT_BOUNDARY_NOTE;

            destroyCharts();
            const ChartConstructor = window.Chart;
            if (!ChartConstructor) return;

            const dailyTotals = trendData?.dailyTotals || [];
            const topMembers = memberRows()
                .filter((member) => member.periodStudySeconds > 0)
                .sort((a, b) => b.periodStudySeconds - a.periodStudySeconds)
                .slice(0, 5);
            const bucketLabels = {
                NO_RECORD: "기록 없음",
                UNDER_ONE_HOUR: "1시간 미만",
                ONE_TO_TWO_HOURS: "1~2시간",
                TWO_TO_FOUR_HOURS: "2~4시간",
                FOUR_HOURS_OR_MORE: "4시간 이상"
            };

            if (elements.trendChart && dailyTotals.length) {
                trendChartInstance = new ChartConstructor(elements.trendChart, {
                    type: "line",
                    data: {
                        labels: dailyTotals.map((item) => String(item.aggregationDate).slice(5).replace("-", "/")),
                        datasets: [{
                            label: "학습량 (시간)",
                            data: dailyTotals.map((item) => Number(((Number(item.studySeconds) || 0) / 3600).toFixed(2))),
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
                            x: {
                                ticks: {
                                    autoSkip: true,
                                    maxRotation: 0,
                                    maxTicksLimit: periodDays === 30 ? 8 : 7
                                }
                            },
                            y: { beginAtZero: true }
                        }
                    }
                });
            }

            if (elements.topStudentsChart) {
                topStudentsChartInstance = new ChartConstructor(elements.topStudentsChart, {
                    type: "bar",
                    data: {
                        labels: topMembers.length ? topMembers.map((member) => member.name) : ["기록 없음"],
                        datasets: [{
                            label: "조회 기간 학습 (시간)",
                            data: topMembers.length ? topMembers.map((member) => Number(((Number(member.periodStudySeconds) || 0) / 3600).toFixed(2))) : [0],
                            backgroundColor: "#529b74",
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        resizeDelay: 100,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true },
                            y: { ticks: { autoSkip: false } }
                        }
                    }
                });
            }

            if (elements.durationDistributionChart && todayData?.durationBuckets) {
                durationDistributionChartInstance = new ChartConstructor(elements.durationDistributionChart, {
                    type: "doughnut",
                    data: {
                        labels: todayData.durationBuckets.map((bucket) => bucketLabels[bucket.code] || bucket.code),
                        datasets: [{
                            data: todayData.durationBuckets.map((bucket) => Number(bucket.memberCount) || 0),
                            backgroundColor: ["#d7e4dc", "#c2e3d3", "#8ecbb0", "#529b74", "#2b5c43"],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        resizeDelay: 100,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: {
                                    boxWidth: 10,
                                    padding: 12,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });
            }
        }

        function render() {
            if (!active) return;
            renderTable();
            renderCharts();
        }

        function reset() {
            requestSequence += 1;
            todayData = null;
            trendData = null;
            membersData = null;
            loading = false;
            page = 0;
            destroyCharts();
        }

        async function loadStatistics() {
            const sequence = ++requestSequence;
            loading = true;
            todayData = null;
            trendData = null;
            membersData = null;
            page = 0;
            render();

            const periodDays = selectedPeriodDays();
            const windowParam = `${periodDays}d`;

            try {
                const [todayRes, trendRes, membersRes] = await Promise.all([
                    fetchTodayStats(cohortId),
                    fetchTrendStats(cohortId, windowParam),
                    fetchMemberStats(cohortId, {
                        window: windowParam,
                        page: 0,
                        size: 100,
                        sort: "periodStudySeconds,desc"
                    })
                ]);

                if (sequence !== requestSequence) return;
                loading = false;
                todayData = todayRes;
                trendData = trendRes;
                membersData = membersRes;
                page = 0;
                render();
            } catch (error) {
                if (sequence !== requestSequence) return;
                loading = false;
                todayData = null;
                trendData = null;
                membersData = null;
                render();
                console.error("Failed to load study statistics:", error);
            }
        }

        function invalidate() {
            reset();
        }

        function activate(context = {}) {
            const cohortChanged = cohortId !== context.cohortId;
            cohortId = context.cohortId;
            active = true;
            if (cohortChanged) reset();
            if (!todayData && !loading) {
                void loadStatistics();
                return;
            }
            render();
        }

        function deactivate() {
            active = false;
            if (loading) {
                requestSequence += 1;
                loading = false;
            }
            destroyCharts();
        }

        elements.search?.addEventListener("input", () => {
            page = 0;
            renderTable();
        });

        elements.period?.addEventListener("change", () => {
            reset();
            if (active) void loadStatistics();
        });

        root.querySelectorAll(".sortable").forEach((heading) => {
            heading.addEventListener("click", () => {
                const key = heading.dataset.sort;
                if (sort.key === key) {
                    sort.dir = sort.dir === "asc" ? "desc" : "asc";
                } else {
                    sort = { key, dir: "desc" };
                }
                page = 0;
                renderTable();
            });
        });

        elements.pageNumbers?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-go-page]");
            if (!button) return;
            page = Number(button.dataset.goPage);
            renderTable();
        });

        elements.list?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-view-detail]");
            if (!button || !membersData) return;
            openMemberDetail?.({
                cohortId,
                cohortMembershipId: button.dataset.viewDetail,
                memberName: button.dataset.viewName || "수강생",
                memberEmail: button.dataset.viewEmail || "",
                currentAggregationDate: todayData?.aggregationDate || trendData?.to
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
