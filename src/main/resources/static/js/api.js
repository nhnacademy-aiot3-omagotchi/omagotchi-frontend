(() => {
    const API_BASE = window.OMAGOTCHI_API_BASE || document.documentElement.dataset.apiBase || "/bff/v1";
    const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
    let csrfTokenPromise = null;
    let cachedCsrfToken = null;

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
                const data = await response.json();
                cachedCsrfToken = data;
                return data;
            }).catch((error) => {
                csrfTokenPromise = null;
                cachedCsrfToken = null;
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

    function redirectToLogin(status) {
        if (status === 401 && window.location.pathname !== "/login") {
            window.location.replace("/login?notice=session-expired");
        }
    }

    async function requestResponse(path, options = {}) {
        const { body, headers = {}, method = "GET", __csrfRetried = false, ...rest } = options;
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
        if (response.ok) return response;

        const payload = await parseResponsePayload(response).catch(() => ({}));
        const isCsrfFailure = response.status === 403
            && errorDetails(payload).code === "AUTH_CSRF_INVALID";
        if (isCsrfFailure && needsCsrf && !__csrfRetried) {
            csrfTokenPromise = null;
            return requestResponse(path, {...options, __csrfRetried: true});
        }

        const error = new ApiRequestError(
            response.status,
            errorMessage(payload, response.status),
            errorDetails(payload)
        );
        redirectToLogin(response.status);
        throw error;
    }

    async function request(path, options = {}) {
        const response = await requestResponse(path, options);
        if (response.status === 204) {
            return null;
        }

        return parseResponsePayload(response);
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
        account: {
            get: () => request("/users/me"),
            changeName: (name) => request("/users/me", {
                method: "PATCH",
                body: {name}
            }),
            changePassword: (currentPassword, newPassword) => request("/users/me/password", {
                method: "PATCH",
                body: {currentPassword, newPassword}
            }),
            withdraw: (currentPassword) => request("/users/me", {
                method: "DELETE",
                body: {currentPassword}
            })
        },
        profile: {
            get: () => request("/me/profile"),
            updateNickname: (nickname) => request("/me/nickname", {
                method: "PATCH",
                body: {nickname}
            })
        },
        access: {
            getContext: () => request("/cohorts/me/access-context")
        },
        teams: {
            create: (payload) => request("/teams", {
                method: "POST",
                body: payload
            }),
            mine: () => request("/teams/me"),
            detail: (teamId) => request(`/teams/${encodeURIComponent(teamId)}`),
            memberCandidates: (teamId, query) => request(withQuery(
                `/teams/${encodeURIComponent(teamId)}/member-candidates`,
                {query}
            )),
            addMember: (teamId, targetUserId) => request(
                `/teams/${encodeURIComponent(teamId)}/members`,
                {method: "POST", body: {targetUserId}}
            ),
            kickMember: (teamId, memberId) => request(
                `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
                {method: "DELETE"}
            ),
            leave: (teamId) => request(
                `/teams/${encodeURIComponent(teamId)}/leave`,
                {method: "POST"}
            ),
            delegate: (teamId, memberId) => request(
                `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}/delegate`,
                {method: "POST"}
            ),
            disband: (teamId) => request(
                `/teams/${encodeURIComponent(teamId)}`,
                {method: "DELETE"}
            )
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
            getCurrentPresence: () => optional("/attendance/current-presence"),
            checkIn: () => request("/attendance/check-in", { method: "POST" }),
            checkOut: () => request("/attendance/check-out", { method: "POST" }),
            moveLab: (spaceId) => request("/attendance/move-lab", {
                method: "POST",
                body: {spaceId}
            }),
            moveStudySpace: (spaceId) => request("/attendance/move-study", {
                method: "POST",
                body: {spaceId}
            })
        },
        spaces: {
            list: () => request("/spaces"),
            listLabs: () => request("/spaces/labs"),
            listEnvironment: () => request("/spaces/environment"),
            startOccupancy: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/occupancies`, {method: "POST"}),
            extendOccupancy: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/occupancies/extend`, {method: "POST"}),
            releaseOccupancy: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/occupancies/release`, {method: "POST"}),
            leaveOccupancy: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/occupancies/participants/me`, {method: "DELETE"}),
            getOccupancyParticipants: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/occupancies/participants`),
            searchOccupancyParticipantCandidates: (spaceId, query) => request(withQuery(
                `/spaces/${encodeURIComponent(spaceId)}/occupancies/participants/candidates`,
                {query}
            )),
            addOccupancyParticipant: (spaceId, targetUserId) => request(
                `/spaces/${encodeURIComponent(spaceId)}/occupancies/participants`,
                {method: "POST", body: {targetUserId}}
            ),
            removeOccupancyParticipant: (spaceId, targetUserId) => request(
                `/spaces/${encodeURIComponent(spaceId)}/occupancies/participants/${encodeURIComponent(targetUserId)}`,
                {method: "DELETE"}
            ),
            requestVacancyAlert: (spaceId) => request(`/spaces/${encodeURIComponent(spaceId)}/vacancy-alerts`, {method: "POST"}),
            getMyVacancyAlerts: () => request("/vacancy-alerts/me"),
            cancelVacancyAlert: (alertId) => request(`/vacancy-alerts/${encodeURIComponent(alertId)}`, {method: "DELETE"})
        },
        adminOccupancies: {
            list: () => request("/admin/spaces/occupancies"),
            participants: (spaceId) => request(
                `/admin/spaces/${encodeURIComponent(spaceId)}/occupancies/participants`
            ),
            forceRelease: (spaceId) => request(
                `/admin/spaces/${encodeURIComponent(spaceId)}/occupancies/force-release`,
                {method: "POST"}
            )
        },
        ai: {
            streamChat: (question, {signal, model = "GEMINI"} = {}) => requestResponse(
                withQuery("/ai/chat", {question, model}),
                {
                    headers: {Accept: "text/event-stream"},
                    signal
                }
            )
        },
        study: {
            getRecord: (id) => request(`/study-records/${encodeURIComponent(id)}`),
            getDailyRecords: (date) => request(withQuery("/study-records", {date})),
            getMonthlySummary: (month) => request(withQuery("/study-time-summaries", {month})),
            createRecord: (payload) => request("/study-records", {
                method: "POST",
                body: payload
            }),
            updateRecord: (id, payload) => request(`/study-records/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: payload
            }),
            deleteRecord: (id, resourceVersion) => request(`/study-records/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: {"X-RESOURCE-VERSION": resourceVersion}
            }),
            getCurrentTimer: () => request("/timer"),
            startTimer: () => request("/timer/start", {method: "POST"}),
            stopTimer: (timerRunId) => request(`/timer/${encodeURIComponent(timerRunId)}/stop`, {
                method: "POST"
            }),
            discardTimer: (timerRunId) => request(`/timer/${encodeURIComponent(timerRunId)}/discard`, {
                method: "POST"
            }),
            stopTimerKeepalive: (timerRunId) => {
                if (!timerRunId) return false;
                const url = toUrl(`/timer/${encodeURIComponent(timerRunId)}/stop`);
                const headers = {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                };
                if (cachedCsrfToken) {
                    headers[cachedCsrfToken.headerName] = cachedCsrfToken.token;
                }
                return fetch(url, {
                    method: "POST",
                    keepalive: true,
                    credentials: "same-origin",
                    headers
                });
            }
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
            // 예측 공부 시간은 Quest 응답에 포함되지 않으므로 별도로 조회한다.
            // cohortId는 서버가 Session에서 확보하므로 Browser가 보내지 않는다.
            getStudyTimePrediction: () => request("/gamification/predictions/study-time"),
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
            getToday: ({maxRank} = {}) => request(withQuery(
                "/study-rankings/today",
                {maxRank}
            )),
            getDaily: (date, {maxRank} = {}) => request(withQuery(
                `/study-rankings/daily/${encodeURIComponent(date)}`,
                {maxRank}
            )),
            getWeekly: (weekStartDate, {maxRank} = {}) => request(withQuery(
                `/study-rankings/weekly/${encodeURIComponent(weekStartDate)}`,
                {maxRank}
            )),
            getMonthly: (month, {maxRank} = {}) => request(withQuery(
                `/study-rankings/monthly/${encodeURIComponent(month)}`,
                {maxRank}
            ))
        },
        // 게시판은 기수에 속한다. 대상 기수는 BFF가 Session 승인 기수에서 정하므로
        // 여기에서는 cohortId를 보내지 않는다.
        community: {
            listPosts: (query = {}) => request(withQuery("/community/posts", query)),
            getPost: (postId) => request(`/community/posts/${encodeURIComponent(postId)}`),
            downloadUrl: (postId, attachmentId) => toUrl(
                `/community/posts/${encodeURIComponent(postId)}/attachments/${encodeURIComponent(attachmentId)}`
            ),
            getAttachmentBlob: async (postId, attachmentId) => {
                const response = await requestResponse(
                    `/community/posts/${encodeURIComponent(postId)}/attachments/${encodeURIComponent(attachmentId)}`,
                    {headers: {Accept: "image/*"}}
                );
                return response.blob();
            },
            deleteAttachment: (postId, attachmentId) => request(
                `/community/posts/${encodeURIComponent(postId)}/attachments/${encodeURIComponent(attachmentId)}`,
                {method: "DELETE"}
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
        adminSpaces: {
            create: (payload) => request("/admin/spaces", {method: "POST", body: payload}),
            update: (spaceId, payload) => request(`/admin/spaces/${encodeURIComponent(spaceId)}`, {method: "PUT", body: payload}),
            activate: (spaceId) => request(`/admin/spaces/${encodeURIComponent(spaceId)}/activate`, {method: "POST"}),
            deactivate: (spaceId, inactiveReason) => request(`/admin/spaces/${encodeURIComponent(spaceId)}/deactivate`, {method: "POST", body: {inactiveReason}}),
            remove: (spaceId) => request(`/admin/spaces/${encodeURIComponent(spaceId)}`, {method: "DELETE"}),
            assignCohort: (spaceId, cohortId) => request(`/admin/spaces/${encodeURIComponent(spaceId)}/cohort`, {method: "PUT", body: {cohortId}}),
            unassignCohort: (spaceId) => request(`/admin/spaces/${encodeURIComponent(spaceId)}/cohort`, {method: "DELETE"})
        },
        systemAdmin: {
            getUsers: (query = {}) => request(withQuery("/admin/users", query)),
            getAudits: (query = {}) => request(withQuery("/admin/audits", query)),
            assignManager: (userId, cohortId) => request(
                `/admin/users/${encodeURIComponent(userId)}/managed-cohorts/${encodeURIComponent(cohortId)}`,
                {method: "PUT"}
            ),
            changeAccountStatus: (userId, status, reason) => request(
                `/admin/users/${encodeURIComponent(userId)}/status`,
                {method: "PATCH", body: {status, reason}}
            ),
            changeAccountRole: (userId, role, reason) => request(
                `/admin/users/${encodeURIComponent(userId)}/role`,
                {method: "PATCH", body: {role, reason}}
            ),
            removeManager: (userId, cohortId) => request(
                `/admin/users/${encodeURIComponent(userId)}/managed-cohorts/${encodeURIComponent(cohortId)}`,
                {method: "DELETE"}
            )
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
            getStudyStatsToday: (cohortId) => request(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/study-statistics/today`
            ),
            getStudyStatsTrend: (cohortId, window = "7d") => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/study-statistics/trend`,
                { window }
            )),
            getStudyStatsMembers: (cohortId, query = {}) => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members`,
                query
            )),
            getStudyStatsMemberOverview: (cohortId, cohortMembershipId, window = "7d") => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/overview`,
                { window }
            )),
            getStudyStatsMemberDailyRecords: (cohortId, cohortMembershipId, date) => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/study-statistics/members/${encodeURIComponent(cohortMembershipId)}/records`,
                { date }
            )),
            getNotices: (cohortId, query = {}) => request(withQuery(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/community/posts`,
                {type: "NOTICE", ...query}
            )),
            createNotice: (cohortId, payload) => request(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/community/posts`,
                {method: "POST", body: payload}
            ),
            updatePostPin: (cohortId, postId, pinned) => request(
                `/admin/cohorts/${encodeURIComponent(cohortId)}/community/posts/${encodeURIComponent(postId)}/pin`,
                {method: "PATCH", body: {pinned}}
            ),
            getSensorSpaceSeries: (location, measurement, seriesWindow, options = {}) => request(
                withQuery("/admin/sensors/space-series", {location, measurement, window: seriesWindow}),
                options
            ),
        },
        // 응답 필드는 Learning Service 계약 그대로다. 화면이 그 이름으로 읽으므로 여기서 바꾸지 않는다.
        telegram: {
            // 미연동이면 BFF가 204를 주므로 본문이 빈 문자열이다. 호출부는 falsy로 판정한다.
            getMyLink: () => request("/me/telegram/link"),
            issueLinkToken: () => request("/me/telegram/link-token", {method: "POST"}),
            updateNotification: (enabled) => request("/me/telegram/link/notification", {
                method: "PATCH",
                body: {enabled}
            }),
            disconnect: () => request("/me/telegram/link", {method: "DELETE"})
        },
        sensor: {
            listSpaces: () => request("/admin/sensors/spaces"),
            listDevices: () => request("/admin/sensors/devices"),
            createDevice: (payload) => request("/admin/sensors/devices", {method: "POST", body: payload}),
            // 주인 없는 센서를 우리 기수로 가져온다. 등록이 409로 막혔을 때 이어서 부른다.
            claimDevice: (deviceEui, spaceId) => request(
                `/admin/sensors/devices/${encodeURIComponent(deviceEui)}/claim`,
                {method: "POST", body: {spaceId}}
            ),
            updateDevice: (deviceEui, payload) => request(`/admin/sensors/devices/${encodeURIComponent(deviceEui)}`, {
                method: "PUT",
                body: payload
            }),
            updateDeviceActive: (deviceEui, active) => request(`/admin/sensors/devices/${encodeURIComponent(deviceEui)}/active`, {
                method: "PATCH",
                body: {active}
            }),
            // query: {type, deviceEui, from, to, page, size} — 비운 값은 withQuery가 떨어뜨린다.
            listEvents: (query = {}) => request(withQuery("/admin/sensors/events", query)),
            listSpaceThresholds: () => request("/admin/sensors/thresholds"),
            applySpaceThreshold: (spaceId, rules) => request(`/admin/sensors/thresholds/${encodeURIComponent(spaceId)}`, {
                method: "PATCH",
                headers: {"X-Request-ID": crypto.randomUUID?.() || `threshold-${Date.now()}`},
                body: {rules}
            })
        }
    };
})();
