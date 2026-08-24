import assert from "node:assert/strict";
import test from "node:test";
import {createSystemAdminApiRepository} from "../../main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js";

function apiFixture() {
    const calls = [];
    return {
        calls,
        api: {
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

test("실제 저장소는 목 사용자 없이 Learning 기수 목록을 정규화한다", async () => {
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    const dashboard = await repository.loadDashboard();

    assert.deepEqual(fixture.calls, [["getCohorts"]]);
    assert.deepEqual(dashboard.users, []);
    assert.equal(dashboard.capabilities.identity, false);
    assert.equal(dashboard.cohorts[0].memberCount, 34);
    assert.equal(dashboard.cohorts[0].managerAssignmentKnown, true);
});

test("기수 생성 요청에는 현재 Learning 계약 필드만 보내고 관리자는 후속 호출한다", async () => {
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    await repository.createCohort({
        name: "Cloud 3기",
        description: "클라우드 과정",
        startDate: "2027-02-01",
        endDate: "2027-07-31",
        managerUserId: "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"
    });

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

test("PREPARING 기수 삭제는 Admin Learning BFF 클라이언트로 위임한다", async () => {
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    await repository.deleteCohort("4");

    assert.deepEqual(fixture.calls, [["deleteCohort", "4"]]);
});

test("기수 상태 변경은 Admin Learning BFF 클라이언트로 위임한다", async () => {
    const fixture = apiFixture();
    const repository = createSystemAdminApiRepository(fixture.api);

    const changed = await repository.changeCohortStatus("4", "ACTIVE");

    assert.deepEqual(fixture.calls, [["updateCohortStatus", "4", "ACTIVE"]]);
    assert.equal(changed.status, "ACTIVE");
});
