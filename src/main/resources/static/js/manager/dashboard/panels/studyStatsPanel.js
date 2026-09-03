(() => {
    const CONTEXT_EVENT = "omagotchi:manager-study-stats:context";

    function normalizePeriod(value) {
        return Number(value) === 30 ? 30 : 7;
    }

    function create({
        root,
        fetchTodayStats = (cid) => window.OmagotchiApi?.manager?.getStudyStatsToday?.(cid),
        fetchTrendStats = (cid, windowParam) => (
            window.OmagotchiApi?.manager?.getStudyStatsTrend?.(cid, windowParam)
        ),
        fetchMemberStats = (cid, query) => (
            window.OmagotchiApi?.manager?.getStudyStatsMembers?.(cid, query)
        ),
        getMemberProfiles,
        openMemberDetail
    }) {
        if (!root) {
            throw new Error("Study statistics panel root is required.");
        }
        if (!root.querySelector("[data-manager-study-stats-react-root]")) {
            throw new Error("Study statistics React island root is missing.");
        }

        let active = false;
        let cohortId;
        let period = 7;
        let todayStats = null;
        let trendStats = null;
        let membersStats = null;
        let loading = false;
        let error = null;
        let requestSequence = 0;

        function profiles() {
            const value = getMemberProfiles?.();
            return Array.isArray(value) ? value : [];
        }

        function selectMember(member = {}) {
            const membershipId = member.cohortMembershipId;
            if (membershipId == null) return;
            openMemberDetail?.({
                cohortId,
                cohortMembershipId: String(membershipId),
                memberName: member.name || member.nickname || "수강생",
                memberEmail: member.email || "",
                currentAggregationDate: todayStats?.aggregationDate || trendStats?.to
            });
        }

        function changePeriod(nextPeriod) {
            const normalized = normalizePeriod(nextPeriod);
            if (normalized === period) return;
            period = normalized;
            reset();
            if (active) void loadStatistics();
        }

        function publish(force = false) {
            if (!active && !force) return;
            const context = Object.freeze({
                todayStats,
                trendStats,
                membersStats,
                memberProfiles: profiles(),
                loading,
                error,
                period,
                onPeriodChange: changePeriod,
                onSelectMember: selectMember
            });
            window.OmagotchiManagerStudyStatsContext = context;
            if (window.OmagotchiManagerStudyStatsIsland?.render) {
                window.OmagotchiManagerStudyStatsIsland.render(context);
            } else {
                window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
            }
        }

        function reset() {
            requestSequence += 1;
            todayStats = null;
            trendStats = null;
            membersStats = null;
            loading = false;
            error = null;
        }

        async function loadStatistics() {
            const sequence = ++requestSequence;
            const windowParam = `${period}d`;
            loading = true;
            error = null;
            todayStats = null;
            trendStats = null;
            membersStats = null;
            publish();

            try {
                const [todayResult, trendResult, membersResult] = await Promise.all([
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
                todayStats = todayResult;
                trendStats = trendResult;
                membersStats = membersResult;
                loading = false;
                publish();
            } catch (cause) {
                if (sequence !== requestSequence) return;
                loading = false;
                error = cause?.message || "공부 통계를 불러오지 못했습니다.";
                console.error("Failed to load study statistics:", cause);
                publish();
            }
        }

        function invalidate() {
            reset();
            publish(true);
        }

        function activate(context = {}) {
            const cohortChanged = cohortId !== context.cohortId;
            cohortId = context.cohortId;
            active = true;
            if (cohortChanged) reset();
            if (!todayStats && !loading) {
                void loadStatistics();
                return;
            }
            publish();
        }

        function deactivate() {
            active = false;
            if (loading) {
                requestSequence += 1;
                loading = false;
            }
        }

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
