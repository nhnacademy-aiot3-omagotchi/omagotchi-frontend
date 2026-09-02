(() => {
    function createMemberRow(template, member, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        const managerNote = row.querySelector("[data-member-manager-note]");
        const statusButton = row.querySelector("[data-member-status]");
        const endButton = row.querySelector("[data-member-end]");

        row.querySelector("[data-member-name]").textContent = member.nickname || "";
        row.querySelector("[data-member-email]").textContent = member.email ?? "";
        row.querySelector("[data-member-role]").textContent = statusLabel(member.role);
        row.querySelector("[data-member-status-label]").textContent = statusLabel(member.status);
        managerNote.hidden = false;
        managerNote.textContent = "상태 변경 API 미제공";
        statusButton.hidden = true;
        endButton.hidden = true;
        return row;
    }

    function create({ root, store, statusLabel }) {
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
