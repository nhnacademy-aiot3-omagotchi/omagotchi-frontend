import {cloneSystemAdminMockData} from "../mocks/systemAdminMockData.js";

function periodsOverlap(first, second) {
    return first.startDate < second.endDate && second.startDate < first.endDate;
}

function assertManagerSchedule(cohorts, managerCohortIds) {
    const assigned = managerCohortIds.map((id) => cohorts.find((cohort) => cohort.id === id)).filter(Boolean);
    for (let firstIndex = 0; firstIndex < assigned.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < assigned.length; secondIndex += 1) {
            if (periodsOverlap(assigned[firstIndex], assigned[secondIndex])) {
                const error = new Error(`${assigned[firstIndex].name}과 ${assigned[secondIndex].name}의 운영 기간이 겹칩니다.`);
                error.code = "COHORT_MANAGER_PERIOD_CONFLICT";
                throw error;
            }
        }
    }
}

// TODO Identity 사용자 관리 API와 Learning 기수 삭제 API가 준비되면 구현체만 교체한다.
export function createSystemAdminRepository(seed = cloneSystemAdminMockData()) {
    const state = seed;

    return {
        async loadDashboard() {
            return structuredClone(state);
        },
        async updateUserPermissions(userId, permissions) {
            const user = state.users.find((item) => item.id === userId);
            if (!user) throw new Error("사용자를 찾을 수 없습니다.");
            assertManagerSchedule(state.cohorts, permissions.managerCohortIds);
            state.cohorts.forEach((cohort) => {
                cohort.managerUserIds = cohort.managerUserIds.filter((id) => id !== userId);
                if (permissions.managerCohortIds.includes(cohort.id)) cohort.managerUserIds.push(userId);
            });
            Object.assign(user, permissions);
            return structuredClone(user);
        },
        async createCohort(payload) {
            const cohort = {
                id: `mock-${Date.now()}`,
                ...payload,
                status: "PREPARING",
                memberCount: 0,
                managerUserIds: payload.managerUserId ? [payload.managerUserId] : []
            };
            delete cohort.managerUserId;
            if (payload.managerUserId) {
                const manager = state.users.find((user) => user.id === payload.managerUserId);
                const assignedCohorts = manager?.managerCohortIds
                    .map((id) => state.cohorts.find((item) => item.id === id))
                    .filter(Boolean) || [];
                const conflict = assignedCohorts.find((assigned) => periodsOverlap(assigned, cohort));
                if (conflict) {
                    const error = new Error(`${manager.name} 관리자는 ${conflict.name} 운영 기간과 중복 배치할 수 없습니다.`);
                    error.code = "COHORT_MANAGER_PERIOD_CONFLICT";
                    throw error;
                }
            }
            state.cohorts.unshift(cohort);
            if (payload.managerUserId) {
                const manager = state.users.find((user) => user.id === payload.managerUserId);
                if (manager) manager.managerCohortIds.push(cohort.id);
            }
            return structuredClone(cohort);
        },
        async changeCohortStatus(cohortId, status) {
            const cohort = state.cohorts.find((item) => item.id === cohortId);
            if (!cohort) throw new Error("기수를 찾을 수 없습니다.");
            if (status === "ACTIVE" && cohort.status === "PREPARING" && cohort.managerUserIds.length === 0) {
                throw new Error("ACTIVE 전환 전에 활성 기수 관리자를 배치해야 합니다.");
            }
            const valid = (cohort.status === "PREPARING" && status === "ACTIVE")
                || (cohort.status === "ACTIVE" && status === "CLOSED");
            if (!valid) throw new Error("허용되지 않은 기수 상태 전환입니다.");
            cohort.status = status;
            return structuredClone(cohort);
        },
        async deleteCohort() {
            throw new Error("Learning Service에 기수 삭제 API가 아직 없습니다.");
        },
        appendAudit(entry) {
            state.audits.unshift({id: Date.now(), time: "방금", actor: "test@test.com", ...entry});
        }
    };
}
