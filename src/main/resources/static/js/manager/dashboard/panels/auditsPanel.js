(() => {
    function createAuditRow(template, item) {
        const row = template.content.firstElementChild.cloneNode(true);
        row.querySelector("[data-audit-occurred-at]").textContent = item.occurredAt ?? "";
        row.querySelector("[data-audit-action]").textContent = item.action ?? "";
        row.querySelector("[data-audit-target]").textContent = item.target ?? "";
        row.querySelector("[data-audit-detail]").textContent = item.detail ?? "";
        return row;
    }

    function create({ root, store }) {
        if (!root) throw new Error("Audits panel root is required.");
        const list = root.querySelector("[data-audit-list]");
        const rowTemplate = root.querySelector("[data-audit-row-template]");
        const emptyTemplate = root.querySelector("[data-audit-empty-template]");

        function getRows() {
            const state = store.getState();
            return state.audits.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = getRows();
            if (!rows.length) {
                list.replaceChildren(emptyTemplate.content.cloneNode(true));
                return;
            }
            const fragment = document.createDocumentFragment();
            rows.forEach((item) => fragment.append(createAuditRow(rowTemplate, item)));
            list.replaceChildren(fragment);
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "audits",
        route: "audits",
        label: "작업 이력",
        order: 90,
        topics: ["audits", "selection"],
        create
    });
})();
