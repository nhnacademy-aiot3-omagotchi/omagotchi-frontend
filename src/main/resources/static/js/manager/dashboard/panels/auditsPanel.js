(() => {
    function create({ root, store, escapeHtml }) {
        if (!root) throw new Error("Audits panel root is required.");
        const list = root.querySelector("[data-audit-list]");

        function getRows() {
            const state = store.getState();
            return state.audits.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = getRows();
            list.innerHTML = rows.length ? rows.map((item) => `
                <tr>
                    <td>${escapeHtml(item.occurredAt)}</td>
                    <td>${escapeHtml(item.action)}</td>
                    <td>${escapeHtml(item.target)}</td>
                    <td>${escapeHtml(item.detail)}</td>
                </tr>`).join("") : `<tr><td class="empty-row" colspan="4">기록된 작업 이력이 없습니다.</td></tr>`;
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
