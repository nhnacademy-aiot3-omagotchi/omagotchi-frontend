import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {
    collectAccessibleCohorts,
    createTeamApp,
    findTeamForCohort,
    isMaster,
    isSelectableCandidate,
    teamErrorMessage
} from "../../main/resources/static/js/team.js";

function createRoot() {
    const listeners = {};
    return {
        addEventListener(type, listener) {
            listeners[type] = listener;
        },
        dispatch(type, target, extras = {}) {
            listeners[type]?.({target, preventDefault() {}, ...extras});
        },
        dataset: {},
        innerHTML: "",
        isConnected: true
    };
}

function target(matches = {}) {
    return {
        closest(selector) {
            return matches[selector] || null;
        }
    };
}

function detail(teamId, cohortId, name, myRole = "MEMBER") {
    return {
        teamId,
        cohortId,
        name,
        memberCount: 2,
        myMemberId: 11,
        myRole,
        members: [
            {memberId: 10, displayName: "김마스터", role: "MASTER", joinedAt: "2026-09-01T00:00:00Z"},
            {memberId: 11, displayName: "이나", role: "MEMBER", joinedAt: "2026-09-01T01:00:00Z"}
        ]
    };
}

function access(...cohorts) {
    return {managedCohorts: [], studentCohorts: cohorts};
}

async function settle() {
    await new Promise(setImmediate);
    await new Promise(setImmediate);
}

test("접근 가능한 기수는 관리자와 학생 목록을 합치고 cohortId로 중복을 제거한다", () => {
    assert.deepEqual(
        collectAccessibleCohorts({
            managedCohorts: [{cohortId: 2, name: "2기"}],
            studentCohorts: [{cohortId: 1, name: "1기"}, {cohortId: 2, name: "중복 2기"}]
        }),
        [{cohortId: 2, name: "2기"}, {cohortId: 1, name: "1기"}]
    );
});

test("내 팀 목록 순서와 무관하게 선택한 기수의 팀을 찾는다", () => {
    const teams = [
        {teamId: 10, cohortId: 1, name: "1기 팀"},
        {teamId: 20, cohortId: 2, name: "2기 팀"}
    ];
    assert.equal(findTeamForCohort(teams.reverse(), 1)?.teamId, 10);
});

test("팀이 없으면 선택한 활성 기수의 팀 생성 화면으로 진입할 수 있다", async () => {
    const api = {
        teams: {mine: async () => [], detail: async () => assert.fail("상세 조회를 호출하면 안 됩니다.")},
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    };
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 3}}});
    const root = createRoot();

    app.mount(root);
    await app.refresh();

    assert.match(root.innerHTML, /새 팀 만들기/);
    assert.match(root.innerHTML, /3기에 참여할 팀이 없습니다/);
    assert.doesNotMatch(root.innerHTML, /data-team-cohort-select/);

    root.dispatch("click", target({"[data-team-open-create]": {}}));
    assert.match(root.innerHTML, /data-team-create-form/);
    assert.match(root.innerHTML, /팀 이름/);
});

test("활성 기수가 여러 개이고 현재 기수가 없으면 기수 선택을 요구한다", async () => {
    const api = {
        teams: {mine: async () => [], detail: async () => assert.fail("상세 조회를 호출하면 안 됩니다.")},
        access: {
            getContext: async () => access(
                {cohortId: 3, name: "3기"},
                {cohortId: 4, name: "4기"}
            )
        }
    };
    const app = createTeamApp({api});
    const root = createRoot();

    app.mount(root);
    await app.refresh();

    assert.match(root.innerHTML, /data-team-cohort-select/);
    assert.match(root.innerHTML, /기수를 선택하세요/);
    assert.match(root.innerHTML, /팀을 확인할 기수를 선택해 주세요/);
});

test("내 팀 목록의 첫 항목이 달라도 현재 기수 팀의 상세를 조회한다", async () => {
    const detailRequests = [];
    const api = {
        teams: {
            mine: async () => [
                {teamId: 20, cohortId: 2, name: "2기 팀"},
                {teamId: 10, cohortId: 1, name: "1기 팀"}
            ],
            detail: async (teamId) => {
                detailRequests.push(teamId);
                return detail(teamId, 1, "1기 팀");
            }
        },
        access: {getContext: async () => access({cohortId: 1, name: "1기"}, {cohortId: 2, name: "2기"})}
    };
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 1}}});
    const root = createRoot();

    app.mount(root);
    await app.refresh();

    assert.deepEqual(detailRequests, [10]);
    assert.match(root.innerHTML, /1기 팀/);
    assert.doesNotMatch(root.innerHTML, /2기 팀/);
    assert.match(root.innerHTML, /김마스터/);
    assert.match(root.innerHTML, /이나/);
    assert.doesNotMatch(root.innerHTML, /characterImage|캐릭터/);
});

test("팀 생성 성공 후 로컬 객체를 만들지 않고 목록과 상세를 다시 조회한다", async () => {
    let created = false;
    let mineRequests = 0;
    let detailRequests = 0;
    const createRequests = [];
    const api = {
        teams: {
            mine: async () => {
                mineRequests += 1;
                return created ? [{teamId: 30, cohortId: 3, name: "서버 팀"}] : [];
            },
            create: async (body) => {
                createRequests.push(body);
                created = true;
                return {teamId: 30, cohortId: 3, name: "서버 팀"};
            },
            detail: async () => {
                detailRequests += 1;
                return detail(30, 3, "서버 팀", "MASTER");
            }
        },
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    };
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 3}}});
    const root = createRoot();
    app.mount(root);
    await app.refresh();

    root.dispatch("click", target({"[data-team-open-create]": {}}));
    const form = {
        elements: {namedItem: () => ({value: "서버 팀"})}
    };
    root.dispatch("submit", target({"[data-team-create-form]": form}));
    await settle();

    assert.deepEqual(createRequests, [{cohortId: 3, name: "서버 팀"}]);
    assert.equal(mineRequests, 2);
    assert.equal(detailRequests, 1);
    assert.match(root.innerHTML, /서버 팀/);
    assert.match(root.innerHTML, /팀을 만들었습니다/);
});

test("팀 탈퇴 성공 후 내 팀 목록을 다시 조회해 빈 상태를 표시한다", async () => {
    let left = false;
    let mineRequests = 0;
    const leaveRequests = [];
    const api = {
        teams: {
            mine: async () => {
                mineRequests += 1;
                return left ? [] : [{teamId: 30, cohortId: 3, name: "서버 팀"}];
            },
            detail: async () => detail(30, 3, "서버 팀"),
            leave: async (teamId) => {
                leaveRequests.push(teamId);
                left = true;
            }
        },
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    };
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 3}}});
    const root = createRoot();
    app.mount(root);
    await app.refresh();

    root.dispatch("click", target({"[data-team-open-detail]": {}}));
    root.dispatch("click", target({"[data-team-leave]": {}}));
    await settle();

    assert.deepEqual(leaveRequests, [30]);
    assert.equal(mineRequests, 2);
    assert.match(root.innerHTML, /새 팀 만들기/);
    assert.match(root.innerHTML, /팀에서 나갔습니다/);
});

test("마스터 탈퇴에 위임이 필요하면 서버 오류 코드에 맞는 안내를 표시한다", async () => {
    const api = {
        teams: {
            mine: async () => [{teamId: 30, cohortId: 3, name: "서버 팀"}],
            detail: async () => detail(30, 3, "서버 팀", "MASTER"),
            leave: async () => {
                const error = new Error("요청을 처리할 수 없습니다.");
                error.code = "TEAM_DELEGATION_REQUIRED";
                throw error;
            }
        },
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    };
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 3}}});
    const root = createRoot();
    app.mount(root);
    await app.refresh();

    root.dispatch("click", target({"[data-team-open-detail]": {}}));
    root.dispatch("click", target({"[data-team-leave]": {}}));
    await settle();

    assert.match(root.innerHTML, /마스터를 위임한 뒤 다시 시도해 주세요/);
    assert.equal(teamErrorMessage({code: "UNKNOWN", message: "서버 안내"}, "기본 안내"), "서버 안내");
});

test("spaceRoom은 팀 상태와 렌더링 및 마운트 계약을 더 이상 소유하지 않는다", async () => {
    const source = await readFile(
        new URL("../../main/resources/static/js/spaceRoom.js", import.meta.url),
        "utf8"
    );
    assert.doesNotMatch(source, /state\.party|partyCreateOpen|partyDetailOpen|mountParty/);
    assert.doesNotMatch(source, /data-(?:space-)?(?:create-)?party|data-party/);
});


function masterApi(overrides = {}) {
    return {
        teams: {
            mine: async () => [{teamId: 30, cohortId: 3, name: "서버 팀"}],
            detail: async () => detail(30, 3, "서버 팀", "MASTER"),
            ...overrides
        },
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    };
}

async function mountMaster(api) {
    const app = createTeamApp({api, profile: {approvedCohort: {cohortId: 3}}});
    const root = createRoot();
    app.mount(root);
    await app.refresh();
    root.dispatch("click", target({"[data-team-open-detail]": {}}));
    return {app, root};
}

test("후보 상태별 선택 가능 여부는 AVAILABLE에서만 참이다", () => {
    assert.equal(isSelectableCandidate({status: "AVAILABLE"}), true);
    assert.equal(isSelectableCandidate({status: "ALREADY_IN_THIS_TEAM"}), false);
    assert.equal(isSelectableCandidate({status: "IN_ANOTHER_TEAM"}), false);
    assert.equal(isSelectableCandidate(undefined), false);
    assert.equal(isMaster({myRole: "MASTER"}), true);
    assert.equal(isMaster({myRole: "MEMBER"}), false);
});

test("팀원에게는 추가·제외·위임·해체 조작이 렌더되지 않는다", async () => {
    const {root} = await mountMaster({
        teams: {
            mine: async () => [{teamId: 30, cohortId: 3, name: "서버 팀"}],
            detail: async () => detail(30, 3, "서버 팀", "MEMBER")
        },
        access: {getContext: async () => access({cohortId: 3, name: "3기"})}
    });

    assert.doesNotMatch(root.innerHTML, /data-team-open-invite/);
    assert.doesNotMatch(root.innerHTML, /data-team-kick/);
    assert.doesNotMatch(root.innerHTML, /data-team-delegate/);
    assert.doesNotMatch(root.innerHTML, /data-team-disband/);
    assert.match(root.innerHTML, /data-team-leave/);
});

test("마스터에게는 자기 자신을 뺀 팀원에게만 제외·위임 조작이 붙는다", async () => {
    const {root} = await mountMaster(masterApi());

    assert.match(root.innerHTML, /data-team-open-invite/);
    assert.match(root.innerHTML, /data-team-disband/);
    // myMemberId 11 은 자기 자신이라 조작이 없고, 10 에만 붙는다.
    assert.match(root.innerHTML, /data-team-kick="10"/);
    assert.doesNotMatch(root.innerHTML, /data-team-kick="11"/);
});

test("검색어 없이 후보를 조회하지 않고 입력을 요구한다", async () => {
    let searched = 0;
    const {root} = await mountMaster(masterApi({
        memberCandidates: async () => {
            searched += 1;
            return [];
        }
    }));

    root.dispatch("click", target({"[data-team-open-invite]": {}}));
    root.dispatch("submit", target({"[data-team-candidate-form]": {
        elements: {namedItem: () => ({value: "   "})}
    }}));
    await settle();

    assert.equal(searched, 0);
    assert.match(root.innerHTML, /검색할 이름 또는 이메일을 입력해 주세요/);
});

test("이미 소속된 후보는 목록에 보이되 추가 대상으로 선택되지 않는다", async () => {
    const {root} = await mountMaster(masterApi({
        memberCandidates: async () => [
            {userId: "u-1", displayName: "박가능", email: "a@b.c", status: "AVAILABLE"},
            {userId: "u-2", displayName: "최소속", email: "d@e.f", status: "IN_ANOTHER_TEAM"}
        ]
    }));

    root.dispatch("click", target({"[data-team-open-invite]": {}}));
    root.dispatch("submit", target({"[data-team-candidate-form]": {
        elements: {namedItem: () => ({value: "박"})}
    }}));
    await settle();

    assert.match(root.innerHTML, /최소속/);
    assert.match(root.innerHTML, /다른 팀 소속/);
    assert.match(root.innerHTML, /data-team-candidate="u-2"[^>]*disabled/);
    assert.doesNotMatch(root.innerHTML, /data-team-candidate="u-1"[^>]*disabled/);
});

test("후보 검색부터 추가까지 이어지고 성공하면 상세를 다시 조회한다", async () => {
    const added = [];
    let detailRequests = 0;
    const {root} = await mountMaster(masterApi({
        detail: async () => {
            detailRequests += 1;
            return detail(30, 3, "서버 팀", "MASTER");
        },
        memberCandidates: async () => [
            {userId: "u-1", displayName: "박가능", email: "a@b.c", status: "AVAILABLE"}
        ],
        addMember: async (teamId, userId) => {
            added.push([teamId, userId]);
        }
    }));
    const before = detailRequests;

    root.dispatch("click", target({"[data-team-open-invite]": {}}));
    root.dispatch("submit", target({"[data-team-candidate-form]": {
        elements: {namedItem: () => ({value: "박"})}
    }}));
    await settle();
    root.dispatch("click", target({
        "[data-team-candidate]": {dataset: {teamCandidate: "u-1"}}
    }));
    root.dispatch("click", target({"[data-team-add-member]": {}}));
    await settle();

    assert.deepEqual(added, [[30, "u-1"]]);
    assert.ok(detailRequests > before);
    assert.match(root.innerHTML, /박가능 님을 팀원으로 추가했습니다/);
});

test("제외는 확인 단계를 거친 뒤에만 서버에 요청한다", async () => {
    const kicked = [];
    const {root} = await mountMaster(masterApi({
        kickMember: async (teamId, memberId) => {
            kicked.push([teamId, memberId]);
        }
    }));

    root.dispatch("click", target({
        "[data-team-kick]": {dataset: {teamKick: "10"}}
    }));
    await settle();
    assert.deepEqual(kicked, []);
    assert.match(root.innerHTML, /김마스터 님을 팀에서 제외할까요/);

    root.dispatch("click", target({"[data-team-confirm-accept]": {}}));
    await settle();
    // dataset 문자열이 아니라 서버 응답의 memberId 를 그대로 보낸다.
    assert.deepEqual(kicked, [[30, 10]]);
});

test("확인 단계에서 취소하면 서버에 요청하지 않는다", async () => {
    const disbanded = [];
    const {root} = await mountMaster(masterApi({
        disband: async (teamId) => {
            disbanded.push(teamId);
        }
    }));

    root.dispatch("click", target({"[data-team-disband]": {}}));
    await settle();
    assert.match(root.innerHTML, /해체하면 되돌릴 수 없습니다/);

    root.dispatch("click", target({"[data-team-confirm-cancel]": {}}));
    await settle();
    assert.deepEqual(disbanded, []);
    assert.doesNotMatch(root.innerHTML, /해체하면 되돌릴 수 없습니다/);
});

test("위임은 확인 후 요청하고 서버 오류 코드에 맞는 안내를 표시한다", async () => {
    const {root} = await mountMaster(masterApi({
        delegate: async () => {
            throw Object.assign(new Error("보낼 수 없음"), {
                code: "TEAM_MASTER_STATE_CONFLICT"
            });
        }
    }));

    root.dispatch("click", target({
        "[data-team-delegate]": {dataset: {teamDelegate: "10"}}
    }));
    await settle();
    root.dispatch("click", target({"[data-team-confirm-accept]": {}}));
    await settle();

    assert.match(root.innerHTML, /마스터 상태가 방금 바뀌었습니다/);
});

test("상세 조회만 실패하면 팀 목록을 지우지 않고 다시 시도를 제공한다", async () => {
    let detailFails = true;
    const {root} = await mountMaster(masterApi({
        detail: async () => {
            if (detailFails) {
                throw new Error("상세 실패");
            }
            return detail(30, 3, "서버 팀", "MASTER");
        }
    }));

    assert.match(root.innerHTML, /data-team-retry-detail/);
    assert.doesNotMatch(root.innerHTML, /새 팀 만들기/);

    detailFails = false;
    root.dispatch("click", target({"[data-team-retry-detail]": {}}));
    await settle();
    assert.match(root.innerHTML, /팀원/);
});
