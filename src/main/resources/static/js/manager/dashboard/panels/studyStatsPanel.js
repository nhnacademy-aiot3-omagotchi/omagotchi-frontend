(() => {
    const PAGE_SIZE = 5;
    const DEFAULT_BOUNDARY_NOTE = "Asia/Seoul 오전 4시를 하루의 시작으로 집계합니다.";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function isoDateInZone(date, timeZone = "Asia/Seoul") {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(date);
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
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(new Date(value));
    }

    function create({ root, fetchStatistics, getMemberProfiles, openMemberDetail }) {
        if (!root) {
            throw new Error("Study statistics panel root is required.");
        }
        if (typeof fetchStatistics !== "function") {
            throw new Error("Study statistics fetch function is required.");
        }

        const elements = {
            search: root.querySelector("[data-studystats-search]"),
            period: root.querySelector("[data-studystats-period]"),
            list: root.querySelector("[data-studystats-list]"),
            pageNumbers: root.querySelector("[data-page-numbers]"),
            totalTime: root.querySelector("[data-kpi-total-time]"),
            participation: root.querySelector("[data-kpi-participation]"),
            averageTime: root.querySelector("[data-kpi-avg-time]"),
            noRecord: root.querySelector("[data-kpi-no-record]"),
            trendTitle: root.querySelector("[data-trend-chart-title]"),
            topTitle: root.querySelector("[data-top-chart-title]"),
            boundaryNote: root.querySelector("[data-study-boundary-note]"),
            trendChart: root.querySelector("#trendChart"),
            topStudentsChart: root.querySelector("#topStudentsChart"),
            durationDistributionChart: root.querySelector("#durationDistributionChart")
        };

        let active = false;
        let cohortId;
        let page = 0;
        let sort = { key: "name", dir: "asc" };
        let statistics = null;
        let loading = false;
        let requestSequence = 0;
        let trendChartInstance = null;
        let topStudentsChartInstance = null;
        let durationDistributionChartInstance = null;

        function selectedPeriodDays() {
            return Number(elements.period?.value) || 7;
        }

        function dateRange() {
            const aggregationNow = new Date(Date.now() - (4 * 60 * 60 * 1000));
            const to = new Date(`${isoDateInZone(aggregationNow)}T12:00:00+09:00`);
            const from = new Date(
                to.getTime() - ((selectedPeriodDays() - 1) * 24 * 60 * 60 * 1000)
            );
            return { from: isoDateInZone(from), to: isoDateInZone(to) };
        }

        function memberRows() {
            if (!statistics?.members) return [];
            const profiles = getMemberProfiles?.() || [];
            const profileByUserId = new Map(
                profiles.map((member) => [String(member.userId ?? member.id), member])
            );
            const profileByMembershipId = new Map(
                profiles
                    .filter((member) => member.cohortMembershipId ?? member.membershipId)
                    .map((member) => [String(member.cohortMembershipId ?? member.membershipId), member])
            );

            return statistics.members.map((memberStatistics) => {
                const profile = profileByUserId.get(String(memberStatistics.userId))
                    || profileByMembershipId.get(String(memberStatistics.cohortMembershipId));
                return {
                    ...memberStatistics,
                    name: profile?.name
                        || memberStatistics.name
                        || `사용자-${String(memberStatistics.userId).slice(0, 8)}`,
                    email: profile?.email || memberStatistics.email || "-"
                };
            });
        }

        function sortedAndFilteredMembers() {
            const query = (elements.search?.value || "").trim().toLowerCase();
            const direction = sort.dir === "desc" ? -1 : 1;
            const selectors = {
                name: (member) => member.name.toLocaleLowerCase("ko-KR"),
                today: (member) => member.todayStudySeconds,
                period: (member) => member.periodStudySeconds,
                days: (member) => member.activeStudyDays,
                last: (member) => member.lastStudiedAt || ""
            };
            const selector = selectors[sort.key] || selectors.name;

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
                elements.pageNumbers.innerHTML = "";
                return;
            }

            const start = Math.max(0, Math.min(page - 2, totalPages - 5));
            const end = Math.min(totalPages, start + 5);
            elements.pageNumbers.innerHTML = Array.from(
                { length: end - start },
                (_, offset) => start + offset
            )
                .map((pageNumber) => `
                    <button type="button"
                            class="page-btn ${pageNumber === page ? "is-active" : ""}"
                            data-go-page="${pageNumber}">${pageNumber + 1}</button>`)
                .join("");
        }

        function renderTable() {
            if (!elements.list) return;
            if (loading) {
                elements.list.innerHTML = `<tr><td class="empty-row" colspan="7">공부 통계를 불러오는 중입니다.</td></tr>`;
                renderPagination(0);
                return;
            }
            if (!statistics) {
                elements.list.innerHTML = `<tr><td class="empty-row" colspan="7">공부 통계를 불러오지 못했습니다.</td></tr>`;
                renderPagination(0);
                return;
            }

            const members = sortedAndFilteredMembers();
            const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
            page = Math.min(page, totalPages - 1);
            const currentPage = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

            elements.list.innerHTML = currentPage.length ? currentPage.map((member) => `
                <tr>
                    <td>
                        <button type="button" class="study-member-link"
                                data-view-detail="${member.cohortMembershipId}"
                                data-view-name="${escapeHtml(member.name)}"
                                data-view-email="${escapeHtml(member.email)}">
                            <strong>${escapeHtml(member.name)}</strong>
                        </button>
                    </td>
                    <td><small>${escapeHtml(member.email)}</small></td>
                    <td>${escapeHtml(formatDuration(member.todayStudySeconds))}</td>
                    <td>${escapeHtml(formatDuration(member.periodStudySeconds))}</td>
                    <td>${member.activeStudyDays}일</td>
                    <td>${escapeHtml(formatDateTime(member.lastStudiedAt))}</td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="secondary-button"
                                    data-view-detail="${member.cohortMembershipId}"
                                    data-view-name="${escapeHtml(member.name)}"
                                    data-view-email="${escapeHtml(member.email)}">상세 보기</button>
                        </div>
                    </td>
                </tr>
            `).join("") : `<tr><td class="empty-row" colspan="7">조회된 수강생이 없습니다.</td></tr>`;

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
            const summary = statistics?.summary;
            const activeStudentCount = Number(summary?.activeStudentCount) || 0;
            const participantCount = Number(summary?.todayParticipantCount) || 0;
            const participationRate = activeStudentCount
                ? Math.round(participantCount * 100 / activeStudentCount)
                : 0;

            elements.totalTime.textContent = formatDuration(summary?.todayTotalStudySeconds);
            elements.participation.textContent = `${participantCount} / ${activeStudentCount}명 (${participationRate}%)`;
            elements.averageTime.textContent = formatDuration(summary?.averageTodayParticipantStudySeconds);
            elements.noRecord.textContent = `${Number(summary?.todayNoRecordStudentCount) || 0}명`;

            const periodDays = selectedPeriodDays();
            elements.trendTitle.textContent = `최근 ${periodDays}일 기수 학습량 추이`;
            elements.topTitle.textContent = `최근 ${periodDays}일 학습량 Top 5`;
            elements.boundaryNote.textContent = statistics?.zoneId && statistics?.dayStartsAt
                ? `${statistics.zoneId} ${String(statistics.dayStartsAt).slice(0, 5)}를 하루의 시작으로 집계합니다.`
                : DEFAULT_BOUNDARY_NOTE;

            destroyCharts();
            const ChartConstructor = window.Chart;
            if (!ChartConstructor || !statistics) return;

            const dailyTotals = statistics.dailyTotals || [];
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

            trendChartInstance = new ChartConstructor(elements.trendChart, {
                type: "line",
                data: {
                    labels: dailyTotals.map((item) => item.aggregationDate.slice(5).replace("-", "/")),
                    datasets: [{
                        label: "학습량 (시간)",
                        data: dailyTotals.map((item) => Number((item.studySeconds / 3600).toFixed(2))),
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

            topStudentsChartInstance = new ChartConstructor(elements.topStudentsChart, {
                type: "bar",
                data: {
                    labels: topMembers.map((member) => member.name),
                    datasets: [{
                        label: "조회 기간 학습 (시간)",
                        data: topMembers.map((member) => Number((member.periodStudySeconds / 3600).toFixed(2))),
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

            durationDistributionChartInstance = new ChartConstructor(elements.durationDistributionChart, {
                type: "doughnut",
                data: {
                    labels: (statistics.durationBuckets || [])
                        .map((bucket) => bucketLabels[bucket.code] || bucket.code),
                    datasets: [{
                        data: (statistics.durationBuckets || []).map((bucket) => bucket.memberCount),
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

        function render() {
            if (!active) return;
            renderTable();
            renderCharts();
        }

        function reset() {
            requestSequence += 1;
            statistics = null;
            loading = false;
            page = 0;
            destroyCharts();
        }

        async function loadStatistics() {
            const sequence = ++requestSequence;
            loading = true;
            statistics = null;
            page = 0;
            render();

            try {
                const response = await fetchStatistics(cohortId, dateRange());
                if (sequence !== requestSequence) return;
                loading = false;
                statistics = response;
                page = 0;
                render();
            } catch (error) {
                if (sequence !== requestSequence) return;
                loading = false;
                statistics = null;
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
            if (!statistics && !loading) {
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
                    sort = { key, dir: "asc" };
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
            if (!button || !statistics) return;
            openMemberDetail?.({
                cohortId,
                cohortMembershipId: button.dataset.viewDetail,
                memberName: button.dataset.viewName || "수강생",
                memberEmail: button.dataset.viewEmail || "",
                currentAggregationDate: statistics.currentAggregationDate || statistics.to
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
