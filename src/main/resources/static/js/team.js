const TEAM_ERROR_MESSAGES = Object.freeze({
    TEAM_DELEGATION_REQUIRED: "팀원이 남아 있습니다. 마스터를 위임한 뒤 다시 시도해 주세요.",
    TEAM_COHORT_REQUIRED: "팀을 만들 기수를 선택해 주세요.",
    TEAM_CAPACITY_EXCEEDED: "팀 정원 8명을 모두 채웠습니다.",
    TEAM_ALREADY_IN_TEAM: "이미 다른 팀에 소속된 사용자입니다.",
    TEAM_TARGET_NOT_IN_COHORT: "같은 기수 사용자만 추가할 수 있습니다.",
    TEAM_MASTER_STATE_CONFLICT: "마스터 상태가 방금 바뀌었습니다. 다시 불러온 뒤 시도해 주세요.",
    TEAM_MASTER_REQUIRED: "팀 마스터만 할 수 있는 작업입니다.",
    TEAM_INVALID_MEMBER_QUERY: "검색어는 공백을 제외하고 1~100자여야 합니다."
});

/** 서버 후보 상태를 화면 문구와 선택 가능 여부로 옮긴다. */
const CANDIDATE_STATUS = Object.freeze({
    AVAILABLE: {label: "추가 가능", selectable: true},
    ALREADY_IN_THIS_TEAM: {label: "이미 이 팀", selectable: false},
    IN_ANOTHER_TEAM: {label: "다른 팀 소속", selectable: false}
});

export function isSelectableCandidate(candidate) {
    return CANDIDATE_STATUS[candidate?.status]?.selectable === true;
}

export function isMaster(detail) {
    return detail?.myRole === "MASTER";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function sameId(left, right) {
    return left !== undefined && left !== null && right !== undefined && right !== null
        && String(left) === String(right);
}

export function collectAccessibleCohorts(accessContext) {
    const cohortsById = new Map();
    [accessContext?.managedCohorts, accessContext?.studentCohorts]
        .filter(Array.isArray)
        .flat()
        .forEach((cohort) => {
            if (cohort?.cohortId == null || cohortsById.has(String(cohort.cohortId))) {
                return;
            }
            cohortsById.set(String(cohort.cohortId), cohort);
        });
    return [...cohortsById.values()];
}

export function findTeamForCohort(teams, cohortId) {
    return Array.isArray(teams)
        ? teams.find((team) => sameId(team?.cohortId, cohortId)) || null
        : null;
}

export function teamErrorMessage(error, fallback) {
    return TEAM_ERROR_MESSAGES[error?.code] || error?.message || fallback;
}

export function createTeamApp({api, profile = {}}) {
    const roots = new Set();
    const state = {
        accessCohorts: [],
        teams: [],
        selectedCohortId: null,
        detail: null,
        detailOpen: false,
        detailError: "",
        createOpen: false,
        loading: false,
        pending: false,
        error: "",
        message: "",
        inviteOpen: false,
        candidates: [],
        candidateQuery: "",
        candidateSearchAttempted: false,
        candidateSearchLoading: false,
        candidateValidation: "",
        selectedCandidateId: "",
        confirm: null
    };
    let loadPromise = null;

    function selectedCohort() {
        return state.accessCohorts.find(
            (cohort) => sameId(cohort.cohortId, state.selectedCohortId)
        ) || null;
    }

    function selectedTeam() {
        return findTeamForCohort(state.teams, state.selectedCohortId);
    }

    function chooseCohort(previousCohortId) {
        const preferredCohortId = profile.approvedCohort?.cohortId;
        if (state.accessCohorts.some((cohort) => sameId(cohort.cohortId, previousCohortId))) {
            return previousCohortId;
        }
        if (state.accessCohorts.some((cohort) => sameId(cohort.cohortId, preferredCohortId))) {
            return preferredCohortId;
        }
        return state.accessCohorts.length === 1
            ? state.accessCohorts[0].cohortId
            : null;
    }

    function renderCohortSelector() {
        if (state.accessCohorts.length <= 1) {
            const cohort = selectedCohort();
            return cohort
                ? `<span class="ui-menu-chip" data-team-selected-cohort>${escapeHtml(cohort.name)}</span>`
                : "";
        }

        return `
            <label class="home-team-cohort-picker ui-field">
                <span class="ui-field__label">팀을 확인할 기수</span>
                <select data-team-cohort-select aria-label="팀을 확인할 기수">
                    <option value=""${state.selectedCohortId == null ? " selected" : ""}>기수를 선택하세요</option>
                    ${state.accessCohorts.map((cohort) => `
                        <option value="${escapeHtml(cohort.cohortId)}"${sameId(cohort.cohortId, state.selectedCohortId) ? " selected" : ""}>
                            ${escapeHtml(cohort.name)}
                        </option>`).join("")}
                </select>
            </label>`;
    }

    function renderCreate() {
        const cohort = selectedCohort();
        if (!state.createOpen) {
            return `
                <div class="ui-cohort-party-grid is-single">
                    <button class="ui-cohort-party-create" type="button" data-team-open-create${cohort ? "" : " disabled"}>
                        <span aria-hidden="true">+</span>
                        <strong>새 팀 만들기</strong>
                        <small>${cohort ? `${escapeHtml(cohort.name)}에 참여할 팀이 없습니다.` : "먼저 기수를 선택해 주세요."}</small>
                    </button>
                </div>`;
        }

        return `
            <form class="home-party-create-form" data-team-create-form>
                <div>
                    <span class="ui-menu-eyebrow">MY STUDY TEAM</span>
                    <h3>함께 공부할 팀 만들기</h3>
                    <p>${escapeHtml(cohort?.name)}에서 사용할 팀 이름을 입력해 주세요.</p>
                </div>
                <label class="ui-field">
                    <span class="ui-field__label">팀 이름</span>
                    <input name="teamName" type="text" placeholder="팀 이름을 입력하세요" required />
                </label>
                <div>
                    <button class="ui-button ui-button--secondary" type="button" data-team-cancel-create${state.pending ? " disabled" : ""}>취소</button>
                    <button class="ui-button ui-button--primary" type="submit"${state.pending ? " disabled" : ""}>${state.pending ? "만드는 중" : "팀 만들기"}</button>
                </div>
            </form>`;
    }

    function renderMemberNames(members) {
        if (!Array.isArray(members)) {
            return state.detailError
                ? `<span class="home-team-member-empty">${escapeHtml(state.detailError)}</span>`
                : '<span class="home-team-member-empty">팀원 정보를 불러오는 중입니다.</span>';
        }
        if (members.length === 0) {
            return '<span class="home-team-member-empty">팀원이 없습니다.</span>';
        }
        return members.slice(0, 4)
            .map((member) => `<span>${escapeHtml(member.displayName)}</span>`)
            .join("");
    }

    function renderSummary(team) {
        const detail = state.detail;
        const memberCount = detail?.memberCount ?? 0;
        return `
            <div class="ui-cohort-party-grid is-single">
                <article class="ui-cohort-party-card">
                    <div>
                        <h4>${escapeHtml(team.name)}</h4>
                        <span>${memberCount}명</span>
                    </div>
                    <div class="home-team-member-preview" aria-label="팀원 미리보기">
                        ${renderMemberNames(detail?.members)}
                    </div>
                    <span class="ui-menu-chip">내 팀</span>
                    <button class="ui-button ui-button--secondary" type="button" data-team-open-detail>팀 보기</button>
                </article>
            </div>`;
    }

    function renderMemberActions(member) {
        if (!isMaster(state.detail) || sameId(member.memberId, state.detail.myMemberId)) {
            return "";
        }
        const disabled = state.pending ? " disabled" : "";
        return `
            <span class="home-team-member-actions">
                <button class="ui-button ui-button--secondary" type="button"
                        data-team-delegate="${escapeHtml(member.memberId)}"${disabled}>마스터 위임</button>
                <button class="ui-button ui-button--danger" type="button"
                        data-team-kick="${escapeHtml(member.memberId)}"${disabled}>제외</button>
            </span>`;
    }

    function renderConfirm() {
        if (!state.confirm) {
            return "";
        }
        return `
            <div class="home-team-confirm" role="alertdialog" aria-label="작업 확인">
                <p>${escapeHtml(state.confirm.question)}</p>
                <div>
                    <button class="ui-button ui-button--secondary" type="button" data-team-confirm-cancel${state.pending ? " disabled" : ""}>취소</button>
                    <button class="ui-button ui-button--danger" type="button" data-team-confirm-accept${state.pending ? " disabled" : ""}>
                        ${state.pending ? "처리 중" : state.confirm.acceptLabel}
                    </button>
                </div>
            </div>`;
    }

    function renderCandidate(candidate) {
        const status = CANDIDATE_STATUS[candidate.status];
        const selectable = isSelectableCandidate(candidate);
        const selected = sameId(candidate.userId, state.selectedCandidateId);
        return `
            <button type="button" class="home-team-candidate${selected ? " is-selected" : ""}"
                    data-team-candidate="${escapeHtml(candidate.userId)}"
                    aria-pressed="${selected}"${selectable ? "" : " disabled"}>
                <span>
                    <strong>${escapeHtml(candidate.displayName)}</strong>
                    <small>${escapeHtml(candidate.email)} · ${escapeHtml(status?.label || candidate.status)}</small>
                </span>
            </button>`;
    }

    function renderInvite() {
        if (!state.inviteOpen) {
            return "";
        }
        const selected = state.candidates.find(
            (candidate) => sameId(candidate.userId, state.selectedCandidateId)
                && isSelectableCandidate(candidate)
        );

        return `
            <section class="home-team-invite" aria-label="팀원 추가">
                <form data-team-candidate-form>
                    <label class="ui-field">
                        <span class="ui-field__label">사용자 검색</span>
                        <input name="teamCandidateQuery" type="search" autocomplete="off"
                               placeholder="이름 또는 이메일" value="${escapeHtml(state.candidateQuery)}" />
                    </label>
                    <div class="home-team-invite-actions">
                        <button class="ui-button ui-button--secondary" type="submit"${state.candidateSearchLoading ? " disabled" : ""}>검색</button>
                        <button class="ui-button ui-button--primary" type="button" data-team-add-member${selected && !state.pending ? "" : " disabled"}>
                            ${state.pending ? "추가 중" : "팀원 추가"}
                        </button>
                        <button class="ui-button ui-button--secondary" type="button" data-team-close-invite${state.pending ? " disabled" : ""}>닫기</button>
                    </div>
                </form>
                ${state.candidateValidation ? `<p class="home-team-state is-error" role="alert">${escapeHtml(state.candidateValidation)}</p>` : ""}
                ${state.candidateSearchLoading ? '<p class="home-team-state" role="status">검색 중입니다.</p>' : ""}
                ${state.candidateSearchAttempted && !state.candidateSearchLoading && !state.candidateValidation ? `
                    <div class="home-team-candidates">
                        ${state.candidates.map(renderCandidate).join("")}
                        ${state.candidates.length ? "" : '<p class="home-team-state" role="status">해당 사용자를 찾을 수 없습니다.</p>'}
                    </div>` : ""}
            </section>`;
    }

    function renderDetail(team) {
        const detail = state.detail;
        if (!detail) {
            return `
                <div class="home-team-state is-error" role="alert">
                    <p>${escapeHtml(state.detailError || "팀 상세 정보를 불러오지 못했습니다.")}</p>
                    <button class="ui-button ui-button--secondary" type="button" data-team-retry-detail>다시 시도</button>
                </div>`;
        }

        const master = isMaster(detail);
        return `
            <div class="ui-party-page">
                <header class="home-party-detail-head">
                    <button type="button" data-team-close-detail>기수 · 팀</button>
                    <span aria-hidden="true">›</span>
                    <div><small>내 팀</small><strong>${escapeHtml(team.name)}</strong></div>
                    <span class="ui-menu-chip">${detail.memberCount}명</span>
                    ${master ? '<span class="ui-menu-chip">마스터</span>' : ""}
                </header>
                <section class="ui-party-members" aria-labelledby="home-team-members-title">
                    <header class="home-team-members-head">
                        <h3 id="home-team-members-title">팀원</h3>
                        ${master ? `
                            <button class="ui-button ui-button--primary" type="button" data-team-open-invite${state.pending ? " disabled" : ""}>
                                팀원 추가
                            </button>` : ""}
                    </header>
                    ${renderInvite()}
                    <ul>
                        ${detail.members.map((member) => `
                            <li>
                                <strong>${escapeHtml(member.displayName)}</strong>
                                ${sameId(member.memberId, detail.myMemberId) ? "<span>나</span>" : ""}
                                ${member.role === "MASTER" ? "<em>마스터</em>" : ""}
                                ${renderMemberActions(member)}
                            </li>`).join("")}
                    </ul>
                </section>
                ${renderConfirm()}
                <footer class="ui-party-danger-zone">
                    <p>팀에서 나가도 기수에는 계속 참여합니다.</p>
                    <button class="ui-button ui-button--danger ui-party-danger-action" type="button" data-team-leave${state.pending ? " disabled" : ""}>
                        ${state.pending ? "처리 중" : "팀 나가기"}
                    </button>
                    ${master ? `
                        <button class="ui-button ui-button--danger ui-party-danger-action" type="button" data-team-disband${state.pending ? " disabled" : ""}>
                            팀 해체
                        </button>` : ""}
                </footer>
            </div>`;
    }

    function renderContent() {
        if (state.loading) {
            return '<p class="home-team-state" role="status">팀 정보를 불러오고 있습니다.</p>';
        }
        if (state.error) {
            return `
                <div class="home-team-state is-error" role="alert">
                    <p>${escapeHtml(state.error)}</p>
                    <button class="ui-button ui-button--secondary" type="button" data-team-retry>다시 시도</button>
                </div>`;
        }
        if (state.accessCohorts.length === 0) {
            return `
                <div class="ui-cohort-party-locked">
                    <strong>팀을 만들 수 있는 활성 기수가 없습니다.</strong>
                    <p>기수 참여가 승인되면 팀을 만들거나 참여 중인 팀을 확인할 수 있습니다.</p>
                </div>`;
        }

        const team = selectedTeam();
        return `
            <div class="home-team-toolbar">${renderCohortSelector()}</div>
            ${state.selectedCohortId == null
                ? '<p class="home-team-state" role="status">팀을 확인할 기수를 선택해 주세요.</p>'
                : team
                    ? state.detailOpen ? renderDetail(team) : renderSummary(team)
                    : renderCreate()}
            ${state.message ? `<p class="home-party-message" role="status">${escapeHtml(state.message)}</p>` : ""}
        `;
    }

    function renderAll() {
        roots.forEach((root) => {
            if (!root.isConnected) {
                roots.delete(root);
                return;
            }
            root.innerHTML = renderContent();
        });
    }

    /**
     * 상세 실패를 목록 실패와 분리한다. 목록은 살아 있는데 상세만 못 받은 상황에서
     * 전체를 오류 화면으로 바꾸면 사용자에게는 팀이 사라진 것처럼 보인다.
     */
    async function fetchSelectedDetail() {
        const team = selectedTeam();
        state.detailError = "";
        if (!team) {
            state.detail = null;
            return;
        }
        try {
            state.detail = await api.teams.detail(team.teamId);
        } catch (error) {
            state.detail = null;
            state.detailError = teamErrorMessage(error, "팀 상세 정보를 불러오지 못했습니다.");
        }
    }

    function resetInvite() {
        state.inviteOpen = false;
        state.candidates = [];
        state.candidateQuery = "";
        state.candidateSearchAttempted = false;
        state.candidateSearchLoading = false;
        state.candidateValidation = "";
        state.selectedCandidateId = "";
    }

    async function refresh(message = "") {
        if (loadPromise) {
            // 진행 중인 호출에 편승하되 안내 문구는 잃지 않는다.
            await loadPromise;
            if (message) {
                state.message = message;
                renderAll();
            }
            return;
        }

        state.loading = true;
        state.error = "";
        state.message = "";
        renderAll();
        const previousCohortId = state.selectedCohortId;
        loadPromise = (async () => {
            try {
                const [teams, accessContext] = await Promise.all([
                    api.teams.mine(),
                    api.access.getContext()
                ]);
                state.teams = Array.isArray(teams) ? teams : [];
                state.accessCohorts = collectAccessibleCohorts(accessContext);
                state.selectedCohortId = chooseCohort(previousCohortId);
                await fetchSelectedDetail();
                state.message = message;
            } catch (error) {
                state.teams = [];
                state.detail = null;
                state.detailError = "";
                state.error = teamErrorMessage(error, "팀 정보를 불러오지 못했습니다.");
            } finally {
                state.loading = false;
                loadPromise = null;
                renderAll();
            }
        })();
        return loadPromise;
    }

    async function selectCohort(cohortId) {
        state.selectedCohortId = cohortId || null;
        state.detail = null;
        state.detailOpen = false;
        state.createOpen = false;
        state.confirm = null;
        resetInvite();
        state.error = "";
        state.message = "";
        state.loading = Boolean(selectedTeam());
        renderAll();
        if (!selectedTeam()) {
            return;
        }
        await fetchSelectedDetail();
        state.loading = false;
        renderAll();
    }

    async function createTeam(form) {
        const cohort = selectedCohort();
        const name = String(form.elements?.namedItem("teamName")?.value || "").trim();
        if (!cohort) {
            state.message = "팀을 만들 기수를 선택해 주세요.";
            renderAll();
            return;
        }
        if (!name || state.pending) {
            return;
        }

        state.pending = true;
        state.message = "";
        renderAll();
        try {
            await api.teams.create({cohortId: cohort.cohortId, name});
            state.createOpen = false;
            state.detailOpen = false;
            await refresh(`${name} 팀을 만들었습니다.`);
        } catch (error) {
            state.message = teamErrorMessage(error, "팀을 만들지 못했습니다.");
        } finally {
            state.pending = false;
            renderAll();
        }
    }

    /**
     * 명령 실행 → 실패 시 서버 코드 안내 → 성공 시 목록·상세 재조회.
     * 로컬 팀원 배열을 직접 고치지 않는 것이 이 흐름의 핵심이다.
     */
    async function runCommand({perform, success, failure, onSuccess}) {
        if (state.pending) {
            return;
        }
        state.pending = true;
        state.message = "";
        renderAll();
        try {
            await perform();
            state.confirm = null;
            if (onSuccess) {
                onSuccess();
            }
            await refresh(success);
        } catch (error) {
            state.message = teamErrorMessage(error, failure);
        } finally {
            state.pending = false;
            renderAll();
        }
    }

    async function leaveTeam() {
        const team = selectedTeam();
        if (!team) {
            return;
        }
        await runCommand({
            perform: () => api.teams.leave(team.teamId),
            success: `${team.name} 팀에서 나갔습니다.`,
            failure: "팀에서 나가지 못했습니다.",
            onSuccess: () => {
                state.detailOpen = false;
            }
        });
    }

    async function searchCandidates(form) {
        const team = selectedTeam();
        const keyword = String(
            form.elements?.namedItem("teamCandidateQuery")?.value || ""
        ).trim();

        state.selectedCandidateId = "";
        state.candidateQuery = keyword;
        state.candidates = [];
        state.candidateSearchAttempted = Boolean(keyword);
        state.candidateValidation = keyword ? "" : "검색할 이름 또는 이메일을 입력해 주세요.";
        if (!keyword || !team) {
            renderAll();
            return;
        }

        state.candidateSearchLoading = true;
        renderAll();
        try {
            const candidates = await api.teams.memberCandidates(team.teamId, keyword);
            state.candidates = Array.isArray(candidates) ? candidates : [];
        } catch (error) {
            state.candidateValidation = teamErrorMessage(error, "사용자를 검색하지 못했습니다.");
        } finally {
            state.candidateSearchLoading = false;
            renderAll();
        }
    }

    async function addMember() {
        const team = selectedTeam();
        const candidate = state.candidates.find(
            (item) => sameId(item.userId, state.selectedCandidateId)
                && isSelectableCandidate(item)
        );
        if (!team || !candidate) {
            return;
        }
        await runCommand({
            perform: () => api.teams.addMember(team.teamId, candidate.userId),
            success: `${candidate.displayName} 님을 팀원으로 추가했습니다.`,
            failure: "팀원을 추가하지 못했습니다.",
            onSuccess: resetInvite
        });
    }

    async function acceptConfirm() {
        const team = selectedTeam();
        const pendingConfirm = state.confirm;
        if (!team || !pendingConfirm) {
            return;
        }

        if (pendingConfirm.action === "kick") {
            await runCommand({
                perform: () => api.teams.kickMember(team.teamId, pendingConfirm.memberId),
                success: `${pendingConfirm.displayName} 님을 팀에서 제외했습니다.`,
                failure: "팀원을 제외하지 못했습니다."
            });
            return;
        }
        if (pendingConfirm.action === "delegate") {
            await runCommand({
                perform: () => api.teams.delegate(team.teamId, pendingConfirm.memberId),
                success: `${pendingConfirm.displayName} 님에게 마스터를 위임했습니다.`,
                failure: "마스터를 위임하지 못했습니다."
            });
            return;
        }
        await runCommand({
            perform: () => api.teams.disband(team.teamId),
            success: `${team.name} 팀을 해체했습니다.`,
            failure: "팀을 해체하지 못했습니다.",
            onSuccess: () => {
                state.detailOpen = false;
                resetInvite();
            }
        });
    }

    function requestConfirm(action, memberId) {
        const member = state.detail?.members.find(
            (item) => sameId(item.memberId, memberId)
        );
        if (action === "disband") {
            state.confirm = {
                action,
                question: "팀을 해체하면 되돌릴 수 없습니다. 해체할까요?",
                acceptLabel: "해체"
            };
        } else if (member) {
            state.confirm = action === "kick"
                ? {
                    action,
                    memberId: member.memberId,
                    displayName: member.displayName,
                    question: `${member.displayName} 님을 팀에서 제외할까요?`,
                    acceptLabel: "제외"
                }
                : {
                    action,
                    memberId: member.memberId,
                    displayName: member.displayName,
                    question: `${member.displayName} 님에게 마스터를 위임하면 내 권한이 사라집니다. 위임할까요?`,
                    acceptLabel: "위임"
                };
        }
        state.message = "";
        renderAll();
    }

    async function handleClick(event) {
        if (event.target.closest("[data-team-open-create]")) {
            state.createOpen = true;
            state.message = "";
            renderAll();
        } else if (event.target.closest("[data-team-cancel-create]")) {
            state.createOpen = false;
            state.message = "";
            renderAll();
        } else if (event.target.closest("[data-team-open-detail]")) {
            state.detailOpen = true;
            state.message = "";
            renderAll();
        } else if (event.target.closest("[data-team-close-detail]")) {
            state.detailOpen = false;
            state.message = "";
            renderAll();
        } else if (event.target.closest("[data-team-leave]")) {
            await leaveTeam();
        } else if (event.target.closest("[data-team-retry]")) {
            await refresh();
        } else if (event.target.closest("[data-team-retry-detail]")) {
            state.loading = true;
            renderAll();
            await fetchSelectedDetail();
            state.loading = false;
            renderAll();
        } else if (event.target.closest("[data-team-open-invite]")) {
            resetInvite();
            state.inviteOpen = true;
            state.message = "";
            renderAll();
        } else if (event.target.closest("[data-team-close-invite]")) {
            resetInvite();
            renderAll();
        } else if (event.target.closest("[data-team-candidate]")) {
            state.selectedCandidateId = event.target
                .closest("[data-team-candidate]").dataset.teamCandidate;
            renderAll();
        } else if (event.target.closest("[data-team-add-member]")) {
            await addMember();
        } else if (event.target.closest("[data-team-kick]")) {
            requestConfirm("kick", event.target.closest("[data-team-kick]").dataset.teamKick);
        } else if (event.target.closest("[data-team-delegate]")) {
            requestConfirm(
                "delegate",
                event.target.closest("[data-team-delegate]").dataset.teamDelegate
            );
        } else if (event.target.closest("[data-team-disband]")) {
            requestConfirm("disband");
        } else if (event.target.closest("[data-team-confirm-cancel]")) {
            state.confirm = null;
            renderAll();
        } else if (event.target.closest("[data-team-confirm-accept]")) {
            await acceptConfirm();
        }
    }

    async function handleSubmit(event) {
        const createForm = event.target.closest("[data-team-create-form]");
        if (createForm) {
            event.preventDefault();
            await createTeam(createForm);
            return;
        }
        const candidateForm = event.target.closest("[data-team-candidate-form]");
        if (candidateForm) {
            event.preventDefault();
            await searchCandidates(candidateForm);
        }
    }

    async function handleChange(event) {
        const select = event.target.closest("[data-team-cohort-select]");
        if (select) {
            await selectCohort(select.value);
        }
    }

    function mount(root) {
        if (!root) {
            return;
        }
        roots.add(root);
        if (!root.dataset.teamMounted) {
            root.addEventListener("click", (event) => void handleClick(event));
            root.addEventListener("submit", (event) => void handleSubmit(event));
            root.addEventListener("change", (event) => void handleChange(event));
            root.dataset.teamMounted = "true";
        }
        renderAll();
        void refresh();
    }

    return {mount, refresh};
}

if (globalThis.window) {
    globalThis.window.OmagotchiTeam = createTeamApp({
        api: globalThis.window.OmagotchiApi,
        profile: globalThis.window.OmagotchiProfile || {}
    });
}
