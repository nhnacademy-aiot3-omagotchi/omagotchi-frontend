function requireApi(api) {
    if (!api?.manager?.getCohorts) {
        throw new Error("System Admin API 클라이언트를 불러오지 못했습니다.");
    }
    return api;
}

function normalizeCohort(cohort) {
    return {
        ...cohort,
        memberCount: cohort.memberCount ?? null,
        managerUserIds: cohort.managerUserIds || [],
        managerAssignmentKnown: Array.isArray(cohort.managerUserIds)
    };
}

function identityNotConnectedError() {
    const error = new Error("Identity 관리자 API 연동 후 사용할 수 있습니다.");
    error.code = "IDENTITY_ADMIN_API_NOT_CONNECTED";
    return error;
}

export function createSystemAdminApiRepository(api = window.OmagotchiApi) {
    const client = requireApi(api);

    return {
        async loadDashboard() {
            const cohorts = await client.manager.getCohorts();
            return {
                users: [],
                cohorts: (Array.isArray(cohorts) ? cohorts : []).map(normalizeCohort),
                audits: [],
                capabilities: {
                    identity: false,
                    audit: false,
                    cohortDelete: true,
                    cohortSummary: true
                }
            };
        },

        async updateUserPermissions() {
            throw identityNotConnectedError();
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
