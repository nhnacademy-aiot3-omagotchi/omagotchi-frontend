import {validateAttendancePolicyDraft} from "./data/systemAdminApiRepository.js";

const STATUS_LABELS = {PREPARING: "준비 중", ACTIVE: "운영 중", CLOSED: "종료"};
const STATUS_CLASSES = {PREPARING: "preparing", ACTIVE: "active", CLOSED: "closed"};
const ACCOUNT_STATUS_LABELS = {ACTIVE: "활성", DISABLED: "비활성화", WITHDRAWN: "탈퇴"};
const ACCOUNT_STATUS_CLASSES = {ACTIVE: "active", DISABLED: "disabled", WITHDRAWN: "withdrawn"};
// Identity가 관리자 지정으로 받는 값. WITHDRAWN은 본인 탈퇴로만 도달한다.
const ACCOUNT_STATUS_SELECTABLE = new Set(["ACTIVE", "DISABLED"]);
// Identity의 Account.isGlobalRoleChangeAllowed와 같은 조건. DISABLED·WITHDRAWN은 거부된다.
const ROLE_CHANGEABLE_STATUSES = new Set(["ACTIVE"]);
// Identity·Learning이 돌려주는 오류 코드를 화면 문구로 옮긴다.
// 목록에 없는 코드는 원문을 노출하지 않고 일반 문구로 떨어뜨린다.
const PERMISSION_ERROR_MESSAGES = {
    ACCOUNT_LAST_SYSTEM_ADMIN: "마지막 시스템 관리자는 비활성화하거나 권한을 회수할 수 없습니다.",
    ACCOUNT_SELF_DISABLE_NOT_ALLOWED: "자신의 계정은 비활성화할 수 없습니다.",
    ACCOUNT_SELF_ROLE_CHANGE_NOT_ALLOWED: "자신의 전역 권한은 변경할 수 없습니다.",
    ACCOUNT_ROLE_CHANGE_NOT_ALLOWED: "현재 계정 상태에서는 전역 권한을 변경할 수 없습니다.",
    ACCOUNT_STATUS_TRANSITION_NOT_ALLOWED: "허용되지 않은 계정 상태 변경입니다.",
    ACCOUNT_ADMIN_OPERATION_NOT_ALLOWED: "현재 계정은 시스템 관리자 작업을 수행할 수 없습니다.",
    ACCOUNT_NOT_FOUND: "대상 계정을 찾을 수 없습니다. 목록을 새로고침해 주세요."
};
const USER_PAGE_SIZE = 20;
const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

// 아래 innerHTML 템플릿의 외부 문자열 인코딩 전용
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
}

function formatDate(value) {
    return String(value || "-").replaceAll("-", ".");
}

export function formatTimestampDate(value) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) return "-";

    const parts = Object.fromEntries(
        SEOUL_DATE_FORMATTER.formatToParts(timestamp)
            .map(({type, value: part}) => [type, part])
    );
    return `${parts.year}.${parts.month}.${parts.day}`;
}

function periodsOverlap(first, second) {
    return first.startDate < second.endDate && second.startDate < first.endDate;
}

export function mergeManagerCohortSelection(previousIds, editableIds, selectedIds) {
    const editable = new Set((editableIds || []).map(String));
    const preserved = (previousIds || []).map(String).filter((id) => !editable.has(id));
    return [...new Set([...preserved, ...(selectedIds || []).map(String)])];
}

export async function initializeSystemAdminDashboard(root = document, repository) {
    if (!repository) throw new Error("System Admin 저장소 구현체가 필요합니다.");
    let state = await repository.loadDashboard();
    let selectedUserId = null;
    let policyCohortId = null;
    let currentUserPage = 1;
    let auditPageLoading = false;
    const find = (selector) => root.querySelector(selector);
    const findAll = (selector) => [...root.querySelectorAll(selector)];
    const capabilities = () => ({
        identity: false,
        managerWrite: false,
        // 계정 상태와 전역 역할은 Identity API가 각각 따로 있다.
        // 저장소가 실제 클라이언트 유무를 보고 켜 주므로 기본값은 닫아 둔다.
        accountStatusWrite: false,
        loginLockWrite: false,
        identityWrite: false,
        audit: false,
        cohortDelete: true,
        cohortSummary: true,
        ...state.capabilities
    });

    // 다이얼로그를 열 이유가 하나라도 있는지. 예전엔 기수 권한만 보고 판단해서
    // Identity만 열려 있는 상황에서 버튼이 잠기는 구멍이 있었다.
    /**
     * 감사 패널이 목록 대신 보여 줄 문구.
     *
     * "연동 대기", "불러오기 실패", "기록 없음"은 서로 다른 상황이다. 셋을 한 문구로
     * 뭉개면 감사 로그가 비어 보일 때 그게 정상인지 장애인지 알 수 없다.
     */
    function auditPlaceholder() {
        if (state.auditError) {
            return `감사 로그를 불러오지 못했습니다. ${state.auditError}`;
        }
        if (!capabilities().audit) {
            return "감사 로그 API 연동 후 서버 기록을 표시합니다.";
        }
        return "아직 기록된 권한 변경이 없습니다.";
    }

    function canWritePermissions() {
        const capability = capabilities();
        return capability.managerWrite
            || capability.identityWrite
            || capability.accountStatusWrite
            || capability.loginLockWrite;
    }

    function showToast(message, isError = false) {
        const toast = find("[data-system-toast]");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.toggle("is-error", isError);
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
    }

    function openPanel(panelId) {
        findAll(".system-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === panelId));
        findAll("[data-panel-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.panelTarget === panelId));
    }

    function cohortName(cohortId) {
        return state.cohorts.find((cohort) => cohort.id === cohortId)?.name || cohortId;
    }

    function userName(userId) {
        return state.users.find((user) => user.id === userId)?.name || "미확인 사용자";
    }

    function renderSummary() {
        const identityConnected = capabilities().identity;
        const privileged = state.users.filter((user) => user.globalRole === "SYSTEM_ADMIN" || user.managerCohortIds.length);
        find("[data-summary-users]").textContent = identityConnected ? state.users.length : "연동 대기";
        find("[data-summary-admins]").textContent = identityConnected ? state.users.filter((user) => user.globalRole === "SYSTEM_ADMIN").length : "연동 대기";
        find("[data-summary-managers]").textContent = identityConnected ? state.users.filter((user) => user.managerCohortIds.length).length : "연동 대기";
        find("[data-summary-cohorts]").textContent = state.cohorts.filter((cohort) => cohort.status === "ACTIVE").length;
        find("[data-summary-cohort-detail]").textContent = `전체 ${state.cohorts.length}개 기수`;
        // 외부 응답 문자열이 포함된 요약 HTML의 escapeHtml 인코딩
        find("[data-privileged-user-list]").innerHTML = identityConnected ? privileged.slice(0, 5).map((user) => `
            <li><b>${escapeHtml(user.name.slice(0, 1))}</b><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div>
            <span class="system-chip ${user.globalRole === "SYSTEM_ADMIN" ? "is-system" : ""}">${user.globalRole === "SYSTEM_ADMIN" ? "SYSTEM_ADMIN" : `${user.managerCohortIds.length}개 기수 관리`}</span></li>
        `).join("") : '<li class="system-integration-message">Identity 관리자 API 연동 후 표시됩니다.</li>';
        find("[data-recent-audit-list]").innerHTML = state.audits.length ? state.audits.slice(0, 4).map((audit) => `
            <li><time>${escapeHtml(audit.time)}</time><div><strong>${escapeHtml(audit.action)}</strong><p>${escapeHtml(audit.detail)}</p><small>실행자 · ${escapeHtml(audit.actor)}</small></div></li>
        `).join("") : `<li class="system-integration-message">${escapeHtml(auditPlaceholder())}</li>`;
    }

    function userRole(user) {
        if (user.globalRole === "SYSTEM_ADMIN") return "system";
        return user.managerCohortIds.length ? "manager" : "user";
    }

    function renderUsers() {
        const identityConnected = capabilities().identity;
        const query = find("[data-user-search]")?.value.trim().toLowerCase() || "";
        const filter = find("[data-role-filter]")?.value || "all";
        const accountStatus = find("[data-account-status-filter]")?.value || "all";
        const loginLock = find("[data-login-lock-filter]")?.value || "all";
        const users = state.users.filter((user) => {
            const matchesQuery = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
            return matchesQuery && (filter === "all" || userRole(user) === filter)
                && (accountStatus === "all" || user.status === accountStatus)
                && (loginLock === "all" || String(user.locked) === loginLock);
        });
        const totalPages = Math.max(1, Math.ceil(users.length / USER_PAGE_SIZE));
        currentUserPage = Math.min(currentUserPage, totalPages);
        const pageStart = (currentUserPage - 1) * USER_PAGE_SIZE;
        const pageUsers = users.slice(pageStart, pageStart + USER_PAGE_SIZE);
        find("[data-user-result-count]").textContent = `${users.length}명`;
        find("[data-user-empty]").textContent = identityConnected
            ? "조건에 맞는 사용자가 없습니다."
            : "Identity 관리자 API 연동 후 사용자 목록과 권한 관리 기능이 활성화됩니다.";
        find("[data-user-empty]").hidden = users.length > 0;
        // 외부 응답 문자열 인코딩과 상태 CSS 클래스 허용 목록 적용
        find("[data-user-table-body]").innerHTML = pageUsers.map((user) => {
            const cohortBadges = user.managerCohortIds.length
                ? user.managerCohortIds.map((id) => `<span class="system-chip">${escapeHtml(cohortName(id))}</span>`).join("")
                : '<span class="system-muted">배정 없음</span>';
            const globalRole = user.globalRole === "SYSTEM_ADMIN"
                ? '<span class="system-chip is-system">SYSTEM_ADMIN</span>'
                : '<span class="system-muted">일반 사용자</span>';
            // 다이얼로그가 계정 상태·로그인 잠금·전역 권한·기수 권한을 모두 다룬다.
            // 그래서 하나라도 쓸 수 있으면 연다.
            const permissionWrite = canWritePermissions();
            const loginLockBadge = user.locked
                ? '<span class="system-account-status is-locked">로그인 잠금</span>'
                : '';
            const recoveryDeadline = user.recoveryDeadline
                ? `<small class="system-muted">복구 마감 · ${escapeHtml(formatTimestampDate(user.recoveryDeadline))}</small>`
                : '';
            const accountStatusClass = ACCOUNT_STATUS_CLASSES[user.status];
            return `<tr><th scope="row" data-label="사용자"><div class="system-user-cell"><b>${escapeHtml(user.name.slice(0, 1))}</b><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></span></div></th><td data-label="계정 상태"><div class="system-account-state"><div><span class="system-account-status is-${accountStatusClass}">${escapeHtml(ACCOUNT_STATUS_LABELS[user.status])}</span>${loginLockBadge}</div><small class="system-muted">상태 변경 · ${escapeHtml(formatTimestampDate(user.statusChangedAt))}</small>${recoveryDeadline}</div></td><td data-label="전역 권한">${globalRole}</td><td data-label="기수 운영 권한"><div class="system-chip-list">${cohortBadges}</div></td><td data-label="가입일">${escapeHtml(user.joinedAt)}</td><td><button class="system-row-button" type="button" data-open-permission="${escapeHtml(user.id)}" ${permissionWrite ? "" : "disabled"} title="${permissionWrite ? "계정 상태·전역 권한·기수 운영 권한 관리" : "권한 변경 API 연동 대기"}">${permissionWrite ? "권한 관리" : "조회 전용"}</button></td></tr>`;
        }).join("");
        find("[data-user-page-range]").textContent = `${users.length}명`;
        find("[data-user-pagination-footer]").hidden = users.length === 0;
        [find("[data-user-search]"), find("[data-role-filter]"), find("[data-account-status-filter]"), find("[data-login-lock-filter]")]
            .filter(Boolean)
            .forEach((control) => { control.disabled = !identityConnected; });
        find("[data-user-pagination]").innerHTML = [
            `<button type="button" data-user-page="${currentUserPage - 1}" ${currentUserPage === 1 ? "disabled" : ""}>이전</button>`,
            ...Array.from({length: totalPages}, (_, index) => index + 1).map((page) => `<button type="button" data-user-page="${page}" class="${page === currentUserPage ? "is-active" : ""}" ${page === currentUserPage ? 'aria-current="page"' : ""}>${page}</button>`),
            `<button type="button" data-user-page="${currentUserPage + 1}" ${currentUserPage === totalPages ? "disabled" : ""}>다음</button>`
        ].join("");
    }

    function renderCohorts() {
        const query = find("[data-cohort-search]")?.value.trim().toLowerCase() || "";
        const cohorts = state.cohorts.filter((cohort) => {
            const managers = (cohort.managerUserIds || []).map(userName).join(" ");
            const searchTarget = `${cohort.name} ${cohort.description} ${managers}`.toLowerCase();
            return !query || searchTarget.includes(query);
        });
        find("[data-cohort-result-count]").textContent = `${cohorts.length}개`;
        find("[data-cohort-empty]").hidden = cohorts.length > 0;
        // 외부 응답 문자열 인코딩과 기수 상태 CSS 클래스 허용 목록 적용
        find("[data-cohort-grid]").innerHTML = cohorts.map((cohort) => {
            const managers = (cohort.managerUserIds || []).map(userName);
            const managerAssignmentKnown = cohort.managerAssignmentKnown !== false;
            const statusAction = cohort.status === "PREPARING"
                ? `<button type="button" data-change-cohort-status="${escapeHtml(cohort.id)}" data-next-status="ACTIVE" ${managerAssignmentKnown && !managers.length ? "disabled" : ""}>${managerAssignmentKnown && !managers.length ? "관리자 배치 필요" : "운영 시작"}</button>`
                : cohort.status === "ACTIVE"
                    ? `<button type="button" data-change-cohort-status="${escapeHtml(cohort.id)}" data-next-status="CLOSED">운영 종료</button>`
                    : "";
            const memberCount = cohort.memberCount == null ? "연동 대기" : `${cohort.memberCount}명`;
            const managerCount = managerAssignmentKnown ? `${managers.length}명` : "연동 대기";
            const managerNames = managerAssignmentKnown ? (managers.join(" · ") || "미배정") : "상세 API 연동 대기";
            const canDelete = capabilities().cohortDelete && cohort.status === "PREPARING";
            const statusClass = STATUS_CLASSES[cohort.status] || "unknown";
            const statusLabel = STATUS_LABELS[cohort.status] || cohort.status;
            return `<article class="system-cohort-card"><header><span class="system-status is-${statusClass}">${escapeHtml(statusLabel)}</span><span>${escapeHtml(cohort.status)}</span></header><h2>${escapeHtml(cohort.name)}</h2><p>${escapeHtml(cohort.description)}</p><strong class="system-cohort-period">${escapeHtml(formatDate(cohort.startDate))} – ${escapeHtml(formatDate(cohort.endDate))}</strong><dl><div><dt>구성원</dt><dd>${escapeHtml(memberCount)}</dd></div><div><dt>기수 관리자</dt><dd>${escapeHtml(managerCount)}</dd></div></dl><footer><div><span>담당</span><strong>${escapeHtml(managerNames)}</strong></div><div class="system-cohort-actions"><button type="button" data-open-attendance-policy="${escapeHtml(cohort.id)}">출결 정책</button>${statusAction}<button class="is-danger" type="button" data-delete-cohort="${escapeHtml(cohort.id)}" ${canDelete ? "" : "disabled"}>삭제</button></div></footer></article>`;
        }).join("");
    }

    function renderAudits() {
        // 감사 응답 문자열이 포함된 HTML의 escapeHtml 인코딩
        find("[data-system-audit-list]").innerHTML = state.audits.length
            ? state.audits.map((audit) => `<li><time>${escapeHtml(audit.time)}</time><i aria-hidden="true"></i><div><span>${escapeHtml(audit.action)}</span><strong>${escapeHtml(audit.detail)}</strong><small>실행자 · ${escapeHtml(audit.actor)}</small></div></li>`).join("")
            : `<li class="system-integration-message">${escapeHtml(auditPlaceholder())}</li>`;

        const page = state.auditPage;
        const pageAvailable = capabilities().audit && page?.totalElements > 0;
        find("[data-audit-pagination-footer]").hidden = !pageAvailable;
        if (!pageAvailable) return;

        const firstItem = page.number * page.size + 1;
        const lastItem = Math.min(firstItem + state.audits.length - 1, page.totalElements);
        find("[data-audit-page-range]").textContent = `${firstItem}–${lastItem} / ${page.totalElements}건`;
        find("[data-audit-page-indicator]").textContent = `${page.number + 1} / ${page.totalPages}`;
        findAll("[data-audit-page-offset]").forEach((button) => {
            const targetPage = page.number + Number(button.dataset.auditPageOffset);
            button.disabled = auditPageLoading || targetPage < 0 || targetPage >= page.totalPages;
        });
        find("[data-system-audit-list]").setAttribute("aria-busy", String(auditPageLoading));
    }

    function renderAll() {
        renderSummary(); renderUsers(); renderCohorts(); renderAudits();
        const options = find("[data-manager-options]");
        if (options) {
            // 사용자 이름·이메일이 포함된 option HTML의 escapeHtml 인코딩
            options.innerHTML = capabilities().identity
                ? '<option value="">나중에 배정</option>' + state.users.filter((user) => user.globalRole !== "SYSTEM_ADMIN").map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")
                : '<option value="">Identity API 연동 후 배정</option>';
            options.disabled = !capabilities().identity;
        }
        const savePermission = find("[data-save-permission]");
        if (savePermission) savePermission.disabled = !canWritePermissions();
    }

    /**
     * 다이얼로그 입력과 현재 사용자 상태를 비교해 무엇이 실제로 바뀌는지 판정한다.
     *
     * 사유 표시와 저장 요청이 서로 다른 기준을 쓰면 "사유 칸이 안 떴는데 서버가 사유를
     * 요구"하는 어긋남이 생긴다. 그래서 한 함수로 모은다.
     */
    function readPermissionChanges(dialog, user) {
        const status = dialog.querySelector("[data-account-status-select]").value;
        const globalRole = dialog.querySelector("[data-system-admin-toggle]").checked
            ? "SYSTEM_ADMIN"
            : "USER";
        const statusChanged = capabilities().accountStatusWrite
            && ACCOUNT_STATUS_SELECTABLE.has(user?.status)
            && status !== user?.status;
        const roleChanged = capabilities().identityWrite
            && ROLE_CHANGEABLE_STATUSES.has(user?.status)
            && globalRole !== user?.globalRole;
        return {
            status,
            globalRole,
            statusChanged,
            roleChanged,
            identityChanged: statusChanged || roleChanged
        };
    }

    function setDialogOpen(dialog, open) {
        dialog.hidden = !open;
        document.body.classList.toggle("has-system-dialog", open);
    }

    function openPermissionDialog(userId) {
        if (!canWritePermissions()) return;
        const user = state.users.find((item) => item.id === userId);
        const dialog = find("[data-permission-dialog]");
        if (!user || !dialog) return;
        selectedUserId = userId;
        dialog.querySelector("[data-dialog-user-initial]").textContent = user.name.slice(0, 1);
        dialog.querySelector("[data-dialog-user-name]").textContent = user.name;
        dialog.querySelector("[data-dialog-user-email]").textContent = user.email;
        const statusSelect = dialog.querySelector("[data-account-status-select]");
        const statusReadonly = dialog.querySelector("[data-account-status-readonly]");
        const roleToggle = dialog.querySelector("[data-system-admin-toggle]");
        const roleReadonly = dialog.querySelector("[data-system-admin-readonly]");
        const reasonRow = dialog.querySelector("[data-permission-reason-row]");
        const reasonInput = dialog.querySelector("[data-permission-reason]");

        // WITHDRAWN은 관리자가 지정할 수 없다. 선택지에 없으므로 읽기 전용으로 알린다.
        const selectable = ACCOUNT_STATUS_SELECTABLE.has(user.status);
        statusSelect.disabled = !capabilities().accountStatusWrite || !selectable;
        statusSelect.value = selectable ? user.status : "ACTIVE";
        statusReadonly.hidden = selectable;
        statusReadonly.textContent = selectable
            ? ""
            : `현재 상태(${ACCOUNT_STATUS_LABELS[user.status] || user.status})는 관리자가 직접 바꿀 수 없습니다.`;

        // Identity는 탈퇴·비활성 계정의 전역 역할을 바꿔 주지 않는다. 미리 잠가서
        // 눌러 봐야 서버가 거부하는 조작을 만들지 않는다.
        const roleChangeable = ROLE_CHANGEABLE_STATUSES.has(user.status);
        roleToggle.checked = user.globalRole === "SYSTEM_ADMIN";
        roleToggle.disabled = !capabilities().identityWrite || !roleChangeable;
        roleReadonly.hidden = roleChangeable;
        roleReadonly.textContent = roleChangeable
            ? ""
            : `현재 상태(${ACCOUNT_STATUS_LABELS[user.status] || user.status})에서는 전역 권한을 바꿀 수 없습니다.`;

        reasonInput.value = "";
        reasonRow.hidden = !user.locked || !capabilities().loginLockWrite;

        const unlockButton = dialog.querySelector("[data-unlock-login]");
        unlockButton.hidden = !user.locked;
        unlockButton.disabled = !capabilities().loginLockWrite;

        dialog.querySelector("[data-permission-error]").hidden = true;
        // 기수 배정만 막힌 경우에도 나머지 항목은 쓸 수 있어야 한다.
        // 기수 응답 문자열이 포함된 option HTML의 escapeHtml 인코딩
        dialog.querySelector("[data-dialog-cohort-options]").innerHTML = state.cohorts.filter((cohort) => cohort.status !== "CLOSED").map((cohort) => `<label data-cohort-option="${escapeHtml(cohort.id)}"><input type="checkbox" value="${escapeHtml(cohort.id)}" ${user.managerCohortIds.includes(cohort.id) ? "checked" : ""}><span><strong>${escapeHtml(cohort.name)}</strong><small>${escapeHtml(formatDate(cohort.startDate))} – ${escapeHtml(formatDate(cohort.endDate))} · ${escapeHtml(STATUS_LABELS[cohort.status] || cohort.status)}</small><em data-cohort-conflict hidden>선택한 기수와 운영 기간 중복</em></span></label>`).join("");
        syncCohortAssignmentOptions(dialog);
        setDialogOpen(dialog, true);
    }

    /**
     * 출결 정책 다이얼로그를 연다.
     *
     * 정책이 없는 기수도 정상 경로다. 저장소가 미설정을 기본값으로 눕혀 주므로 여기서는
     * 안내 문구만 갈라 준다. 서버 조회 자체가 실패하면 폼을 열지 않고 토스트로 알린다.
     */
    async function openAttendancePolicyDialog(cohortId) {
        const dialog = find("[data-attendance-policy-dialog]");
        if (!dialog) return;
        const form = dialog.querySelector("[data-attendance-policy-form]");
        const errorMessage = dialog.querySelector("[data-attendance-policy-error]");
        let loaded;
        try {
            loaded = await repository.loadAttendancePolicy(cohortId);
        } catch (error) {
            showToast(error.message || "출결 정책을 불러오지 못했습니다.", true);
            return;
        }
        policyCohortId = cohortId;
        const policy = loaded.policy;
        form.elements.timezone.value = policy.timezone;
        form.elements.scheduledStartTime.value = policy.scheduledStartTime;
        form.elements.scheduledEndTime.value = policy.scheduledEndTime;
        form.elements.absenceCutoffTime.value = policy.absenceCutoffTime || "";
        form.elements.allowedAwayMinutes.value = policy.allowedAwayMinutes;
        dialog.querySelector("[data-policy-unset-note]").hidden = loaded.configured;
        dialog.querySelector("[data-policy-dialog-subtitle]").textContent = loaded.configured
            ? `${cohortName(cohortId)}의 출결 판정 기준입니다.`
            : `${cohortName(cohortId)}는 아직 출결 정책이 없습니다.`;
        errorMessage.hidden = true;
        setDialogOpen(dialog, true);
    }

    /** 생성 폼의 정책 입력만 추려 낸다. 이름 충돌을 피하려고 policy 접두사를 쓴다. */
    function readPolicyDraftFromCohortForm(form) {
        return {
            timezone: form.get("policyTimezone"),
            scheduledStartTime: form.get("policyScheduledStartTime"),
            scheduledEndTime: form.get("policyScheduledEndTime"),
            absenceCutoffTime: form.get("policyAbsenceCutoffTime"),
            allowedAwayMinutes: form.get("policyAllowedAwayMinutes")
        };
    }

    function syncCohortAssignmentOptions(dialog) {
        const inputs = [...dialog.querySelectorAll("[data-dialog-cohort-options] input")];
        const selectedCohorts = inputs.filter((input) => input.checked).map((input) => state.cohorts.find((cohort) => cohort.id === input.value)).filter(Boolean);
        inputs.forEach((input) => {
            const cohort = state.cohorts.find((item) => item.id === input.value);
            const conflict = !input.checked && selectedCohorts.some((selected) => periodsOverlap(selected, cohort));
            input.disabled = conflict;
            input.closest("[data-cohort-option]")?.classList.toggle("is-conflict", conflict);
            const message = input.closest("[data-cohort-option]")?.querySelector("[data-cohort-conflict]");
            if (message) message.hidden = !conflict;
        });
    }

    findAll("[data-panel-target]").forEach((button) => button.addEventListener("click", () => openPanel(button.dataset.panelTarget)));
    findAll("[data-go-panel]").forEach((button) => button.addEventListener("click", () => openPanel(button.dataset.goPanel)));
    const resetUserPageAndRender = () => { currentUserPage = 1; renderUsers(); };
    find("[data-user-search]")?.addEventListener("input", resetUserPageAndRender);
    find("[data-role-filter]")?.addEventListener("change", resetUserPageAndRender);
    find("[data-account-status-filter]")?.addEventListener("change", resetUserPageAndRender);
    find("[data-login-lock-filter]")?.addEventListener("change", resetUserPageAndRender);
    find("[data-cohort-search]")?.addEventListener("input", renderCohorts);
    find("[data-user-pagination]")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-user-page]");
        if (!button || button.disabled) return;
        currentUserPage = Number(button.dataset.userPage);
        renderUsers();
        find("[data-user-table-body]")?.closest(".system-table-card")?.scrollIntoView({behavior: "smooth", block: "start"});
    });
    find("[data-audit-pagination-footer]")?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-audit-page-offset]");
        if (!button || button.disabled || auditPageLoading) return;

        const requestedPage = state.auditPage.number + Number(button.dataset.auditPageOffset);
        auditPageLoading = true;
        renderAudits();
        try {
            const loaded = await repository.loadAuditPage(requestedPage);
            state = {
                ...state,
                audits: loaded.items,
                auditPage: loaded.page,
                auditError: null
            };
            find("[data-system-audit-list]")?.closest(".system-audit-card")
                ?.scrollIntoView({behavior: "smooth", block: "start"});
        } catch (error) {
            showToast(error?.message || "감사 로그를 불러오지 못했습니다.", true);
        } finally {
            auditPageLoading = false;
            renderAudits();
        }
    });
    find("[data-user-table-body]")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-permission]");
        if (button) openPermissionDialog(button.dataset.openPermission);
    });
    // 상태·전역 역할 변경이나 로그인 잠금 해제에 필요할 때만 사유를 받는다.
    function syncReasonRow() {
        const dialog = find("[data-permission-dialog]");
        const reasonRow = dialog?.querySelector("[data-permission-reason-row]");
        if (!reasonRow) return;
        const user = state.users.find((item) => item.id === selectedUserId);
        const loginUnlockAvailable = capabilities().loginLockWrite && user?.locked;
        reasonRow.hidden = !readPermissionChanges(dialog, user).identityChanged
            && !loginUnlockAvailable;
    }

    find("[data-account-status-select]")?.addEventListener("change", syncReasonRow);
    find("[data-system-admin-toggle]")?.addEventListener("change", syncReasonRow);
    find("[data-unlock-login]")?.addEventListener("click", async () => {
        const dialog = find("[data-permission-dialog]");
        const reasonInput = dialog.querySelector("[data-permission-reason]");
        const errorMessage = dialog.querySelector("[data-permission-error]");
        const reason = reasonInput.value.trim();
        if (!reason) {
            errorMessage.textContent = "로그인 잠금을 해제하려면 사유를 입력해 주세요.";
            errorMessage.hidden = false;
            reasonInput.focus();
            return;
        }
        try {
            await repository.unlockLogin(selectedUserId, reason);
            state = await repository.loadDashboard();
            renderAll();
            setDialogOpen(dialog, false);
            showToast("로그인 잠금을 해제했습니다.");
        } catch (error) {
            errorMessage.textContent = PERMISSION_ERROR_MESSAGES[error.code]
                || "로그인 잠금을 해제하지 못했습니다.";
            errorMessage.hidden = false;
        }
    });
    find("[data-dialog-cohort-options]")?.addEventListener("change", (event) => {
        if (event.target.matches('input[type="checkbox"]')) syncCohortAssignmentOptions(find("[data-permission-dialog]"));
    });
    findAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => setDialogOpen(button.closest(".system-dialog-backdrop"), false)));
    find("[data-open-cohort-dialog]")?.addEventListener("click", () => setDialogOpen(find("[data-cohort-dialog]"), true));
    find("[data-save-permission]")?.addEventListener("click", async () => {
        const dialog = find("[data-permission-dialog]");
        const selectedUser = state.users.find((user) => user.id === selectedUserId);
        const changes = readPermissionChanges(dialog, selectedUser);
        const reason = dialog.querySelector("[data-permission-reason]").value.trim();
        const editableInputs = [...dialog.querySelectorAll("[data-dialog-cohort-options] input")];
        const managerCohortIds = mergeManagerCohortSelection(
            selectedUser?.managerCohortIds,
            editableInputs.map((input) => input.value),
            editableInputs.filter((input) => input.checked).map((input) => input.value)
        );
        const errorMessage = dialog.querySelector("[data-permission-error]");

        // 사유는 서버가 필수로 검증한다. 왕복 전에 먼저 막아 준다.
        if (changes.identityChanged && !reason) {
            errorMessage.textContent = "계정 상태나 전역 권한을 바꾸려면 사유를 입력해 주세요.";
            errorMessage.hidden = false;
            return;
        }

        try {
            await repository.updateUserPermissions(selectedUserId, {
                status: changes.status,
                statusChanged: changes.statusChanged,
                globalRole: changes.globalRole,
                roleChanged: changes.roleChanged,
                reason,
                managerCohortIds,
                previousManagerCohortIds: selectedUser?.managerCohortIds || []
            });
            repository.appendAudit({action: "권한 변경", detail: `${userName(selectedUserId)} 사용자 권한 변경`});
            state = await repository.loadDashboard(); renderAll(); setDialogOpen(dialog, false); showToast("사용자 권한이 저장되었습니다.");
        } catch (error) {
            let publicMessage = error.code === "COHORT_MANAGER_PERIOD_CONFLICT"
                ? "운영 기간이 겹치는 여러 기수에 같은 관리자를 배치할 수 없습니다."
                : error.code === "MANAGER_PERMISSION_UPDATE_PARTIAL_FAILURE"
                    ? "일부 권한을 복구하지 못했습니다. 서버 상태를 확인한 뒤 다시 시도해 주세요."
                    : PERMISSION_ERROR_MESSAGES[error.code]
                        || "권한을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            // 앞 단계가 이미 반영됐는데 뒤에서 실패한 경우를 숨기지 않는다.
            const applied = [
                error.statusApplied ? "계정 상태" : null,
                error.roleApplied ? "전역 권한" : null
            ].filter(Boolean);
            if (applied.length) {
                publicMessage = `${applied.join("과 ")}는 변경되었습니다. ${publicMessage}`;
            }
            try {
                state = await repository.loadDashboard();
                renderAll();
                openPermissionDialog(selectedUserId);
            } catch {
                publicMessage += " 서버 상태도 다시 불러오지 못했습니다. 페이지를 새로고침해 주세요.";
            }
            errorMessage.textContent = publicMessage;
            errorMessage.hidden = false;
        }
    });
    find("[data-cohort-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const error = find("[data-cohort-form-error]");
        if (form.get("startDate") > form.get("endDate")) {
            error.textContent = "시작일은 종료일보다 늦을 수 없습니다."; error.hidden = false; return;
        }
        // 정책은 기수를 만들기 전에 본다. 생성 뒤에 걸리면 보상 삭제까지 돌아야 한다.
        const attendancePolicy = readPolicyDraftFromCohortForm(form);
        const invalidPolicy = validateAttendancePolicyDraft(attendancePolicy);
        if (invalidPolicy) {
            error.textContent = invalidPolicy; error.hidden = false; return;
        }
        error.hidden = true;
        try {
            const cohort = await repository.createCohort({
                ...Object.fromEntries(form.entries()),
                attendancePolicy
            });
            repository.appendAudit({action: "기수 생성", detail: `${cohort.name}을 PREPARING 상태로 생성`});
            state = await repository.loadDashboard(); renderAll(); event.currentTarget.reset(); setDialogOpen(find("[data-cohort-dialog]"), false); showToast("PREPARING 기수가 생성되었습니다.");
        } catch (repositoryError) {
            error.textContent = repositoryError.code === "COHORT_MANAGER_PERIOD_CONFLICT"
                ? "선택한 관리자는 같은 기간의 다른 기수를 이미 관리하고 있습니다."
                : repositoryError.code === "COHORT_CREATED_POLICY_SAVE_FAILED"
                    ? `${repositoryError.message} 목록을 새로고침한 뒤 해당 기수의 '출결 정책' 버튼으로 직접 설정해 주세요.`
                    : repositoryError.message;
            error.hidden = false;
        }
    });
    find("[data-attendance-policy-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const errorMessage = form.querySelector("[data-attendance-policy-error]");
        const saveButton = form.querySelector("[data-save-attendance-policy]");
        const draft = {
            timezone: form.elements.timezone.value,
            scheduledStartTime: form.elements.scheduledStartTime.value,
            scheduledEndTime: form.elements.scheduledEndTime.value,
            absenceCutoffTime: form.elements.absenceCutoffTime.value,
            allowedAwayMinutes: form.elements.allowedAwayMinutes.value
        };
        errorMessage.hidden = true;
        // 저장 왕복 중 재제출을 막는다. 같은 기수에 PUT이 겹치면 마지막 값이 조용히 이긴다.
        saveButton.disabled = true;
        try {
            await repository.saveAttendancePolicy(policyCohortId, draft);
            repository.appendAudit({
                action: "출결 정책 저장",
                detail: `${cohortName(policyCohortId)} 출결 정책 갱신`
            });
            setDialogOpen(find("[data-attendance-policy-dialog]"), false);
            showToast("출결 정책이 저장되었습니다.");
        } catch (error) {
            errorMessage.textContent = error.code === "COHORT_MANAGER_REQUIRED"
                ? "이 기수의 출결 정책을 수정할 권한이 없습니다."
                : error.code === "COHORT_NOT_FOUND"
                    ? "기수를 찾을 수 없습니다. 목록을 새로고침해 주세요."
                    : error.message || "출결 정책을 저장하지 못했습니다.";
            errorMessage.hidden = false;
        } finally {
            saveButton.disabled = false;
        }
    });
    find("[data-cohort-grid]")?.addEventListener("click", async (event) => {
        const policyButton = event.target.closest("[data-open-attendance-policy]");
        // 정책 열기는 조회만 한다. 아래 상태 변경 흐름의 재조회에 얹히지 않도록 먼저 끊는다.
        if (policyButton) {
            await openAttendancePolicyDialog(policyButton.dataset.openAttendancePolicy);
            return;
        }
        const statusButton = event.target.closest("[data-change-cohort-status]");
        const deleteButton = event.target.closest("[data-delete-cohort]");
        try {
            if (statusButton) {
                const cohort = await repository.changeCohortStatus(statusButton.dataset.changeCohortStatus, statusButton.dataset.nextStatus);
                repository.appendAudit({action: "기수 상태 변경", detail: `${cohort.name}: ${cohort.status}`});
                showToast(`${cohort.name} 상태가 ${STATUS_LABELS[cohort.status]}(으)로 변경되었습니다.`);
            }
            if (deleteButton) await repository.deleteCohort(deleteButton.dataset.deleteCohort);
            state = await repository.loadDashboard(); renderAll();
        } catch (error) { showToast(error.message, true); }
    });

    renderAll();
    return {destroy() { document.body.classList.remove("has-system-dialog"); }};
}
