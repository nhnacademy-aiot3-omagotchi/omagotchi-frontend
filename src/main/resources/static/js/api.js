(() => {
    const API_BASE = window.OMAGOTCHI_API_BASE || document.documentElement.dataset.apiBase || "/bff/v1";
    const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
    let csrfTokenPromise = null;

    class ApiRequestError extends Error {
        constructor(status, message, details = {}) {
            super(message);
            this.name = "ApiRequestError";
            this.status = status;
            this.code = details.code || null;
            this.path = details.path || null;
            this.requestId = details.requestId || null;
        }
    }

    async function getCsrfToken() {
        if (!csrfTokenPromise) {
            csrfTokenPromise = fetch(toUrl("/csrf"), {
                credentials: "same-origin",
                headers: {Accept: "application/json"}
            }).then(async (response) => {
                if (!response.ok) {
                    throw new ApiRequestError(response.status, "CSRF 토큰을 가져오지 못했습니다.");
                }
                return response.json();
            }).catch((error) => {
                csrfTokenPromise = null;
                throw error;
            });
        }
        return csrfTokenPromise;
    }

    function toUrl(path) {
        return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    }

    function isFormDataBody(body) {
        return typeof FormData !== "undefined" && body instanceof FormData;
    }

    function serializeRequestBody(body) {
        if (body === undefined || isFormDataBody(body)) {
            return body;
        }
        return JSON.stringify(body);
    }

    async function parseResponsePayload(response) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return response.json();
        }
        return response.text();
    }

    function errorDetails(payload) {
        return payload !== null && typeof payload === "object" ? payload : {};
    }

    function errorMessage(payload, status) {
        return errorDetails(payload).message || `API request failed: ${status}`;
    }

    async function request(path, options = {}) {
        const { body, headers = {}, method = "GET", ...rest } = options;
        const hasBody = body !== undefined;
        const isFormData = isFormDataBody(body);
        const normalizedMethod = method.toUpperCase();
        const needsCsrf = !SAFE_METHODS.has(normalizedMethod);
        const csrf = needsCsrf ? await getCsrfToken() : null;
        const response = await fetch(toUrl(path), {
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                ...(hasBody && !isFormData ? {"Content-Type": "application/json"} : {}),
                ...(csrf ? {[csrf.headerName]: csrf.token} : {}),
                ...headers
            },
            body: serializeRequestBody(body),
            method: normalizedMethod,
            ...rest
        });
        if (response.status === 204) {
            return null;
        }

        const payload = await parseResponsePayload(response);
        const isCsrfFailure = response.status === 403
            && errorDetails(payload).code === "AUTH_CSRF_INVALID";
        if (isCsrfFailure && needsCsrf && !options.__csrfRetried) {
            csrfTokenPromise = null;
            return request(path, {...options, __csrfRetried: true});
        }

        if (!response.ok) {
            throw new ApiRequestError(
                response.status,
                errorMessage(payload, response.status),
                errorDetails(payload)
            );
        }

        return payload;
    }

    async function optional(path, options) {
        return request(path, options);
    }

    function withQuery(path, values = {}) {
        const query = new URLSearchParams();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") query.set(key, value);
        });
        const queryString = query.toString();
        return queryString ? `${path}?${queryString}` : path;
    }

    function communityFormData(post, attachments = []) {
        const formData = new FormData();
        formData.append("post", new Blob([JSON.stringify(post)], {type: "application/json"}));
        Array.from(attachments).forEach((file) => formData.append("attachments", file));
        return formData;
    }

    window.OmagotchiApi = {
        request,
        optional,
        profile: {
            get: () => request("/me/profile"),
            updateNickname: (nickname) => request("/me/nickname", {
                method: "PATCH",
                body: {nickname}
            })
        },
        character: {
            list: () => request("/gamification/characters"),
            saveSelection: (payload) => request("/gamification/characters/representative", {
                method: "POST",
                body: payload
            })
        },
        attendance: {
            getHistory: (query = {}) => optional(withQuery("/attendance/history", query)),
            getToday: () => optional("/attendance/today"),
            checkIn: () => request("/attendance/check-in", { method: "POST" }),
            checkOut: () => request("/attendance/check-out", { method: "POST" })
        },
        presence: {
            getLabPresence: () => request("/presence")
        },
        studyRecords: {
            list: () => optional("/study-records"),
            create: (payload) => optional("/study-records", { method: "POST", body: payload }),
            update: (id, payload) => optional(`/study-records/${encodeURIComponent(id)}`, { method: "PATCH", body: payload })
        },
        cohort: {
            list: () => request("/cohorts"),
            getMyApplications: () => request("/cohorts/applications/me"),
            applyByCode: (joinCode) => request("/cohorts/applications", {
                method: "POST",
                body: {joinCode}
            })
        },
        gamification: {
            getHome: () => request("/gamification/home"),
            getDailyQuests: () => request("/gamification/quests/daily"),
            // 서버 계약은 Quest 정의 ID가 아니라 사용자별 일일 Quest 인스턴스 ID를 받는다.
            claimQuest: (userDailyQuestId) => request(
                `/gamification/quests/${encodeURIComponent(userDailyQuestId)}/claim`,
                {method: "POST"}
            ),
            // cohortId는 서버가 Session에서 확보하므로 Browser가 보내지 않는다.
            // aggregationDate는 선택 값이며, 미지정 시 서버 기본 기준일을 따른다.
            getProgression: ({aggregationDate} = {}) => {
                const query = new URLSearchParams();
                if (aggregationDate) {
                    query.set("aggregationDate", aggregationDate);
                }
                const suffix = query.toString();
                return request(`/gamification/progression${suffix ? `?${suffix}` : ""}`);
            }
        },
        ranking: {
            // cohortId는 서버가 Session 승인 기수에서 확보한다.
            // maxRank는 선택 값이며, 미지정 시 서버 기본값을 따른다.
            getStudyRankings: ({period = "WEEKLY", maxRank} = {}) => {
                const query = new URLSearchParams({period});
                if (maxRank !== undefined && maxRank !== null) {
                    query.set("maxRank", maxRank);
                }
                return request(`/study-rankings?${query}`);
            },
            getMine: (period = "WEEKLY") => request(
                `/study-rankings/me?period=${encodeURIComponent(period)}`
            )
        },
        community: {
            listPosts: (query = {}) => request(withQuery("/community/posts", query)),
            getPost: (postId) => request(`/community/posts/${encodeURIComponent(postId)}`),
            downloadUrl: (postId, attachmentId) => toUrl(
                `/community/posts/${encodeURIComponent(postId)}/attachments/${encodeURIComponent(attachmentId)}`
            ),
            createPost: (payload) => request("/community/posts", {method: "POST", body: payload}),
            createPostWithAttachments: (post, attachments) => request("/community/posts", {
                method: "POST",
                body: communityFormData(post, attachments)
            }),
            updatePost: (postId, payload) => request(`/community/posts/${encodeURIComponent(postId)}`, {
                method: "PATCH",
                body: payload
            }),
            updatePostWithAttachments: (postId, post, attachments) => request(`/community/posts/${encodeURIComponent(postId)}`, {
                method: "PATCH",
                body: communityFormData(post, attachments)
            }),
            deletePost: (postId) => request(`/community/posts/${encodeURIComponent(postId)}`, {method: "DELETE"})
        },
        manager: {
            getCohorts: () => request("/admin/cohorts"),
            createCohort: (payload) => request("/admin/cohorts", {method: "POST", body: payload}),
            deleteCohort: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}`, {method: "DELETE"}),
            updateCohort: (cohortId, payload) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}`, {method: "PATCH", body: payload}),
            updateCohortStatus: (cohortId, status) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/status`, {method: "PATCH", body: {status}}),
            getMembers: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/members`),
            getApplications: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/applications`),
            addManager: (cohortId, userId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/managers`, {method: "POST", body: {userId}}),
            updateMemberRole: (cohortId, userId, role) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/members/${encodeURIComponent(userId)}/role`, {method: "PATCH", body: {role}}),
            approveMembership: (membershipId, role) => request(`/admin/memberships/${encodeURIComponent(membershipId)}/approve`, {method: "PATCH", body: {role}}),
            rejectMembership: (membershipId, reason) => request(`/admin/memberships/${encodeURIComponent(membershipId)}/reject`, {method: "PATCH", body: {reason}}),
            getJoinCode: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/join-code`),
            createJoinCode: (cohortId, expiresAt) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/join-code`, {method: "POST", body: {expiresAt}}),
            revokeJoinCode: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/join-code/revoke`, {method: "PATCH"}),
            getAttendancePolicy: (cohortId) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/attendance-policy`),
            updateAttendancePolicy: (cohortId, payload) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/attendance-policy`, {method: "PUT", body: payload}),
            getAttendanceRecords: (cohortId, date, page = 0, size = 100) => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/attendance-records`,
                {date, page, size}
            )),
            updateAttendanceStatus: (cohortId, recordId, nextStatus, reason) => request(`/admin/cohorts/${encodeURIComponent(cohortId)}/attendance-records/${encodeURIComponent(recordId)}/status`, {
                method: "PATCH",
                body: {nextStatus, reason, requestId: crypto.randomUUID?.() || `manual-${Date.now()}`}
            }),
            getRankings: (cohortId, query = {}) => request(withQuery(`/admin/cohorts/${encodeURIComponent(cohortId)}/study-rankings`, query)),
            updatePostPin: (postId, pinned) => request(`/admin/community/posts/${encodeURIComponent(postId)}/pin`, {method: "PATCH", body: {pinned}})
        }
    };
})();
