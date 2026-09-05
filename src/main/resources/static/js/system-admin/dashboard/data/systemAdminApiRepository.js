function requireApi(api) {
    if (!api?.manager?.getCohorts
        || !api?.manager?.getAttendancePolicy
        || !api?.manager?.updateAttendancePolicy
        || !api?.systemAdmin?.getUsers
        || !api?.systemAdmin?.getAudits
        || !api?.systemAdmin?.changeAccountStatus
        || !api?.systemAdmin?.unlockLogin
        || !api?.systemAdmin?.changeAccountRole
        || !api?.systemAdmin?.assignManager
        || !api?.systemAdmin?.removeManager) {
        throw new Error("System Admin API 클라이언트를 불러오지 못했습니다.");
    }
    return api;
}

const ACCOUNT_ROLES = new Set(["USER", "SYSTEM_ADMIN"]);
const ACCOUNT_STATUSES = new Set(["ACTIVE", "DISABLED", "WITHDRAWN"]);
const AUDIT_PAGE_SIZE = 20;

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
        || !ACCOUNT_ROLES.has(account.role)
        || !ACCOUNT_STATUSES.has(account.status)
        || !Number.isInteger(account.failedLoginAttempts) || account.failedLoginAttempts < 0
        || typeof account.locked !== "boolean"
        || (account.lockedUntil != null
            && (typeof account.lockedUntil !== "string"
                || Number.isNaN(Date.parse(account.lockedUntil))))
        || typeof account.statusChangedAt !== "string"
        || Number.isNaN(Date.parse(account.statusChangedAt))
        || (account.recoveryDeadline != null
            && (typeof account.recoveryDeadline !== "string"
                || Number.isNaN(Date.parse(account.recoveryDeadline))))
        || (account.locked && (account.status !== "ACTIVE" || account.lockedUntil == null))
        || (account.status !== "ACTIVE"
            && (account.failedLoginAttempts !== 0
                || account.locked
                || account.lockedUntil != null))
        || ((account.status === "WITHDRAWN") !== (account.recoveryDeadline != null))
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
        locked: account.locked,
        lockedUntil: account.lockedUntil ?? null,
        statusChangedAt: account.statusChangedAt,
        recoveryDeadline: account.recoveryDeadline ?? null,
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

// 서버 action 값을 화면 문구로 옮긴다. 목록에 없는 값은 원문을 그대로 보여 준다.
// 감사 로그에서 모르는 값을 "기타"로 뭉개면 새 action 이 추가된 사실이 감춰진다.
const AUDIT_ACTION_LABELS = {
    ACCOUNT_DISABLED: "계정 비활성화",
    ACCOUNT_UNLOCKED: "계정 잠금 해제",
    LOGIN_LOCK_RELEASED: "로그인 잠금 해제",
    ACCOUNT_REACTIVATED: "계정 재활성화",
    ROLE_GRANTED: "시스템 관리자 권한 부여",
    ROLE_REVOKED: "시스템 관리자 권한 회수"
};

/** "2026-09-02 14:03" 형태의 지역 시각. Instant 문자열을 그대로 보여 주지 않는다. */
export function formatAuditTime(value) {
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) {
        throw new Error("감사 로그 발생 시각이 올바르지 않습니다.");
    }
    const pad = (part) => String(part).padStart(2, "0");
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
        + ` ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** 값이 없는 항목은 화면에서 자리를 비우지 않고 없다고 말한다. */
const EMPTY_VALUE = "—";
const EMPTY_REASON = "사유 없음";

function text(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * 감사 한 줄을 화면 모델로 옮긴다.
 *
 * 형식이 깨진 행은 버리지 않고 던진다. 감사 로그에서 행을 조용히 빼면 "기록이
 * 없었다"와 "보여 주지 못했다"를 구분할 수 없게 되고, 그건 감사 로그의 존재 이유를
 * 무너뜨린다. 차라리 패널 전체가 오류를 말하게 둔다.
 *
 * 다만 필수로 보는 범위는 "언제 · 누가 · 누구에게 · 무엇을" 넷뿐이다.
 * beforeValue, afterValue, reason 은 비어 있는 것이 정상인 경우가 있다.
 * 최초 권한 부여에는 이전 값이 없고, 사유를 남기지 않는 작업도 있다.
 * 예전에는 이 셋까지 필수로 두어 그런 행 하나에 감사 패널 전체가 오류로 막혔다.
 */
export function normalizeAudit(audit) {
    if (!audit
        || !text(audit.action)
        || !text(audit.actorUserId)
        || !text(audit.targetUserId)
        || !text(audit.occurredAt)) {
        throw new Error("감사 로그 응답 형식이 올바르지 않습니다.");
    }
    // 이름은 없을 수 있다. 계정이 지워졌거나 조회에 실패해도 누가 했는지는 UUID 가 남긴다.
    const target = text(audit.targetName) || audit.targetUserId;
    const actor = text(audit.actorName) || audit.actorUserId;
    const before = text(audit.beforeValue) || EMPTY_VALUE;
    const after = text(audit.afterValue) || EMPTY_VALUE;
    const reason = text(audit.reason) || EMPTY_REASON;
    return {
        time: formatAuditTime(audit.occurredAt),
        action: AUDIT_ACTION_LABELS[audit.action] || audit.action,
        detail: `${target} · ${before} → ${after} · ${reason}`,
        actor
    };
}

async function fetchAuditPage(client, pageNumber) {
    if (!Number.isInteger(pageNumber) || pageNumber < 0) {
        throw new Error("감사 로그 페이지 번호가 올바르지 않습니다.");
    }
    const response = await client.systemAdmin.getAudits({
        page: pageNumber,
        size: AUDIT_PAGE_SIZE
    });
    const page = response?.page;
    const validPage = Number.isInteger(page?.number) && page.number >= 0
        && Number.isInteger(page?.size) && page.size > 0
        && Number.isInteger(page?.totalElements) && page.totalElements >= 0
        && Number.isInteger(page?.totalPages) && page.totalPages >= 0;
    if (!Array.isArray(response?.items)
        || !validPage
        || page.number !== pageNumber
        || page.totalPages !== Math.ceil(page.totalElements / page.size)
        || (page.totalPages === 0 ? page.number !== 0 : page.number >= page.totalPages)
        || response.items.length !== Math.min(page.size, page.totalElements - page.number * page.size)) {
        throw new Error("감사 로그 응답 형식이 올바르지 않습니다.");
    }
    return {
        items: response.items.map(normalizeAudit),
        page: {...page}
    };
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
            // 감사 로그는 실패해도 대시보드 전체를 못 쓰게 만들 이유가 없다.
            // 다만 실패를 "연동 대기"로 위장하지는 않는다. 아래에서 사유를 따로 들고 간다.
            const [users, cohorts, auditResult] = await Promise.all([
                loadAllUsers(client),
                client.manager.getCohorts(),
                fetchAuditPage(client, 0).then(
                    (auditPage) => ({auditPage, error: null}),
                    (error) => ({
                        auditPage: {
                            items: [],
                            page: {
                                number: 0,
                                size: AUDIT_PAGE_SIZE,
                                totalElements: 0,
                                totalPages: 0
                            }
                        },
                        error: error?.message || "감사 로그를 불러오지 못했습니다."
                    })
                )
            ]);
            return {
                users,
                cohorts: (Array.isArray(cohorts) ? cohorts : []).map(normalizeCohort),
                audits: auditResult.auditPage.items,
                auditPage: auditResult.auditPage.page,
                auditError: auditResult.error,
                capabilities: {
                    identity: true,
                    managerWrite: true,
                    // Identity에 계정 상태 변경 API가 있어 열어 둔다.
                    accountStatusWrite: true,
                    loginLockWrite: true,
                    // Identity에 전역 역할 변경 API가 생겨 열어 둔다.
                    identityWrite: true,
                    // 조회에 성공했을 때만 연다. 실패하면 화면이 오류를 말한다.
                    audit: auditResult.error === null,
                    cohortDelete: true,
                    cohortSummary: true
                }
            };
        },

        async loadAuditPage(pageNumber) {
            return fetchAuditPage(client, pageNumber);
        },

        /**
         * 계정 상태·전역 역할·기수 권한을 한 번에 반영한다.
         *
         * 순서가 중요하다.
         * 1) Identity는 ACTIVE 계정의 역할만 바꿔 준다. 그래서 활성화는 역할
         *    변경 앞에, 비활성화는 역할 변경 뒤에 둔다. 한 방향으로 고정하면
         *    "활성화하며 관리자 부여" 또는 "관리자 회수하며 비활성화" 중 하나가 반드시
         *    깨진다.
         * 2) Identity 작업이 모두 끝난 뒤에 Learning의 기수 권한을 건드린다. 앞이
         *    실패하면 기수 권한은 손대지 않아 아무것도 변하지 않는다.
         *
         * 서로 다른 서비스라 원자성은 없다. 그래서 어디까지 반영됐는지를 오류에 실어
         * 올려 보내고(statusApplied·roleApplied), 화면이 그 사실을 숨기지 않는다.
         */
        async updateUserPermissions(userId, payload) {
            const activating = Boolean(payload.statusChanged) && payload.status === "ACTIVE";
            const disabling = Boolean(payload.statusChanged) && payload.status !== "ACTIVE";
            let statusApplied = false;
            let roleApplied = false;

            const changeStatus = async () => {
                await client.systemAdmin.changeAccountStatus(
                    userId,
                    payload.status,
                    payload.reason
                );
                statusApplied = true;
            };

            // 활성화가 먼저다. 비활성 계정에는 역할을 줄 수 없다.
            if (activating) {
                await changeStatus();
            }
            if (payload.roleChanged) {
                try {
                    await client.systemAdmin.changeAccountRole(
                        userId,
                        payload.globalRole,
                        payload.reason
                    );
                    roleApplied = true;
                } catch (roleError) {
                    // 활성화만 반영된 채 멈춘 사실을 숨기지 않는다.
                    roleError.statusApplied = statusApplied;
                    throw roleError;
                }
            }
            // 비활성화는 마지막이다. 먼저 하면 뒤따르는 역할 변경이 Identity에서 막힌다.
            if (disabling) {
                try {
                    await changeStatus();
                } catch (statusError) {
                    statusError.roleApplied = roleApplied;
                    throw statusError;
                }
            }

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
                    partialFailure.statusApplied = statusApplied;
                    partialFailure.roleApplied = roleApplied;
                    throw partialFailure;
                }
                // 계정 상태와 전역 역할은 되돌리지 않는다. 감사 기록이 남고 세션도 이미
                // 폐기됐으므로 되돌리면 기록만 두 줄 늘고 결과는 제자리다.
                operationError.statusApplied = statusApplied;
                operationError.roleApplied = roleApplied;
                throw operationError;
            }
        },

        async unlockLogin(userId, reason) {
            await client.systemAdmin.unlockLogin(userId, reason);
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
