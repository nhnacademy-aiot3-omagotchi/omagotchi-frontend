function requireApi(api) {
    if (!api?.manager?.getCohorts
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
    const managedCohorts = Array.isArray(account.managedCohorts) ? account.managedCohorts : [];
    return {
        id: String(account.accountId),
        email: account.email,
        name: account.name,
        globalRole: account.role,
        status: account.status,
        joinedAt: String(account.createdAt || "-").slice(0, 10),
        managerCohortIds: managedCohorts.map((cohort) => String(cohort.cohortId))
    };
}

function requireAccountPage(page) {
    if (!page || !Array.isArray(page.content)
        || !Number.isInteger(page.totalPages) || page.totalPages < 0) {
        throw new Error("사용자 목록 응답 형식이 올바르지 않습니다.");
    }
    return page;
}

async function loadAllUsers(client) {
    const pageSize = 100;
    const firstPage = requireAccountPage(await client.systemAdmin.getUsers({
        page: 0,
        size: pageSize,
        sort: "CREATED_AT_DESC"
    }));
    const users = [...firstPage.content];
    for (let page = 1; page < firstPage.totalPages; page += 1) {
        const nextPage = requireAccountPage(await client.systemAdmin.getUsers({
            page,
            size: pageSize,
            sort: "CREATED_AT_DESC"
        }));
        users.push(...nextPage.content);
    }
    return users.map(normalizeUser);
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
