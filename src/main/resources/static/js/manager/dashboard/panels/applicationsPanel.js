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

    function create({ root, store, statusLabel, openDialog, setBubble, refreshDashboard }) {
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

        async function rejectApplication(applicationId, reason) {
            try {
                await globalThis.OmagotchiApi.manager.rejectMembership(applicationId, reason);
                await refreshDashboard();
            } catch (error) {
                console.error("참가 신청을 거절하지 못했습니다.", error);
                setBubble("참가 신청을\n거절하지 못했습니다.");
            }
        }

        list.addEventListener("click", async (event) => {
            const approveButton = event.target.closest("[data-approve]");
            const rejectButton = event.target.closest("[data-reject]");
            const applicationId = approveButton?.dataset.approve || rejectButton?.dataset.reject;
            const application = getRows().find((item) => String(item.id) === String(applicationId));
            if (application?.status !== "PENDING") return;

            if (approveButton) {
                approveButton.disabled = true;
                try {
                    await globalThis.OmagotchiApi.manager.approveMembership(application.id, "STUDENT");
                    await refreshDashboard();
                } catch (error) {
                    approveButton.disabled = false;
                    console.error("참가 신청을 승인하지 못했습니다.", error);
                    setBubble("참가 신청을\n승인하지 못했습니다.");
                }
                return;
            }
            openDialog({
                title: "참가 신청 거절",
                message: `${application.name} 님의 신청을 거절합니다.`,
                inputLabel: "거절 사유",
                confirmText: "거절"
            }, (reason) => {
                const normalizedReason = reason.trim();
                if (!normalizedReason) return false;
                rejectApplication(application.id, normalizedReason);
                return true;
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
