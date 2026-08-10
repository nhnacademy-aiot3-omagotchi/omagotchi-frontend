(() => {
    function createApplicationRow(template, item, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        const pending = item.status === "PENDING";
        const approve = row.querySelector("[data-approve]");
        const reject = row.querySelector("[data-reject]");

        row.querySelector("[data-application-name]").textContent = item.name ?? "";
        row.querySelector("[data-application-email]").textContent = item.email ?? "";
        row.querySelector("[data-application-requested-at]").textContent = item.requestedAt ?? "";
        row.querySelector("[data-application-status]").textContent = statusLabel(item.status);
        approve.dataset.approve = String(item.id);
        reject.dataset.reject = String(item.id);
        approve.disabled = !pending;
        reject.disabled = !pending;
        return row;
    }

    function create({ root, store, statusLabel, openDialog }) {
        if (!root) throw new Error("Applications panel root is required.");

        const count = root.querySelector("[data-application-count]");
        const list = root.querySelector("[data-application-list]");
        const rowTemplate = root.querySelector("[data-application-row-template]");
        const emptyTemplate = root.querySelector("[data-application-empty-template]");

        function getRows() {
            const state = store.getState();
            return state.applications.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = getRows();
            count.textContent = `${rows.filter((item) => item.status === "PENDING").length}건`;
            if (!rows.length) {
                list.replaceChildren(emptyTemplate.content.cloneNode(true));
                return;
            }
            const fragment = document.createDocumentFragment();
            rows.forEach((item) => fragment.append(createApplicationRow(rowTemplate, item, statusLabel)));
            list.replaceChildren(fragment);
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
