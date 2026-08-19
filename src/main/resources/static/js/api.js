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
        return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
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
                const memberships = await request("/api/v1/cohorts/join-requests/me");
                const active = memberships.find(m => m.role === "STUDENT" && m.status === "ACTIVE");
                if (!active) {
                    throw new ApiRequestError(404, { message: "ACTIVE_STUDENT_COHORT_NOT_FOUND" });
                }
                return { cohortId: active.cohortId };
            },
            getMonthlySummary: (cohortId, month) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-time-summaries?${new URLSearchParams({ month })}`
            ),
            getDailyRecords: (cohortId, date) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-records?${new URLSearchParams({ date })}`
            ),
            updateRecord: (cohortId, studyRecordId, payload) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-records/${encodeURIComponent(studyRecordId)}`,
                { method: "PUT", body: payload }
            ),
            deleteRecord: (cohortId, studyRecordId, expectedVersion) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-records/${encodeURIComponent(studyRecordId)}`,
                {
                    method: "DELETE",
                    headers: { "X-RESOURCE-VERSION": String(expectedVersion) }
                }
            )
        },
        cohort: {
            applyByCode: (payload) => optional("/api/v1/cohorts/applications", { method: "POST", body: payload })
        },
        community: {
            createPost: (payload) => optional("/api/v1/community/posts", { method: "POST", body: payload })
        },
        manager: {
            getDashboard: () => optional("/api/v1/manager/dashboard"),
            getStudyStatisticsToday: (cohortId) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-statistics/today`
            ),
            getStudyStatisticsTrend: (cohortId, window) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-statistics/trend?${new URLSearchParams({ window })}`
            ),
            getStudyStatisticsMembers: (cohortId, { window, page, size, sort }) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members?${new URLSearchParams({
                    window,
                    page: String(page),
                    size: String(size),
                    sort
                })}`
            ),
            getStudyMemberOverview: (cohortId, cohortMembershipId, window) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/overview?${new URLSearchParams({ window })}`
            ),
            getStudyMemberRecords: (cohortId, cohortMembershipId, date) => request(
                `/api/v1/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/records?${new URLSearchParams({ date })}`
            )
        }
    };
})();
