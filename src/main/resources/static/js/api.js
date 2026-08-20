(() => {
    const API_BASE = window.OMAGOTCHI_API_BASE || document.documentElement.dataset.apiBase || "/bff/v1";
    const STRICT = Boolean(window.OMAGOTCHI_API_STRICT);
    const PROTOTYPE_FALLBACK_STATUSES = new Set([404]);

    class ApiRequestError extends Error {
        constructor(status, message) {
            super(message);
            this.name = "ApiRequestError";
            this.status = status;
        }
    }

    function toUrl(path) {
        return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    }

    async function request(path, options = {}) {
        const { body, headers = {}, ...rest } = options;
        const hasBody = body !== undefined;
        const response = await fetch(toUrl(path), {
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                ...(hasBody ? { "Content-Type": "application/json" } : {}),
                ...headers
            },
            body: hasBody ? JSON.stringify(body) : undefined,
            ...rest
        });

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = typeof payload === "object" && payload?.message
                ? payload.message
                : `API request failed: ${response.status}`;
            throw new ApiRequestError(response.status, message);
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

    function withDateRange(path, range = {}) {
        const query = new URLSearchParams();
        if (range.from) query.set("from", range.from);
        if (range.to) query.set("to", range.to);
        const queryString = query.toString();
        return queryString ? `${path}?${queryString}` : path;
    }

    window.OmagotchiApi = {
        request,
        optional,
        character: {
            saveSelection: (payload) => optional("/me/character", { method: "PUT", body: payload })
        },
        attendance: {
            getHistory: () => optional("/attendance/history"),
            getToday: () => optional("/attendance/today"),
            checkIn: () => request("/attendance/check-in", { method: "POST" }),
            checkOut: () => request("/attendance/check-out", { method: "POST" })
        },
        presence: {
            getLabPresence: () => optional("/presence/lab"),
            subscribeLabPresence: (handlers) => subscribe("/presence/lab/stream", handlers)
        },
        studyRecords: {
            list: () => optional("/study-records"),
            create: (payload) => optional("/study-records", { method: "POST", body: payload }),
            update: (id, payload) => optional(`/study-records/${encodeURIComponent(id)}`, { method: "PATCH", body: payload })
        },
        cohort: {
            applyByCode: (payload) => optional("/cohorts/applications", { method: "POST", body: payload })
        },
        community: {
            createPost: (payload) => optional("/community/posts", { method: "POST", body: payload })
        },
        manager: {
            getDashboard: () => optional("/manager/dashboard"),
            // TEMPORARY: Learning Service 연동 전 관리자 공부 통계 화면 검증용 Mock 경로입니다.
            // 실제 연동 시 목록은 /v1/cohorts/{cohortId}/study-statistics,
            // 상세는 위 경로의 /members/{cohortMembershipId}/records로 복원합니다.
            getStudyStatistics: (_cohortId, range) => optional(withDateRange(
                "/mock-api/study-stats",
                range
            )),
            getStudyMemberRecords: (_cohortId, cohortMembershipId, range) => optional(withDateRange(
                `/mock-api/study-stats/members/${encodeURIComponent(cohortMembershipId)}/records`,
                range
            ))
        }
    };
})();
