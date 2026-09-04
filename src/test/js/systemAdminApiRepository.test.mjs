import assert from "node:assert/strict";
import test from "node:test";
import {
    createSystemAdminApiRepository,
    formatAuditTime,
    normalizeAudit
} from "../../main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js";
import {
    formatTimestampDate,
    mergeManagerCohortSelection
} from "../../main/resources/static/js/system-admin/dashboard/dashboardController.js";

test("UTC 타임스탬프를 서울 날짜로 표시한다", () => {
    assert.equal(formatTimestampDate("2026-09-03T15:30:00Z"), "2026.09.04");
    assert.equal(formatTimestampDate("invalid"), "-");
});

function apiFixture({
    missingPolicyFor = [],
    failPolicySave = false,
    failStatusChange = false,
    failRoleChange = false,
    failAuditLoad = false,
    audits = null
} = {}) {
    const calls = [];
    const missingPolicyCohortIds = new Set(missingPolicyFor.map(String));
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
                            locked: false,
                            lockedUntil: null,
                            statusChangedAt: "2026-08-31T07:00:00Z",
                            recoveryDeadline: null,
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
                async changeAccountStatus(userId, status, reason) {
                    calls.push(["changeAccountStatus", userId, status, reason]);
                    if (failStatusChange) {
                        const error = new Error("계정 상태를 변경하지 못했습니다.");
                        error.code = "ACCOUNT_LAST_SYSTEM_ADMIN";
                        throw error;
                    }
                },
                async unlockLogin(userId, reason) {
                    calls.push(["unlockLogin", userId, reason]);
                },
                async getAudits(query) {
                    calls.push(["getAudits", query]);
                    if (failAuditLoad) {
                        throw new Error("감사 로그 서비스를 사용할 수 없습니다.");
                    }
                    return {
                        items: audits ?? [{
                            auditType: "ACCOUNT_ROLE",
                            action: "ROLE_GRANTED",
                            actorUserId: "00000000-0000-0000-0000-000000000001",
                            actorName: "시스템 관리자",
                            targetUserId: "00000000-0000-0000-0000-000000000002",
                            targetName: "문재민",
                            beforeValue: "USER",
                            afterValue: "SYSTEM_ADMIN",
                            reason: "운영 인수인계",
                            occurredAt: "2026-09-02T05:03:00Z"
                        }],
                        page: {number: query.page, size: query.size, totalElements: 1, totalPages: 1}
                    };
                },
                async changeAccountRole(userId, role, reason) {
                    calls.push(["changeAccountRole", userId, role, reason]);
                    if (failRoleChange) {
                        const error = new Error("전역 역할을 변경하지 못했습니다.");
                        error.code = "ACCOUNT_SELF_ROLE_CHANGE_NOT_ALLOWED";
                        throw error;
                    }
                },
                async assignManager(userId, cohortId) {
                    calls.push(["assignManager", userId, cohortId]);
                },
                async removeManager(userId, cohortId) {
                    calls.push(["removeManager", userId, cohortId]);
                }
            },
            manager: {
                async getAttendancePolicy(cohortId) {
                    calls.push(["getAttendancePolicy", cohortId]);
                    if (missingPolicyCohortIds.has(String(cohortId))) {
                        const error = new Error("요청한 정보를 찾을 수 없습니다.");
                        error.code = "ATTENDANCE_POLICY_NOT_FOUND";
                        throw error;
                    }
                    return {
                        cohortId,
                        timezone: "Asia/Seoul",
                        scheduledStartTime: "09:00:00",
                        scheduledEndTime: "18:00:00",
                        absenceCutoffTime: "10:00:00",
                        allowedAwayMinutes: 30
                    };
                },
                async updateAttendancePolicy(cohortId, payload) {
                    calls.push(["updateAttendancePolicy", cohortId, payload]);
                    if (failPolicySave) {
                        const error = new Error("출결 정책을 저장하지 못했습니다.");
                        error.code = "COHORT_MANAGER_REQUIRED";
                        throw error;
                    }
                    return {cohortId, ...payload};
                },
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
        ["getCohorts"],
        ["getAudits", {page: 0, size: 20}]
    ]);
    assert.deepEqual(dashboard.users, [{
        id: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1",
        email: "manager@example.com",
        name: "기수 관리자",
        globalRole: "USER",
        status: "ACTIVE",
        failedLoginAttempts: 0,
        locked: false,
        lockedUntil: null,
        statusChangedAt: "2026-08-31T07:00:00Z",
        recoveryDeadline: null,
        joinedAt: "2026-08-31",
        managerCohortIds: ["3"]
    }]);
    assert.equal(dashboard.capabilities.identity, true);
    assert.equal(dashboard.capabilities.managerWrite, true);
    assert.equal(dashboard.capabilities.identityWrite, true);
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
                locked: false,
                lockedUntil: null,
                statusChangedAt: "2026-08-31T07:00:00Z",
                recoveryDeadline: null,
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

test("탈퇴 계정의 복구 기한이 없으면 잘못된 응답으로 거부한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.getUsers = async () => ({
        items: [{
            accountId: "account-id",
            email: "withdrawn@example.com",
            name: "탈퇴 사용자",
            role: "USER",
            status: "WITHDRAWN",
            failedLoginAttempts: 0,
            locked: false,
            lockedUntil: null,
            statusChangedAt: "2026-08-31T07:00:00Z",
            recoveryDeadline: null,
            createdAt: "2026-08-01T07:00:00Z",
            managedCohorts: []
        }],
        page: {
            number: 0,
            size: 100,
            totalElements: 1,
            totalPages: 1
        }
    });
    const repository = createSystemAdminApiRepository(fixture.api);

    // When & Then
    await assert.rejects(
        repository.loadDashboard(),
        /사용자 목록 응답 형식이 올바르지 않습니다/
    );
});

test("계정 역할·상태 허용 목록과 비활성 계정 잠금 불변식을 검증한다", async () => {
    const invalidAccounts = [
        {role: "COHORT_MANAGER"},
        {status: 'ACTIVE\" onmouseover=\"alert(1)'},
        {
            status: "DISABLED",
            failedLoginAttempts: 5,
            locked: true,
            lockedUntil: "2026-09-01T08:00:00Z"
        }
    ];

    for (const invalidAccount of invalidAccounts) {
        const fixture = apiFixture();
        const getUsers = fixture.api.systemAdmin.getUsers;
        fixture.api.systemAdmin.getUsers = async (query) => {
            const response = await getUsers(query);
            return {
                ...response,
                items: [{...response.items[0], ...invalidAccount}]
            };
        };

        await assert.rejects(
            createSystemAdminApiRepository(fixture.api).loadDashboard(),
            /사용자 목록 응답 형식이 올바르지 않습니다/
        );
    }
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

test("출결 정책 조회는 시각을 input[type=time] 형식으로 눕힌다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const loaded = await repository.loadAttendancePolicy("3");

    // Then
    assert.equal(loaded.configured, true);
    assert.equal(loaded.policy.scheduledStartTime, "09:00");
    assert.equal(loaded.policy.scheduledEndTime, "18:00");
    assert.equal(loaded.policy.absenceCutoffTime, "10:00");
    assert.equal(loaded.policy.allowedAwayMinutes, 30);
});

test("정책이 없는 기수는 오류가 아니라 미설정 기본값으로 돌려준다", async () => {
    // Given
    const fixture = apiFixture({missingPolicyFor: ["4"]});
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const loaded = await repository.loadAttendancePolicy("4");

    // Then
    assert.equal(loaded.configured, false);
    assert.equal(loaded.policy.timezone, "Asia/Seoul");
    assert.equal(loaded.policy.scheduledStartTime, "09:00");
});

test("정책 조회의 다른 실패는 미설정으로 흡수하지 않는다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.manager.getAttendancePolicy = async () => {
        const error = new Error("권한이 없습니다.");
        error.code = "COHORT_MANAGER_REQUIRED";
        throw error;
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.loadAttendancePolicy("3"),
        (error) => error.code === "COHORT_MANAGER_REQUIRED"
    );
});

test("시작 시각이 종료 시각보다 늦으면 서버로 보내지 않는다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.saveAttendancePolicy("3", {
            timezone: "Asia/Seoul",
            scheduledStartTime: "18:00",
            scheduledEndTime: "09:00",
            absenceCutoffTime: "",
            allowedAwayMinutes: 30
        }),
        (error) => error.code === "ATTENDANCE_POLICY_INVALID_INPUT"
    );
    assert.deepEqual(fixture.calls, []);
});

test("비어 있는 결석 기준 시각은 null로 보낸다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.saveAttendancePolicy("3", {
        timezone: "Asia/Seoul",
        scheduledStartTime: "09:00",
        scheduledEndTime: "18:00",
        absenceCutoffTime: "",
        allowedAwayMinutes: "30"
    });

    // Then
    assert.deepEqual(fixture.calls, [["updateAttendancePolicy", "3", {
        timezone: "Asia/Seoul",
        scheduledStartTime: "09:00",
        scheduledEndTime: "18:00",
        absenceCutoffTime: null,
        allowedAwayMinutes: 30
    }]]);
});

test("기수 생성은 출결 정책까지 저장한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.createCohort({
        name: "AIoT 5기",
        description: "설명",
        startDate: "2027-01-01",
        endDate: "2027-06-30",
        attendancePolicy: {
            timezone: "Asia/Seoul",
            scheduledStartTime: "09:00",
            scheduledEndTime: "18:00",
            absenceCutoffTime: "10:00",
            allowedAwayMinutes: 30
        }
    });

    // Then
    assert.deepEqual(fixture.calls.map((call) => call[0]), ["createCohort", "updateAttendancePolicy"]);
});

test("출결 정책 저장이 실패하면 방금 만든 기수를 되돌린다", async () => {
    // Given
    const fixture = apiFixture({failPolicySave: true});
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(() => repository.createCohort({
        name: "AIoT 5기",
        startDate: "2027-01-01",
        endDate: "2027-06-30",
        attendancePolicy: {
            timezone: "Asia/Seoul",
            scheduledStartTime: "09:00",
            scheduledEndTime: "18:00",
            absenceCutoffTime: "10:00",
            allowedAwayMinutes: 30
        }
    }));

    // 정책 없는 기수가 남으면 그 기수 학생 전원이 체크인에 실패한다.
    assert.deepEqual(
        fixture.calls.map((call) => call[0]),
        ["createCohort", "updateAttendancePolicy", "deleteCohort"]
    );
});

test("계정 상태를 바꿀 때만 상태 변경 API를 부른다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.updateUserPermissions("019d2a48-80c0-4d6a-9a15-0b16d2dd74f1", {
        statusChanged: false,
        managerCohortIds: [],
        previousManagerCohortIds: []
    });

    // Then
    assert.deepEqual(fixture.calls, []);
});

test("계정 상태 변경은 기수 권한 변경보다 먼저 실행한다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.updateUserPermissions("user-1", {
        statusChanged: true,
        status: "DISABLED",
        reason: "부정 사용 신고",
        managerCohortIds: ["3"],
        previousManagerCohortIds: []
    });

    // Then
    assert.deepEqual(fixture.calls, [
        ["changeAccountStatus", "user-1", "DISABLED", "부정 사용 신고"],
        ["assignManager", "user-1", "3"]
    ]);
});

test("계정 상태 변경이 실패하면 기수 권한은 손대지 않는다", async () => {
    // Given
    const fixture = apiFixture({failStatusChange: true});
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.updateUserPermissions("user-1", {
            statusChanged: true,
            status: "DISABLED",
            reason: "부정 사용 신고",
            managerCohortIds: ["3"],
            previousManagerCohortIds: []
        }),
        (error) => error.code === "ACCOUNT_LAST_SYSTEM_ADMIN"
    );

    // 상태만 시도하고 멈춘다. 반대 순서였다면 기수 권한만 바뀐 상태가 남는다.
    assert.deepEqual(fixture.calls.map((call) => call[0]), ["changeAccountStatus"]);
});

test("기수 권한이 실패하면 이미 반영된 계정 상태를 오류에 표시한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.assignManager = async () => {
        throw new Error("기수 권한 배정 실패");
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.updateUserPermissions("user-1", {
            statusChanged: true,
            status: "DISABLED",
            reason: "부정 사용 신고",
            managerCohortIds: ["3"],
            previousManagerCohortIds: []
        }),
        // 상태는 되돌리지 않는다. 감사 기록이 남고 세션도 폐기됐기 때문이다.
        (error) => error.statusApplied === true
    );
});


test("활성화는 역할 변경보다 먼저, 비활성화는 역할 변경보다 나중에 실행한다", async () => {
    // Given: 비활성 계정을 다시 열면서 관리자 권한을 준다
    const activating = apiFixture();
    const activatingRepository = createSystemAdminApiRepository(activating.api);

    // When
    await activatingRepository.updateUserPermissions("user-1", {
        statusChanged: true,
        status: "ACTIVE",
        roleChanged: true,
        globalRole: "SYSTEM_ADMIN",
        reason: "복직 처리",
        managerCohortIds: [],
        previousManagerCohortIds: []
    });

    // Then: 상태를 먼저 열지 않으면 Identity 가 역할 변경을 거부한다
    assert.deepEqual(activating.calls, [
        ["changeAccountStatus", "user-1", "ACTIVE", "복직 처리"],
        ["changeAccountRole", "user-1", "SYSTEM_ADMIN", "복직 처리"]
    ]);

    // Given: 관리자 권한을 회수하면서 계정을 닫는다
    const disabling = apiFixture();
    const disablingRepository = createSystemAdminApiRepository(disabling.api);

    // When
    await disablingRepository.updateUserPermissions("user-1", {
        statusChanged: true,
        status: "DISABLED",
        roleChanged: true,
        globalRole: "USER",
        reason: "퇴사 처리",
        managerCohortIds: [],
        previousManagerCohortIds: []
    });

    // Then: 먼저 닫으면 뒤따르는 역할 변경이 Identity 에서 막힌다
    assert.deepEqual(disabling.calls, [
        ["changeAccountRole", "user-1", "USER", "퇴사 처리"],
        ["changeAccountStatus", "user-1", "DISABLED", "퇴사 처리"]
    ]);
});

test("역할 변경이 실패하면 기수 권한과 비활성화는 실행하지 않는다", async () => {
    // Given
    const fixture = apiFixture({failRoleChange: true});
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.updateUserPermissions("user-1", {
            statusChanged: true,
            status: "DISABLED",
            roleChanged: true,
            globalRole: "USER",
            reason: "퇴사 처리",
            managerCohortIds: ["3"],
            previousManagerCohortIds: []
        }),
        (error) => error.code === "ACCOUNT_SELF_ROLE_CHANGE_NOT_ALLOWED"
            && error.statusApplied === false
    );

    assert.deepEqual(fixture.calls.map((call) => call[0]), ["changeAccountRole"]);
});

test("기수 권한이 실패하면 이미 반영된 전역 역할을 오류에 표시한다", async () => {
    // Given
    const fixture = apiFixture();
    fixture.api.systemAdmin.assignManager = async () => {
        throw new Error("기수 권한 배정 실패");
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When / Then
    await assert.rejects(
        () => repository.updateUserPermissions("user-1", {
            statusChanged: false,
            roleChanged: true,
            globalRole: "SYSTEM_ADMIN",
            reason: "운영 인수인계",
            managerCohortIds: ["3"],
            previousManagerCohortIds: []
        }),
        // 역할은 되돌리지 않는다. 감사 기록이 남기 때문이다.
        (error) => error.roleApplied === true && error.statusApplied === false
    );
});

test("상태·역할을 모두 그대로 두면 Identity 를 호출하지 않는다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    await repository.updateUserPermissions("user-1", {
        statusChanged: false,
        roleChanged: false,
        reason: "",
        managerCohortIds: ["3"],
        previousManagerCohortIds: []
    });

    // Then
    assert.deepEqual(fixture.calls, [["assignManager", "user-1", "3"]]);
});


test("감사 로그를 불러오면 audit 기능을 열고 화면 모델로 옮긴다", async () => {
    // Given
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const dashboard = await repository.loadDashboard();

    // Then
    assert.equal(dashboard.capabilities.audit, true);
    assert.equal(dashboard.auditError, null);
    assert.deepEqual(dashboard.auditPage, {
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1
    });
    assert.equal(dashboard.audits.length, 1);
    assert.equal(dashboard.audits[0].action, "시스템 관리자 권한 부여");
    assert.match(dashboard.audits[0].detail, /^문재민 · USER → SYSTEM_ADMIN · 운영 인수인계$/);
    assert.equal(dashboard.audits[0].actor, "시스템 관리자");
});

test("감사 로그의 요청 페이지와 페이지 정보를 보존한다", async () => {
    // Given: 두 번째 감사 로그 페이지 응답
    const fixture = apiFixture();
    fixture.api.systemAdmin.getAudits = async (query) => {
        fixture.calls.push(["getAudits", query]);
        return {
            items: [{
                auditType: "ACCOUNT_STATUS",
                action: "ACCOUNT_DISABLED",
                actorUserId: "00000000-0000-0000-0000-000000000001",
                actorName: "시스템 관리자",
                targetUserId: "00000000-0000-0000-0000-000000000002",
                targetName: "대상 사용자",
                beforeValue: "ACTIVE",
                afterValue: "DISABLED",
                reason: "운영 정책 위반",
                occurredAt: "2026-09-02T05:03:00Z"
            }],
            page: {number: query.page, size: query.size, totalElements: 21, totalPages: 2}
        };
    };
    const repository = createSystemAdminApiRepository(fixture.api);

    // When: 두 번째 페이지 조회
    const loaded = await repository.loadAuditPage(1);

    // Then: 감사 로그만 해당 페이지로 조회하고 페이지 정보를 유지
    assert.deepEqual(fixture.calls, [["getAudits", {page: 1, size: 20}]]);
    assert.equal(loaded.items[0].action, "계정 비활성화");
    assert.deepEqual(loaded.page, {
        number: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2
    });
});

test("요청과 다른 감사 로그 페이지 응답을 거부한다", async () => {
    // Given: 요청과 다른 페이지 번호를 반환하는 Identity 응답
    const fixture = apiFixture();
    fixture.api.systemAdmin.getAudits = async (query) => ({
        items: [],
        page: {number: query.page - 1, size: query.size, totalElements: 21, totalPages: 2}
    });
    const repository = createSystemAdminApiRepository(fixture.api);

    // When: 두 번째 페이지 조회
    const loadAuditPage = repository.loadAuditPage(1);

    // Then: 감사 로그 응답 계약 위반 처리
    await assert.rejects(loadAuditPage, /감사 로그 응답 형식이 올바르지 않습니다/);
});

test("감사 로그 조회가 실패해도 대시보드는 살아 있고 실패 사유를 남긴다", async () => {
    // Given
    const fixture = apiFixture({failAuditLoad: true});
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const dashboard = await repository.loadDashboard();

    // Then: 사용자·기수는 그대로 쓰고, 감사만 닫는다
    assert.equal(dashboard.users.length, 1);
    // 실패를 "연동 대기"로 위장하지 않는다
    assert.equal(dashboard.capabilities.audit, false);
    assert.match(dashboard.auditError, /감사 로그 서비스를 사용할 수 없습니다/);
    assert.deepEqual(dashboard.audits, []);
});

test("사유나 이전 값이 없어도 감사 한 줄을 보여 준다", async () => {
    // Given: 최초 권한 부여라 이전 값이 없고, 사유도 남기지 않은 행
    // 예전에는 이 셋을 필수로 두어 이런 행 하나에 감사 패널 전체가 오류로 막혔다.
    const fixture = apiFixture({
        audits: [{
            auditType: "ACCOUNT_ROLE",
            action: "ROLE_GRANTED",
            actorUserId: "00000000-0000-0000-0000-000000000001",
            targetUserId: "00000000-0000-0000-0000-000000000002",
            beforeValue: null,
            afterValue: "SYSTEM_ADMIN",
            reason: "   ",
            occurredAt: "2026-09-02T05:03:00Z"
        }]
    });
    const repository = createSystemAdminApiRepository(fixture.api);

    // When
    const dashboard = await repository.loadDashboard();

    // Then: 패널은 살아 있고, 없는 값은 없다고 표기한다
    assert.equal(dashboard.capabilities.audit, true);
    assert.equal(dashboard.auditError, null);
    assert.equal(dashboard.audits.length, 1);
    assert.match(dashboard.audits[0].detail, /— → SYSTEM_ADMIN · 사유 없음/);
});

test("언제·누가·누구에게·무엇을 중 하나라도 빠지면 패널 전체를 실패로 만든다", async () => {
    // 이 넷은 감사 한 줄이 성립하는 최소 조건이다. 조용히 한 줄만 빼면
    // "기록이 없었다"와 "보여 주지 못했다"를 구분할 수 없다.
    const required = ["action", "actorUserId", "targetUserId", "occurredAt"];
    for (const field of required) {
        const row = {
            auditType: "ACCOUNT_STATUS",
            action: "ACCOUNT_DISABLED",
            actorUserId: "00000000-0000-0000-0000-000000000001",
            targetUserId: "00000000-0000-0000-0000-000000000002",
            beforeValue: "ACTIVE",
            afterValue: "DISABLED",
            reason: "부정 사용 신고",
            occurredAt: "2026-09-02T05:03:00Z"
        };
        delete row[field];

        const repository = createSystemAdminApiRepository(apiFixture({audits: [row]}).api);
        const dashboard = await repository.loadDashboard();

        assert.equal(dashboard.capabilities.audit, false, `${field} 누락이 통과했습니다.`);
        assert.match(dashboard.auditError, /올바르지 않습니다/, `${field} 누락`);
    }
});

test("이름이 없는 감사는 UUID 로 대체하고 행을 유지한다", () => {
    // Given: 계정 조회에 실패해 이름이 비어 온 행
    const audit = normalizeAudit({
        auditType: "ACCOUNT_ROLE",
        action: "ROLE_REVOKED",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        actorName: null,
        targetUserId: "00000000-0000-0000-0000-000000000002",
        targetName: null,
        beforeValue: "SYSTEM_ADMIN",
        afterValue: "USER",
        reason: "퇴사 처리",
        occurredAt: "2026-09-02T05:03:00Z"
    });

    // Then: 누가 했는지는 UUID 가 보장한다
    assert.equal(audit.actor, "00000000-0000-0000-0000-000000000001");
    assert.match(audit.detail, /^00000000-0000-0000-0000-000000000002 · SYSTEM_ADMIN → USER/);
});

test("모르는 action 은 뭉개지 않고 원문을 보여 준다", () => {
    // Given: 서버에 새 action 이 추가된 상황
    const audit = normalizeAudit({
        auditType: "ACCOUNT_ROLE",
        action: "ROLE_SUSPENDED",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        targetUserId: "00000000-0000-0000-0000-000000000002",
        beforeValue: "SYSTEM_ADMIN",
        afterValue: "USER",
        reason: "확인",
        occurredAt: "2026-09-02T05:03:00Z"
    });

    // Then: "기타"로 덮으면 새 action 이 생긴 사실이 감춰진다
    assert.equal(audit.action, "ROLE_SUSPENDED");
});

test("발생 시각이 깨진 감사는 거부한다", () => {
    assert.throws(() => formatAuditTime("not-a-date"), /발생 시각이 올바르지 않습니다/);
});
