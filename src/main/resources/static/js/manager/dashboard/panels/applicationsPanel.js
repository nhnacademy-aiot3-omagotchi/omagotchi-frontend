(() => {
    function create({ root, store, statusLabel, escapeHtml, openDialog }) {
        if (!root) throw new Error("Applications panel root is required.");

        const count = root.querySelector("[data-application-count]");
        const list = root.querySelector("[data-application-list]");

        function getRows() {
            const state = store.getState();
            return state.applications.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = getRows();
            count.textContent = `${rows.filter((item) => item.status === "PENDING").length}건`;
            list.innerHTML = rows.length ? rows.map((item) => `
                <tr>
                    <td><strong>${escapeHtml(item.name)}</strong></td>
                    <td>${escapeHtml(item.email)}</td>
                    <td>${escapeHtml(item.requestedAt)}</td>
                    <td><span class="status-badge">${statusLabel(item.status)}</span></td>
                    <td><div class="table-actions">
                        <button class="is-primary" type="button" data-approve="${item.id}" ${item.status !== "PENDING" ? "disabled" : ""}>승인</button>
                        <button class="is-danger" type="button" data-reject="${item.id}" ${item.status !== "PENDING" ? "disabled" : ""}>거절</button>
                    </div></td>
                </tr>`).join("") : `<tr><td class="empty-row" colspan="5">참가 신청이 없습니다.</td></tr>`;
        }

        list.addEventListener("click", (event) => {
            const approveButton = event.target.closest("[data-approve]");
            const rejectButton = event.target.closest("[data-reject]");
            const applicationId = approveButton?.dataset.approve || rejectButton?.dataset.reject;
            const application = getRows().find((item) => String(item.id) === String(applicationId));
            if (application?.status !== "PENDING") return;

            if (approveButton) {
                store.dispatch({ type: "APPROVE_APPLICATION", applicationId: application.id });
                return;
            }
            openDialog({
                title: "참가 신청 거절",
                message: `${application.name} 님의 신청을 거절합니다.`,
                inputLabel: "거절 사유",
                confirmText: "거절"
            }, (reason) => {
                if (!reason.trim()) return false;
                return store.dispatch({
                    type: "REJECT_APPLICATION",
                    applicationId: application.id,
                    reason: reason.trim()
                }).ok;
            });
        });

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "applications",
        route: "applications",
        label: "참가 신청",
        order: 30,
        topics: ["applications", "selection"],
        create
    });
})();
