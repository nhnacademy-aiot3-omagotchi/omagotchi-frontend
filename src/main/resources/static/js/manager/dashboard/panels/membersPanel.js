(() => {
    function createMemberRow(template, member, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        const managerNote = row.querySelector("[data-member-manager-note]");
        const statusButton = row.querySelector("[data-member-status]");
        const endButton = row.querySelector("[data-member-end]");
        const isManager = member.role === "MANAGER";

        row.querySelector("[data-member-name]").textContent = member.name ?? "";
        row.querySelector("[data-member-email]").textContent = member.email ?? "";
        row.querySelector("[data-member-role]").textContent = statusLabel(member.role);
        row.querySelector("[data-member-status-label]").textContent = statusLabel(member.status);
        managerNote.hidden = !isManager;
        statusButton.hidden = isManager;
        endButton.hidden = isManager;
        if (!isManager) {
            statusButton.dataset.memberStatus = String(member.id);
            statusButton.textContent = member.status === "ACTIVE" ? "비활성화" : "활성화";
            endButton.dataset.memberEnd = String(member.id);
            endButton.disabled = member.status === "ENDED";
        }
        return row;
    }

    function create({ root, store, statusLabel, openDialog }) {
        if (!root) throw new Error("Members panel root is required.");

        const search = root.querySelector("[data-member-search]");
        const list = root.querySelector("[data-member-list]");
        const rowTemplate = root.querySelector("[data-member-row-template]");

        function getMembers() {
            return store.getState().currentCohort.members;
        }

        function activate() {
            const query = search.value.trim().toLowerCase();
            const rows = getMembers().filter((member) => (
                member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
            ));
            const fragment = document.createDocumentFragment();
            rows.forEach((member) => fragment.append(createMemberRow(rowTemplate, member, statusLabel)));
            list.replaceChildren(fragment);
        }

        search.addEventListener("input", activate);
        list.addEventListener("click", (event) => {
            const statusButton = event.target.closest("[data-member-status]");
            const endButton = event.target.closest("[data-member-end]");
            const memberId = statusButton?.dataset.memberStatus || endButton?.dataset.memberEnd;
            const member = getMembers().find((item) => String(item.id) === String(memberId));
            if (!member || member.role === "MANAGER") return;
            const nextStatus = endButton ? "ENDED" : member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            openDialog({
                title: "소속 상태 변경",
                message: `${member.name} 님의 소속을 ${statusLabel(nextStatus)} 상태로 변경합니다.`,
                inputLabel: "변경 사유"
            }, (reason) => {
                if (!reason.trim()) return false;
                return store.dispatch({
                    type: "CHANGE_MEMBER_STATUS",
                    memberId: member.id,
                    status: nextStatus,
                    reason: reason.trim()
                }).ok;
            });
        });

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "members",
        route: "members",
        label: "소속 관리",
        order: 40,
        topics: ["members", "selection"],
        create
    });
})();
