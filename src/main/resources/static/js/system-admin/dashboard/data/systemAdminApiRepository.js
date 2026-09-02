function requireApi(api) {
    if (!api?.manager?.getCohorts
        || !api?.manager?.getAttendancePolicy
        || !api?.manager?.updateAttendancePolicy
        || !api?.systemAdmin?.getUsers
        || !api?.systemAdmin?.assignManager
        || !api?.systemAdmin?.removeManager) {
        throw new Error("System Admin API 클라이언트를 불러오지 못했습니다.");
    }
    return api;
}

function normalizeCohort(cohort) {
    return {
        ...cohort,
        id: String(cohort.id),
        memberCount: cohort.memberCount ?? null,
        managerUserIds: (cohort.managerUserIds || []).map(String),
        managerAssignmentKnown: Array.isArray(cohort.managerUserIds)
    };
}

function normalizeUser(account) {
    if (!account
        || typeof account.accountId !== "string" || !account.accountId.trim()
        || typeof account.email !== "string" || !account.email.trim()
        || typeof account.name !== "string" || !account.name.trim()
        || typeof account.role !== "string" || !account.role.trim()
        || typeof account.status !== "string" || !account.status.trim()
        || !Number.isInteger(account.failedLoginAttempts) || account.failedLoginAttempts < 0
        || (account.lockedUntil != null
            && (typeof account.lockedUntil !== "string"
                || Number.isNaN(Date.parse(account.lockedUntil))))
        || (account.withdrawnAt != null
            && (typeof account.withdrawnAt !== "string"
                || Number.isNaN(Date.parse(account.withdrawnAt))))
        || typeof account.createdAt !== "string" || Number.isNaN(Date.parse(account.createdAt))
        || !Array.isArray(account.managedCohorts)
        || account.managedCohorts.some((cohort) => cohort?.cohortId == null)) {
        throw new Error("사용자 목록 응답 형식이 올바르지 않습니다.");
    }
    return {
        id: String(account.accountId),
        email: account.email,
        name: account.name,
        globalRole: account.role,
        status: account.status,
        failedLoginAttempts: account.failedLoginAttempts,
        lockedUntil: account.lockedUntil ?? null,
        withdrawnAt: account.withdrawnAt ?? null,
        joinedAt: String(account.createdAt || "-").slice(0, 10),
        managerCohortIds: account.managedCohorts.map((cohort) => String(cohort.cohortId))
    };
}

function requireAccountPage(response, expectedPageNumber) {
    const page = response?.page;
    const validPage = Number.isInteger(page?.number) && page.number >= 0
        && Number.isInteger(page?.size) && page.size > 0
        && Number.isInteger(page?.totalElements) && page.totalElements >= 0
        && Number.isInteger(page?.totalPages) && page.totalPages >= 0;
    if (!Array.isArray(response?.items)
        || !validPage
        || page.number !== expectedPageNumber
        || page.totalPages !== Math.ceil(page.totalElements / page.size)
        || response.items.length > page.size
        || response.items.length > page.totalElements) {
        throw new Error("사용자 목록 응답 형식이 올바르지 않습니다.");
    }
    return response;
}

async function loadAllUsers(client) {
    const pageSize = 100;
    const firstPageNumber = 0;
    const firstPage = requireAccountPage(await client.systemAdmin.getUsers({
        page: firstPageNumber,
        size: pageSize,
        sort: "CREATED_AT_DESC"
    }), firstPageNumber);
    const users = [...firstPage.items];
    for (let page = 1; page < firstPage.page.totalPages; page += 1) {
        const nextPage = requireAccountPage(await client.systemAdmin.getUsers({
            page,
            size: pageSize,
            sort: "CREATED_AT_DESC"
        }), page);
        users.push(...nextPage.items);
    }
    return users.map(normalizeUser);
}

/**
 * 정책 미설정 기수에 보여줄 초기값.
 *
 * 서버는 기본값을 만들어 주지 않는다. 값을 임의로 저장해 두면 틀린 기준으로 출결이
 * 조용히 판정되므로, 여기서는 저장하지 않고 입력 폼의 초기 표시값으로만 쓴다.
 */
export const ATTENDANCE_POLICY_DEFAULTS = Object.freeze({
    timezone: "Asia/Seoul",
    scheduledStartTime: "09:00",
    scheduledEndTime: "18:00",
    absenceCutoffTime: "10:00",
    allowedAwayMinutes: 30
});

/** "09:00:00" 과 "09:00" 을 input[type=time] 이 읽는 "09:00" 으로 맞춘다. */
function toTimeInputValue(value) {
    if (typeof value !== "string") return "";
    const matched = /^(\d{2}):(\d{2})/.exec(value.trim());
    return matched ? `${matched[1]}:${matched[2]}` : "";
}

function normalizeAttendancePolicy(policy) {
    if (!policy || typeof policy !== "object") {
        throw new Error("출결 정책 응답 형식이 올바르지 않습니다.");
    }
    const scheduledStartTime = toTimeInputValue(policy.scheduledStartTime);
    const scheduledEndTime = toTimeInputValue(policy.scheduledEndTime);
    if (!scheduledStartTime || !scheduledEndTime) {
        throw new Error("출결 정책 응답에 필수 시각이 없습니다.");
    }
    if (typeof policy.timezone !== "string" || !policy.timezone.trim()) {
        throw new Error("출결 정책 응답에 타임존이 없습니다.");
    }
    if (!Number.isInteger(policy.allowedAwayMinutes) || policy.allowedAwayMinutes < 0) {
        throw new Error("출결 정책 응답의 허용 자리비움 시간이 올바르지 않습니다.");
    }
    return {
        timezone: policy.timezone,
        scheduledStartTime,
        scheduledEndTime,
        // absenceCutoffTime 은 서버에서 nullable 이다. 빈 문자열로 눕혀 폼이 그대로 읽게 한다.
        absenceCutoffTime: toTimeInputValue(policy.absenceCutoffTime),
        allowedAwayMinutes: policy.allowedAwayMinutes
    };
}

/**
 * 서버 도메인 검증(CohortAttendancePolicy.validateTimes)과 같은 규칙을 미리 적용한다.
 * 왕복 한 번을 아끼려는 것이지 서버 검증을 대체하지 않는다.
 */
export function validateAttendancePolicyDraft(draft) {
    if (!draft.timezone || !String(draft.timezone).trim()) {
        return "타임존은 필수입니다.";
    }
    if (!draft.scheduledStartTime || !draft.scheduledEndTime) {
        return "출석 시작 시각과 종료 시각은 필수입니다.";
    }
    if (draft.scheduledStartTime >= draft.scheduledEndTime) {
        return "출석 시작 시각은 종료 시각보다 빨라야 합니다.";
    }
    const allowedAwayMinutes = Number(draft.allowedAwayMinutes);
    if (!Number.isInteger(allowedAwayMinutes) || allowedAwayMinutes < 0) {
        return "허용 자리비움 시간은 0분 이상의 정수여야 합니다.";
    }
    return null;
}

/** 폼 값을 PUT 본문으로 바꾼다. 비어 있는 결석 기준 시각은 null로 보낸다. */
function toAttendancePolicyBody(draft) {
    return {
        timezone: String(draft.timezone).trim(),
        scheduledStartTime: draft.scheduledStartTime,
        scheduledEndTime: draft.scheduledEndTime,
        absenceCutoffTime: draft.absenceCutoffTime ? draft.absenceCutoffTime : null,
        allowedAwayMinutes: Number(draft.allowedAwayMinutes)
    };
}

export function createSystemAdminApiRepository(api = window.OmagotchiApi) {
    const client = requireApi(api);

    return {
        async loadDashboard() {
            const [users, cohorts] = await Promise.all([
                loadAllUsers(client),
                client.manager.getCohorts()
            ]);
            return {
                users,
                cohorts: (Array.isArray(cohorts) ? cohorts : []).map(normalizeCohort),
                audits: [],
                capabilities: {
                    identity: true,
                    managerWrite: true,
                    identityWrite: false,
                    audit: false,
                    cohortDelete: true,
                    cohortSummary: true
                }
            };
        },

        async updateUserPermissions(userId, payload) {
            const previous = new Set((payload.previousManagerCohortIds || []).map(String));
            const next = new Set((payload.managerCohortIds || []).map(String));
            const removals = [...previous].filter((cohortId) => !next.has(cohortId));
            const additions = [...next].filter((cohortId) => !previous.has(cohortId));
            const removed = [];
            const added = [];

            try {
                for (const cohortId of removals) {
                    await client.systemAdmin.removeManager(userId, cohortId);
                    removed.push(cohortId);
                }
                for (const cohortId of additions) {
                    await client.systemAdmin.assignManager(userId, cohortId);
                    added.push(cohortId);
                }
            } catch (operationError) {
                const rollbackErrors = [];
                for (const cohortId of added.reverse()) {
                    try {
                        await client.systemAdmin.removeManager(userId, cohortId);
                    } catch (rollbackError) {
                        rollbackErrors.push(rollbackError);
                    }
                }
                for (const cohortId of removed.reverse()) {
                    try {
                        await client.systemAdmin.assignManager(userId, cohortId);
                    } catch (rollbackError) {
                        rollbackErrors.push(rollbackError);
                    }
                }
                if (rollbackErrors.length) {
                    const partialFailure = new Error(
                        "기수 권한 변경 일부를 복구하지 못했습니다.",
                        {cause: operationError}
                    );
                    partialFailure.code = "MANAGER_PERMISSION_UPDATE_PARTIAL_FAILURE";
                    partialFailure.rollbackErrors = rollbackErrors;
                    throw partialFailure;
                }
                throw operationError;
            }
        },

        /**
         * 기수의 출결 정책을 읽는다.
         *
         * 정책이 없는 기수는 오류가 아니라 "아직 설정 안 됨"이다. 화면이 이 둘을 구분해야
         * 기본값 폼을 열 수 있으므로, ATTENDANCE_POLICY_NOT_FOUND 만 정상 흐름으로 흡수하고
         * 나머지 실패는 그대로 올린다.
         */
        async loadAttendancePolicy(cohortId) {
            try {
                return {
                    configured: true,
                    policy: normalizeAttendancePolicy(await client.manager.getAttendancePolicy(cohortId))
                };
            } catch (error) {
                if (error?.code === "ATTENDANCE_POLICY_NOT_FOUND") {
                    return {configured: false, policy: {...ATTENDANCE_POLICY_DEFAULTS}};
                }
                throw error;
            }
        },

        async saveAttendancePolicy(cohortId, draft) {
            const invalid = validateAttendancePolicyDraft(draft);
            if (invalid) {
                const error = new Error(invalid);
                error.code = "ATTENDANCE_POLICY_INVALID_INPUT";
                throw error;
            }
            return normalizeAttendancePolicy(
                await client.manager.updateAttendancePolicy(cohortId, toAttendancePolicyBody(draft))
            );
        },

        async createCohort(payload) {
            const created = await client.manager.createCohort({
                name: payload.name,
                description: payload.description || null,
                startDate: payload.startDate,
                endDate: payload.endDate
            });
            if (payload.managerUserId) {
                try {
                    await client.manager.addManager(created.id, payload.managerUserId);
                } catch (assignmentError) {
                    try {
                        await client.manager.deleteCohort(created.id);
                    } catch (cleanupError) {
                        const partialFailure = new Error(
                            `기수는 생성되었지만 관리자 배치와 보상 삭제에 실패했습니다. 생성된 기수 ID: ${created.id}`,
                            {cause: assignmentError}
                        );
                        partialFailure.code = "COHORT_CREATED_MANAGER_ASSIGNMENT_FAILED";
                        partialFailure.createdCohortId = created.id;
                        partialFailure.cleanupError = cleanupError;
                        throw partialFailure;
                    }
                    throw assignmentError;
                }
            }
            // 정책 없는 기수는 학생 전원이 체크인에 실패한다. 생성과 정책을 하나의 결과로
            // 취급하고, 정책 저장이 깨지면 방금 만든 기수를 되돌린다. 관리자 배치 실패를
            // 다루는 위 흐름과 같은 규칙이다.
            if (payload.attendancePolicy) {
                try {
                    await this.saveAttendancePolicy(created.id, payload.attendancePolicy);
                } catch (policyError) {
                    try {
                        await client.manager.deleteCohort(created.id);
                    } catch (cleanupError) {
                        const partialFailure = new Error(
                            `기수는 생성되었지만 출결 정책 저장과 보상 삭제에 모두 실패했습니다. 생성된 기수 ID: ${created.id}`,
                            {cause: policyError}
                        );
                        partialFailure.code = "COHORT_CREATED_POLICY_SAVE_FAILED";
                        partialFailure.createdCohortId = created.id;
                        partialFailure.cleanupError = cleanupError;
                        throw partialFailure;
                    }
                    throw policyError;
                }
            }

            return normalizeCohort({
                ...created,
                managerUserIds: payload.managerUserId ? [payload.managerUserId] : undefined
            });
        },

        async changeCohortStatus(cohortId, status) {
            return normalizeCohort(await client.manager.updateCohortStatus(cohortId, status));
        },

        async deleteCohort(cohortId) {
            await client.manager.deleteCohort(cohortId);
        },

        appendAudit() {
            // 감사 로그는 서버에 영구 저장되어야 하므로 브라우저 메모리에 기록하지 않는다.
        }
    };
}
