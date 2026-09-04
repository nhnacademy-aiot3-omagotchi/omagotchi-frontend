/**
 * 홈 `기수 · 팀` 오버레이 안쪽 팀 패널.
 *
 * team.js 는 React 컴포넌트가 아니라 HTML 문자열을 만들어 `[data-home-party-app]` 에
 * 직접 쓴다. 그래서 스토리도 실제와 같은 방식으로 붙인다 — 감싸는 마크업을 home.js 의
 * 기수 오버레이와 똑같이 두어야 CSS 캐스케이드가 운영 화면과 일치한다.
 *
 * 팀원 추가·확인 단계처럼 상호작용으로만 나오는 상태는 play 로 실제 핸들러를 태운다.
 * 후보 상태 3종이나 정원 초과 같은 조합은 실제 앱에서 계정·팀을 미리 만들어야 보이지만
 * 여기서는 fake api 로 바로 만든다.
 */
import { useEffect, useRef } from "react";
import { within, userEvent } from "storybook/test";
import { HomeOverlay } from "../home-react/components/HomeOverlay.jsx";
import { createTeamApp } from "../../resources/static/js/team.js";

const COHORT = { cohortId: 3, name: "NHN 아카데미 11기", status: "ACTIVE" };
const TEAM = { teamId: 30, cohortId: 3, name: "백엔드 스터디" };

/**
 * 팀에는 MASTER 가 정확히 한 명이다 (`uq_team_members_one_master`).
 * 요청자는 항상 두 번째 팀원(memberId 11)이며, 요청자가 마스터면 나머지는 전부 MEMBER,
 * 요청자가 팀원이면 첫 번째가 마스터다. 둘 다 마스터인 상태는 서버가 만들 수 없다.
 */
function members(count, myRole) {
    const names = ["윤서현", "이나", "박지훈", "최유진", "정민서", "한서준", "오하윤", "임도현"];
    const masterIndex = myRole === "MASTER" ? 1 : 0;
    return names.slice(0, count).map((displayName, index) => ({
        memberId: 10 + index,
        displayName,
        role: index === masterIndex ? "MASTER" : "MEMBER",
        joinedAt: "2026-09-01T00:00:00Z"
    }));
}

function detailOf({ memberCount = 2, myRole = "MEMBER" } = {}) {
    return {
        ...TEAM,
        createdAt: "2026-09-01T00:00:00Z",
        memberCount,
        myMemberId: 11,
        myRole,
        members: members(memberCount, myRole)
    };
}

const CANDIDATES = [
    { userId: "u-1", displayName: "박가능", email: "available@omagotchi.site", status: "AVAILABLE" },
    { userId: "u-2", displayName: "이소속", email: "inthisteam@omagotchi.site", status: "ALREADY_IN_THIS_TEAM" },
    { userId: "u-3", displayName: "최다른팀", email: "another@omagotchi.site", status: "IN_ANOTHER_TEAM" }
];

function fakeApi({ teams = [TEAM], detail = detailOf(), cohorts = [COHORT], candidates = CANDIDATES }) {
    return {
        teams: {
            mine: async () => teams,
            detail: async () => detail,
            memberCandidates: async () => candidates,
            create: async () => TEAM,
            addMember: async () => null,
            kickMember: async () => null,
            leave: async () => null,
            delegate: async () => null,
            disband: async () => null
        },
        access: {
            getContext: async () => ({ managedCohorts: [], studentCohorts: cohorts })
        }
    };
}

const OVERLAY_META = {
    icon: "/images/app/cohort.png",
    title: "기수 · 팀",
    description: "기수 안에서 팀을 만들고 함께 성장하세요."
};

/**
 * home.js 의 기수 오버레이 본문. `[data-home-party-app]` 만 team.js 가 채운다.
 * 감싸는 구조를 손으로 흉내내지 않고 실제 HomeOverlay 를 쓰는 것이 중요하다 —
 * 팀 CSS 가 전부 `.home-overlay--cohort` 하위 선택자라, 그 클래스가 빠지면
 * 스토리에서만 색과 간격이 달라진다.
 */
const COHORT_CONTENT = `
    <section class="ui-cohort-shell" data-cohort-state="approved">
        <span class="ui-menu-eyebrow">나의 기수</span>
        <header class="ui-cohort-summary">
            <div class="ui-cohort-summary__copy">
                <h3>NHN 아카데미 11기</h3>
                <p>2026-03-02 — 2026-12-18</p>
                <span class="ui-menu-chip">운영 중</span>
            </div>
        </header>
        <section class="ui-cohort-party-zone" aria-labelledby="home-cohort-party-title">
            <header>
                <div>
                    <h3 id="home-cohort-party-title">11기 내 팀</h3>
                    <p>같은 기수 멤버와 팀을 만들고 함께 공부할 수 있어요.</p>
                </div>
            </header>
            <div data-home-party-app></div>
        </section>
    </section>`;

function TeamPanel({ teams, detail, cohorts, candidates }) {
    const hostRef = useRef(null);

    useEffect(() => {
        const root = hostRef.current?.querySelector("[data-home-party-app]");
        if (!root) {
            return;
        }
        const app = createTeamApp({
            api: fakeApi({ teams, detail, cohorts, candidates }),
            profile: { approvedCohort: { cohortId: COHORT.cohortId } }
        });
        app.mount(root);
        return () => app.unmount(root);
    }, [teams, detail, cohorts, candidates]);

    return (
        <div ref={hostRef} className="home-overlay-root is-open">
            <HomeOverlay
                type="cohort"
                meta={OVERLAY_META}
                content={COHORT_CONTENT}
                onClose={() => {}}
            />
        </div>
    );
}

const meta = {
    title: "Patterns/TeamPanel",
    component: TeamPanel,
    parameters: { layout: "fullscreen" }
};

export default meta;

export const NoTeam = {
    name: "팀 없음 · 생성 진입",
    args: { teams: [], detail: null }
};

export const CreateForm = {
    name: "팀 만들기 폼",
    args: { teams: [], detail: null },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: /새 팀 만들기/ }));
    }
};

export const CohortPicker = {
    name: "활성 기수 여러 개 · 기수 선택",
    args: {
        teams: [],
        detail: null,
        cohorts: [COHORT, { cohortId: 4, name: "NHN 아카데미 12기", status: "ACTIVE" }]
    }
};

export const Summary = {
    name: "팀 요약 카드",
    args: {}
};

export const MemberDetail = {
    name: "팀원 상세 (관리 조작 없음)",
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
    }
};

export const MasterDetail = {
    name: "마스터 상세 (제외·위임·해체)",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
    }
};

export const InviteEmpty = {
    name: "팀원 추가 · 검색 전",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
        await userEvent.click(await canvas.findByRole("button", { name: "팀원 추가" }));
    }
};

export const InviteCandidates = {
    name: "팀원 추가 · 후보 상태 3종",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
        await userEvent.click(await canvas.findByRole("button", { name: "팀원 추가" }));
        await userEvent.type(await canvas.findByRole("searchbox"), "김");
        await userEvent.click(await canvas.findByRole("button", { name: "검색" }));
    }
};

export const InviteEmptyResult = {
    name: "팀원 추가 · 결과 없음",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }), candidates: [] },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
        await userEvent.click(await canvas.findByRole("button", { name: "팀원 추가" }));
        await userEvent.type(await canvas.findByRole("searchbox"), "없는이름");
        await userEvent.click(await canvas.findByRole("button", { name: "검색" }));
    }
};

export const KickConfirm = {
    name: "확인 단계 · 팀원 제외",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
        await userEvent.click((await canvas.findAllByRole("button", { name: "제외" }))[0]);
    }
};

export const DisbandConfirm = {
    name: "확인 단계 · 팀 해체",
    args: { detail: detailOf({ memberCount: 4, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
        await userEvent.click(await canvas.findByRole("button", { name: "팀 해체" }));
    }
};

export const FullTeam = {
    name: "정원 8명 · 마스터",
    args: { detail: detailOf({ memberCount: 8, myRole: "MASTER" }) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole("button", { name: "팀 보기" }));
    }
};
