(() => {
    const API_BASE = window.OMAGOTCHI_API_BASE || document.documentElement.dataset.apiBase || "http://localhost:8080";
    const STRICT = Boolean(window.OMAGOTCHI_API_STRICT);
    const PROTOTYPE_FALLBACK_STATUSES = new Set([404]);

    class ApiRequestError extends Error {
        constructor(status, payload = {}) {
            const normalized = typeof payload === "object" && payload !== null ? payload : {};
            const message = normalized.message || `API request failed: ${status}`;
            super(message);
            this.name = "ApiRequestError";
            this.kind = "HTTP";
            this.status = status;
            this.code = normalized.code || null;
            this.path = normalized.path || null;
            this.requestId = normalized.requestId || null;
        }
    }

    class ApiNetworkError extends Error {
        constructor(cause) {
            super("서버에 연결할 수 없습니다.", { cause });
            this.name = "ApiNetworkError";
            this.kind = "NETWORK";
            this.status = 0;
            this.code = null;
            this.path = null;
            this.requestId = null;
        }
    }

    function toUrl(path) {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        // Browser Session cookie는 Frontend same-origin BFF에만 전송한다.
        if (normalized.startsWith("/bff/")) return normalized;
        return `${API_BASE}${normalized}`;
    }

    function rankingQuery(maxRank) {
        return maxRank == null ? "" : `?${new URLSearchParams({ maxRank: String(maxRank) })}`;
    }

    function csrfHeader(method) {
        const normalizedMethod = String(method || "GET").toUpperCase();
        if (["GET", "HEAD", "OPTIONS", "TRACE"].includes(normalizedMethod)) {
            return {};
        }
        const token = document.querySelector('meta[name="_csrf"]')?.content;
        const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;
        return token && headerName ? { [headerName]: token } : {};
    }

    async function request(path, options = {}) {
        const { body, headers = {}, ...rest } = options;
        const hasBody = body !== undefined;
        let response;
        try {
            response = await fetch(toUrl(path), {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    ...(hasBody ? { "Content-Type": "application/json" } : {}),
                    ...csrfHeader(rest.method),
                    ...headers
                },
                body: hasBody ? JSON.stringify(body) : undefined,
                ...rest
            });
        } catch (error) {
            throw new ApiNetworkError(error);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            throw new ApiRequestError(
                response.status,
                typeof payload === "object" ? payload : {}
            );
        }

        return payload;
    }

    async function optional(path, options) {
        try {
            return await request(path, options);
        } catch (error) {
            const fallbackAllowed = error instanceof ApiRequestError
                && PROTOTYPE_FALLBACK_STATUSES.has(error.status);
            if (STRICT || !fallbackAllowed) {
                throw error;
            }
            console.info("[API] Fallback active:", path, error.message);
            return null;
        }
    }

    function subscribe(path, handlers = {}) {
        if (!("EventSource" in window)) {
            return null;
        }

        const source = new EventSource(toUrl(path), { withCredentials: true });
        source.onmessage = (event) => {
            try {
                handlers.message?.(JSON.parse(event.data));
            } catch {
                handlers.message?.(event.data);
            }
        };
        source.onerror = (event) => handlers.error?.(event, source);
        return source;
    }

    window.OmagotchiApi = {
        request,
        optional,
        character: {
            saveSelection: (payload) => optional("/api/v1/me/character", { method: "PUT", body: payload })
        },
        attendance: {
            getHistory: () => optional("/api/v1/attendance/history"),
            getToday: () => optional("/api/v1/attendance/today"),
            checkIn: () => request("/api/v1/attendance/check-in", { method: "POST" }),
            checkOut: () => request("/api/v1/attendance/check-out", { method: "POST" })
        },
        presence: {
            getLabPresence: () => optional("/api/v1/presence/lab"),
            subscribeLabPresence: (handlers) => subscribe("/api/v1/presence/lab/stream", handlers)
        },
        studyRecords: {
            list: () => optional("/api/v1/study-records"),
            create: (payload) => optional("/api/v1/study-records", { method: "POST", body: payload }),
            update: (id, payload) => optional(`/api/v1/study-records/${encodeURIComponent(id)}`, { method: "PATCH", body: payload })
        },
        myStudyRecords: {
            getContext: async () => {
                const memberships = await request("/bff/v1/learning/cohort-memberships/me");
                const active = memberships.find(m => m.role === "STUDENT" && m.status === "ACTIVE");
                if (!active) {
                    throw new ApiRequestError(404, { message: "ACTIVE_STUDENT_COHORT_NOT_FOUND" });
                }
                return { cohortId: active.cohortId };
            },
            getMonthlySummary: (cohortId, month) => request(
                `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-time-summaries?${new URLSearchParams({ month })}`
            ),
            getDailyRecords: (cohortId, date) => request(
                `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-records?${new URLSearchParams({ date })}`
            ),
            updateRecord: (cohortId, studyRecordId, payload) => request(
                `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-records/${encodeURIComponent(studyRecordId)}`,
                { method: "PUT", body: payload }
            ),
            deleteRecord: (cohortId, studyRecordId, expectedVersion) => request(
                `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-records/${encodeURIComponent(studyRecordId)}`,
                {
                    method: "DELETE",
                    headers: { "X-RESOURCE-VERSION": String(expectedVersion) }
                }
            )
        },
        learning: {
            study: {
                getMemberships: () => request("/bff/v1/learning/cohort-memberships/me"),
                startTimer: (cohortId) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/timer/start`,
                    { method: "POST" }
                ),
                getCurrentTimer: (cohortId) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/timer`
                ),
                stopTimer: (cohortId, timerRunId) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/timer/${encodeURIComponent(timerRunId)}/stop`,
                    { method: "POST" }
                ),
                discardTimer: (cohortId, timerRunId) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/timer/${encodeURIComponent(timerRunId)}/discard`,
                    { method: "POST" }
                ),
                getRecord: (cohortId, studyRecordId) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-records/${encodeURIComponent(studyRecordId)}`
                ),
                createRecord: (cohortId, payload) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-records`,
                    { method: "POST", body: payload }
                )
            },
            ranking: {
                getMembersToday: (cohortId, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/today${rankingQuery(maxRank)}`
                ),
                getMembersDaily: (cohortId, date, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/daily/${encodeURIComponent(date)}${rankingQuery(maxRank)}`
                ),
                getMembersWeekly: (cohortId, weekStartDate, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/weekly/${encodeURIComponent(weekStartDate)}${rankingQuery(maxRank)}`
                ),
                getMembersMonthly: (cohortId, month, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/monthly/${encodeURIComponent(month)}${rankingQuery(maxRank)}`
                ),
                getTeamsToday: (cohortId, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/teams/today${rankingQuery(maxRank)}`
                ),
                getTeamsDaily: (cohortId, date, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/teams/daily/${encodeURIComponent(date)}${rankingQuery(maxRank)}`
                ),
                getTeamsWeekly: (cohortId, weekStartDate, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/teams/weekly/${encodeURIComponent(weekStartDate)}${rankingQuery(maxRank)}`
                ),
                getTeamsMonthly: (cohortId, month, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/study-rankings/teams/monthly/${encodeURIComponent(month)}${rankingQuery(maxRank)}`
                ),
                getTeamMembersToday: (cohortId, teamId, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}/study-rankings/today${rankingQuery(maxRank)}`
                ),
                getTeamMembersDaily: (cohortId, teamId, date, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}/study-rankings/daily/${encodeURIComponent(date)}${rankingQuery(maxRank)}`
                ),
                getTeamMembersWeekly: (cohortId, teamId, weekStartDate, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}/study-rankings/weekly/${encodeURIComponent(weekStartDate)}${rankingQuery(maxRank)}`
                ),
                getTeamMembersMonthly: (cohortId, teamId, month, maxRank) => request(
                    `/bff/v1/learning/cohorts/${encodeURIComponent(cohortId)}/teams/${encodeURIComponent(teamId)}/study-rankings/monthly/${encodeURIComponent(month)}${rankingQuery(maxRank)}`
                )
            }
        },
        cohort: {
            applyByCode: (payload) => optional("/api/v1/cohorts/applications", { method: "POST", body: payload })
        },
        community: {
            createPost: (payload) => optional("/api/v1/community/posts", { method: "POST", body: payload })
        },
        manager: {
            getCohorts: () => request("/bff/v1/manager/cohorts"),
            getStudyStatisticsToday: (cohortId) => request(
                `/bff/v1/manager/cohorts/${encodeURIComponent(cohortId)}/study-statistics/today`
            ),
            getStudyStatisticsTrend: (cohortId, window) => request(
                `/bff/v1/manager/cohorts/${encodeURIComponent(cohortId)}/study-statistics/trend?${new URLSearchParams({ window })}`
            ),
            getStudyStatisticsMembers: (cohortId, { window, page, size, sort }) => request(
                `/bff/v1/manager/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members?${new URLSearchParams({
                    window,
                    page: String(page),
                    size: String(size),
                    sort
                })}`
            ),
            getStudyMemberOverview: (cohortId, cohortMembershipId, window) => request(
                `/bff/v1/manager/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/overview?${new URLSearchParams({ window })}`
            ),
            getStudyMemberRecords: (cohortId, cohortMembershipId, date) => request(
                `/bff/v1/manager/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/records?${new URLSearchParams({ date })}`
            )
        }
    };
})();
