import assert from "node:assert/strict";
import test from "node:test";
import {createSystemAdminApiRepository} from "../../main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js";
import {mergeManagerCohortSelection} from "../../main/resources/static/js/system-admin/dashboard/dashboardController.js";

function apiFixture() {
    const calls = [];
    return {
        calls,
        api: {
            systemAdmin: {
                async getUsers(query) {
                    calls.push(["getUsers", query]);
                    return {
                        items: [{
                            accountId: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1",
                            email: "manager@example.com",
                            name: "기수 관리자",
                            role: "USER",
                            status: "ACTIVE",
                            failedLoginAttempts: 0,
                            createdAt: "2026-08-31T07:00:00Z",
                            managedCohorts: [{cohortId: 3, cohortName: "AIoT 3기", role: "MANAGER"}]
                        }],
                        page: {
                            number: 0,
                            size: 100,
                            totalElements: 1,
                            totalPages: 1
                        }
                    };
                },
                async assignManager(userId, cohortId) {
                    calls.push(["assignManager", userId, cohortId]);
                },
                async removeManager(userId, cohortId) {
                    calls.push(["removeManager", userId, cohortId]);
                }
            },
            manager: {
                async getCohorts() {
                    calls.push(["getCohorts"]);
                    return [{
                        id: 3,
                        name: "AIoT 3기",
                        description: "IoT 과정",
                        startDate: "2026-08-01",
                        endDate: "2026-12-18",
                        status: "ACTIVE",
                        memberCount: 34,
                        managerUserIds: ["019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"]
                    }];
                },
                async createCohort(payload) {
                    calls.push(["createCohort", payload]);
                    return {id: 4, ...payload, status: "PREPARING"};
                },
                async addManager(cohortId, userId) {
                    calls.push(["addManager", cohortId, userId]);
                    return {cohortId, userId};
                },
                async updateMemberRole(cohortId, userId, role) {
                    calls.push(["updateMemberRole", cohortId, userId, role]);
                    return {cohortId, userId, role};
                },
                async updateCohortStatus(cohortId, status) {
                    calls.push(["updateCohortStatus", cohortId, status]);
                    return {
                        id: Number(cohortId),
                        name: "AIoT 4기",
                        startDate: "2027-01-01",
                        endDate: "2027-06-30",
                        status
                    };
                },
                async deleteCohort(cohortId) {
                    calls.push(["deleteCohort", cohortId]);
                }
            }
        }
    };
}

test("Identity 계정과 Learning 기수 운영 권한을 정규화하고 생략된 선택 시각은 null로 채운다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const dashboard = await repository.loadDashboard();

    // Then
    assert.deepEqual(fixture.calls, [
        ["getUsers", {page: 0, size: 100, sort: "CREATED_AT_DESC"}],
        ["getCohorts"]
    ]);
    assert.deepEqual(dashboard.users, [{
        id: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1",
        email: "manager@example.com",
        name: "기수 관리자",
        globalRole: "USER",
        status: "ACTIVE",
        failedLoginAttempts: 0,
        lockedUntil: null,
        withdrawnAt: null,
        joinedAt: "2026-08-31",
        managerCohortIds: ["3"]
    }]);
    assert.equal(dashboard.capabilities.identity, true);
    assert.equal(dashboard.capabilities.managerWrite, true);
    assert.equal(dashboard.capabilities.identityWrite, false);
    assert.equal(dashboard.cohorts[0].memberCount, 34);
    assert.equal(dashboard.cohorts[0].id, "3");
    assert.equal(dashboard.cohorts[0].managerAssignmentKnown, true);
});

test("계정이 100명을 넘으면 Identity의 모든 페이지를 이어서 불러온다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.getUsers = async (query) => {
        fixture.calls.push(["getUsers", query]);
        return {
            items: [{
                accountId: `account-${query.page}`,
                email: `user${query.page}@example.com`,
                name: `사용자 ${query.page}`,
                role: "USER",
                status: "ACTIVE",
                failedLoginAttempts: 0,
                lockedUntil: null,
                withdrawnAt: null,
                createdAt: "2026-08-31T07:00:00Z",
                managedCohorts: []
            }],
            page: {
                number: query.page,
                size: 100,
                totalElements: 101,
                totalPages: 2
            }
        };
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const dashboard = await repository.loadDashboard();

    // Then
    assert.equal(dashboard.users.length, 2);
    assert.deepEqual(fixture.calls.filter(([name]) => name === "getUsers"), [
        ["getUsers", {page: 0, size: 100, sort: "CREATED_AT_DESC"}],
        ["getUsers", {page: 1, size: 100, sort: "CREATED_AT_DESC"}]
    ]);
});

test("Identity 페이지 번호가 요청과 다르면 잘못된 응답으로 거부한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.getUsers = async () => ({
        items: [],
        page: {
            number: 1,
            size: 100,
            totalElements: 0,
            totalPages: 0
        }
    });
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const loadDashboard = repository.loadDashboard();

    // Then
    await assert.rejects(loadDashboard, /사용자 목록 응답 형식이 올바르지 않습니다/);
});

test("Identity 사용자 필수 필드가 없으면 잘못된 응답으로 거부한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.getUsers = async () => ({
        items: [{
            accountId: "account-id",
            email: "",
            name: "사용자",
            role: "USER",
            status: "ACTIVE",
            createdAt: "2026-08-31T07:00:00Z"
        }],
        page: {
            number: 0,
            size: 100,
            totalElements: 1,
            totalPages: 1
        }
    });
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const loadDashboard = repository.loadDashboard();

    // Then
    await assert.rejects(loadDashboard, /사용자 목록 응답 형식이 올바르지 않습니다/);
});

test("기수 생성 요청에는 현재 Learning 계약 필드만 보내고 관리자는 후속 호출한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.createCohort({
        name: "Cloud 3기",
        description: "클라우드 과정",
        startDate: "2027-02-01",
        endDate: "2027-07-31",
        managerUserId: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"
    });

    // Then
    assert.deepEqual(fixture.calls, [
        ["createCohort", {
            name: "Cloud 3기",
            description: "클라우드 과정",
            startDate: "2027-02-01",
            endDate: "2027-07-31"
        }],
        ["addManager", 4, "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"]
    ]);
});

test("기수 매니저 변경은 해제 후 신규 승격 순서로 Learning API에 위임한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.updateUserPermissions("user-id", {
        previousManagerCohortIds: ["3", "4"],
        managerCohortIds: ["4", "5"]
    });

    // Then
    assert.deepEqual(fixture.calls, [
        ["removeManager", "user-id", "3"],
        ["assignManager", "user-id", "5"]
    ]);
});

test("선택 UI에 없는 CLOSED 기수 관리자 배정은 저장 목록에 보존한다", () => {
    // Given
    const previousSelection = ["closed-cohort", "editable-old"];
    const editableCohorts = ["editable-old", "editable-new"];
    const currentSelection = ["editable-new"];

    // When
    const mergedSelection = mergeManagerCohortSelection(
        previousSelection,
        editableCohorts,
        currentSelection
    );

    // Then
    assert.deepEqual(
        mergedSelection,
        ["closed-cohort", "editable-new"]
    );
});

test("신규 관리자 승격이 실패하면 먼저 해제한 권한을 보상 복구한다", async () => {
    // Given
    const fixture = apiFixture();
    const assignmentFailure = new Error("신규 관리자 승격 실패");
    fixture.api.systemAdmin.assignManager = async (userId, cohortId) => {
        fixture.calls.push(["assignManager", userId, cohortId]);
        if (cohortId === "5") throw assignmentFailure;
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const updatePermissions = repository.updateUserPermissions("user-id", {
        previousManagerCohortIds: ["3", "4"],
        managerCohortIds: ["4", "5"]
    });

    // Then
    await assert.rejects(updatePermissions, assignmentFailure);

    assert.deepEqual(fixture.calls, [
        ["removeManager", "user-id", "3"],
        ["assignManager", "user-id", "5"],
        ["assignManager", "user-id", "3"]
    ]);
});

test("권한 변경과 보상 복구가 모두 실패하면 부분 실패 코드로 알린다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.assignManager = async (userId, cohortId) => {
        fixture.calls.push(["assignManager", userId, cohortId]);
        throw new Error(`${cohortId} 승격 실패`);
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const updatePermissions = repository.updateUserPermissions("user-id", {
        previousManagerCohortIds: ["3"],
        managerCohortIds: ["5"]
    });

    // Then
    await assert.rejects(
        updatePermissions,
        (error) => error.code === "MANAGER_PERMISSION_UPDATE_PARTIAL_FAILURE"
            && error.rollbackErrors.length === 1
    );

    assert.deepEqual(fixture.calls, [
        ["removeManager", "user-id", "3"],
        ["assignManager", "user-id", "5"],
        ["assignManager", "user-id", "3"]
    ]);
});

test("초기 관리자 배치가 실패하면 생성된 PREPARING 기수를 보상 삭제한다", async () => {
    // Given
    const fixture = apiFixture();
    const assignmentFailure = Object.assign(new Error("관리자 기간 중복"), {
        code: "COHORT_MANAGER_PERIOD_CONFLICT"
    });
    fixture.api.manager.addManager = async (cohortId, userId) => {
        fixture.calls.push(["addManager", cohortId, userId]);
        throw assignmentFailure;
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const createCohort = repository.createCohort({
        name: "Cloud 3기",
        startDate: "2027-02-01",
        endDate: "2027-07-31",
        managerUserId: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"
    });

    // Then
    await assert.rejects(
        createCohort,
        assignmentFailure
    );

    assert.deepEqual(fixture.calls, [
        ["createCohort", {
            name: "Cloud 3기",
            description: null,
            startDate: "2027-02-01",
            endDate: "2027-07-31"
        }],
        ["addManager", 4, "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"],
        ["deleteCohort", 4]
    ]);
});

test("관리자 배치와 보상 삭제가 모두 실패하면 생성된 기수 ID를 반환한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.manager.addManager = async () => {
        throw new Error("관리자 배치 실패");
    };
    fixture.api.manager.deleteCohort = async () => {
        throw new Error("보상 삭제 실패");
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const createCohort = repository.createCohort({
        name: "Cloud 3기",
        startDate: "2027-02-01",
        endDate: "2027-07-31",
        managerUserId: "manager-id"
    });

    // Then
    await assert.rejects(
        createCohort,
        (error) => error.code === "COHORT_CREATED_MANAGER_ASSIGNMENT_FAILED"
            && error.createdCohortId === 4
    );
});

test("PREPARING 기수 삭제는 Admin Learning BFF 클라이언트로 위임한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.deleteCohort("4");

    // Then
    assert.deepEqual(fixture.calls, [["deleteCohort", "4"]]);
});

test("기수 상태 변경은 Admin Learning BFF 클라이언트로 위임한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const changed = await repository.changeCohortStatus("4", "ACTIVE");

    // Then
    assert.deepEqual(fixture.calls, [["updateCohortStatus", "4", "ACTIVE"]]);
    assert.equal(changed.status, "ACTIVE");
});
