const STATUS_LABELS = {PREPARING: "준비 중", ACTIVE: "운영 중", CLOSED: "종료"};
const ACCOUNT_STATUS_LABELS = {ACTIVE: "활성", LOCKED: "잠금", DISABLED: "비활성화", WITHDRAWN: "탈퇴"};
const USER_PAGE_SIZE = 20;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
}

function formatDate(value) {
    return String(value || "-").replaceAll("-", ".");
}

function periodsOverlap(first, second) {
    return first.startDate < second.endDate && second.startDate < first.endDate;
}

export async function initializeSystemAdminDashboard(root = document, repository) {
    if (!repository) throw new Error("System Admin 저장소 구현체가 필요합니다.");
    let state = await repository.loadDashboard();
    let selectedUserId = null;
    let currentUserPage = 1;
    const find = (selector) => root.querySelector(selector);
    const findAll = (selector) => [...root.querySelectorAll(selector)];
    const capabilities = () => ({identity: true, audit: true, cohortDelete: true, cohortSummary: true, ...state.capabilities});

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
        find("[data-privileged-user-list]").innerHTML = identityConnected ? privileged.slice(0, 5).map((user) => `
            <li><b>${escapeHtml(user.name.slice(0, 1))}</b><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div>
            <span class="system-chip ${user.globalRole === "SYSTEM_ADMIN" ? "is-system" : ""}">${user.globalRole === "SYSTEM_ADMIN" ? "SYSTEM_ADMIN" : `${user.managerCohortIds.length}개 기수 관리`}</span></li>
        `).join("") : '<li class="system-integration-message">Identity 관리자 API 연동 후 표시됩니다.</li>';
        find("[data-recent-audit-list]").innerHTML = capabilities().audit ? state.audits.slice(0, 4).map((audit) => `
            <li><time>${escapeHtml(audit.time)}</time><div><strong>${escapeHtml(audit.action)}</strong><p>${escapeHtml(audit.detail)}</p><small>${escapeHtml(audit.actor)}</small></div></li>
        `).join("") : '<li class="system-integration-message">감사 로그 API 연동 후 표시됩니다.</li>';
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
        const users = state.users.filter((user) => {
            const matchesQuery = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
            return matchesQuery && (filter === "all" || userRole(user) === filter)
                && (accountStatus === "all" || user.status === accountStatus);
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
        find("[data-user-table-body]").innerHTML = pageUsers.map((user) => {
            const cohortBadges = user.managerCohortIds.length
                ? user.managerCohortIds.map((id) => `<span class="system-chip">${escapeHtml(cohortName(id))}</span>`).join("")
                : '<span class="system-muted">배정 없음</span>';
            const globalRole = user.globalRole === "SYSTEM_ADMIN"
                ? '<span class="system-chip is-system">SYSTEM_ADMIN</span>'
                : '<span class="system-muted">일반 사용자</span>';
            return `<tr><th scope="row" data-label="사용자"><div class="system-user-cell"><b>${escapeHtml(user.name.slice(0, 1))}</b><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></span></div></th><td data-label="계정 상태"><span class="system-account-status is-${user.status.toLowerCase()}">${ACCOUNT_STATUS_LABELS[user.status]}</span></td><td data-label="전역 권한">${globalRole}</td><td data-label="기수 운영 권한"><div class="system-chip-list">${cohortBadges}</div></td><td data-label="가입일">${escapeHtml(user.joinedAt)}</td><td><button class="system-row-button" type="button" data-open-permission="${escapeHtml(user.id)}">권한 관리</button></td></tr>`;
        }).join("");
        find("[data-user-page-range]").textContent = `${users.length}명`;
        find("[data-user-pagination-footer]").hidden = users.length === 0;
        [find("[data-user-search]"), find("[data-role-filter]"), find("[data-account-status-filter]")]
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
            return `<article class="system-cohort-card"><header><span class="system-status is-${cohort.status.toLowerCase()}">${STATUS_LABELS[cohort.status]}</span><span>${escapeHtml(cohort.status)}</span></header><h2>${escapeHtml(cohort.name)}</h2><p>${escapeHtml(cohort.description)}</p><strong class="system-cohort-period">${formatDate(cohort.startDate)} – ${formatDate(cohort.endDate)}</strong><dl><div><dt>구성원</dt><dd>${memberCount}</dd></div><div><dt>기수 관리자</dt><dd>${managerCount}</dd></div></dl><footer><div><span>담당</span><strong>${escapeHtml(managerNames)}</strong></div><div class="system-cohort-actions">${statusAction}<button class="is-danger" type="button" data-delete-cohort="${escapeHtml(cohort.id)}" ${canDelete ? "" : "disabled"}>삭제</button></div></footer></article>`;
        }).join("");
    }

    function renderAudits() {
        find("[data-system-audit-list]").innerHTML = capabilities().audit
            ? state.audits.map((audit) => `<li><time>${escapeHtml(audit.time)}</time><i aria-hidden="true"></i><div><span>${escapeHtml(audit.action)}</span><strong>${escapeHtml(audit.detail)}</strong><small>실행자 · ${escapeHtml(audit.actor)}</small></div></li>`).join("")
            : '<li class="system-integration-message">감사 로그 API 연동 후 서버 기록을 표시합니다.</li>';
    }

    function renderAll() {
        renderSummary(); renderUsers(); renderCohorts(); renderAudits();
        const options = find("[data-manager-options]");
        if (options) {
            options.innerHTML = capabilities().identity
                ? '<option value="">나중에 배정</option>' + state.users.filter((user) => user.globalRole !== "SYSTEM_ADMIN").map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")
                : '<option value="">Identity API 연동 후 배정</option>';
            options.disabled = !capabilities().identity;
        }
    }

    function setDialogOpen(dialog, open) {
        dialog.hidden = !open;
        document.body.classList.toggle("has-system-dialog", open);
    }

    function openPermissionDialog(userId) {
        const user = state.users.find((item) => item.id === userId);
        const dialog = find("[data-permission-dialog]");
        if (!user || !dialog) return;
        selectedUserId = userId;
        dialog.querySelector("[data-dialog-user-initial]").textContent = user.name.slice(0, 1);
        dialog.querySelector("[data-dialog-user-name]").textContent = user.name;
        dialog.querySelector("[data-dialog-user-email]").textContent = user.email;
        dialog.querySelector("[data-system-admin-toggle]").checked = user.globalRole === "SYSTEM_ADMIN";
        dialog.querySelector("[data-account-status-select]").value = user.status;
        dialog.querySelector("[data-permission-error]").hidden = true;
        dialog.querySelector("[data-dialog-cohort-options]").innerHTML = state.cohorts.filter((cohort) => cohort.status !== "CLOSED").map((cohort) => `<label data-cohort-option="${escapeHtml(cohort.id)}"><input type="checkbox" value="${escapeHtml(cohort.id)}" ${user.managerCohortIds.includes(cohort.id) ? "checked" : ""}><span><strong>${escapeHtml(cohort.name)}</strong><small>${formatDate(cohort.startDate)} – ${formatDate(cohort.endDate)} · ${STATUS_LABELS[cohort.status]}</small><em data-cohort-conflict hidden>선택한 기수와 운영 기간 중복</em></span></label>`).join("");
        syncCohortAssignmentOptions(dialog);
        setDialogOpen(dialog, true);
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
    find("[data-cohort-search]")?.addEventListener("input", renderCohorts);
    find("[data-user-pagination]")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-user-page]");
        if (!button || button.disabled) return;
        currentUserPage = Number(button.dataset.userPage);
        renderUsers();
        find("[data-user-table-body]")?.closest(".system-table-card")?.scrollIntoView({behavior: "smooth", block: "start"});
    });
    find("[data-user-table-body]")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-permission]");
        if (button) openPermissionDialog(button.dataset.openPermission);
    });
    find("[data-dialog-cohort-options]")?.addEventListener("change", (event) => {
        if (event.target.matches('input[type="checkbox"]')) syncCohortAssignmentOptions(find("[data-permission-dialog]"));
    });
    findAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => setDialogOpen(button.closest(".system-dialog-backdrop"), false)));
    find("[data-open-cohort-dialog]")?.addEventListener("click", () => setDialogOpen(find("[data-cohort-dialog]"), true));
    find("[data-save-permission]")?.addEventListener("click", async () => {
        const dialog = find("[data-permission-dialog]");
        const globalRole = dialog.querySelector("[data-system-admin-toggle]").checked ? "SYSTEM_ADMIN" : "USER";
        const status = dialog.querySelector("[data-account-status-select]").value;
        const managerCohortIds = [...dialog.querySelectorAll("[data-dialog-cohort-options] input:checked")].map((input) => input.value);
        const errorMessage = dialog.querySelector("[data-permission-error]");
        try {
            await repository.updateUserPermissions(selectedUserId, {status, globalRole, managerCohortIds});
            repository.appendAudit({action: "권한 변경", detail: `${userName(selectedUserId)} 사용자 권한 변경`});
            state = await repository.loadDashboard(); renderAll(); setDialogOpen(dialog, false); showToast("사용자 권한이 저장되었습니다.");
        } catch (error) {
            errorMessage.textContent = error.code === "COHORT_MANAGER_PERIOD_CONFLICT"
                ? "운영 기간이 겹치는 여러 기수에 같은 관리자를 배치할 수 없습니다."
                : error.message;
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
        error.hidden = true;
        try {
            const cohort = await repository.createCohort(Object.fromEntries(form.entries()));
            repository.appendAudit({action: "기수 생성", detail: `${cohort.name}을 PREPARING 상태로 생성`});
            state = await repository.loadDashboard(); renderAll(); event.currentTarget.reset(); setDialogOpen(find("[data-cohort-dialog]"), false); showToast("PREPARING 기수가 생성되었습니다.");
        } catch (repositoryError) {
            error.textContent = repositoryError.code === "COHORT_MANAGER_PERIOD_CONFLICT"
                ? "선택한 관리자는 같은 기간의 다른 기수를 이미 관리하고 있습니다."
                : repositoryError.message;
            error.hidden = false;
        }
    });
    find("[data-cohort-grid]")?.addEventListener("click", async (event) => {
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
