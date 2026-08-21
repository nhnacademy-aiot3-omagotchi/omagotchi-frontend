(() => {
    function create({ root, store, statusLabel, refreshDashboard }) {
        if (!root) throw new Error("Overview panel root is required.");

        const elements = {
            name: root.querySelector("[data-cohort-name]"),
            period: root.querySelector("[data-cohort-period]"),
            status: root.querySelector("[data-cohort-status]"),
            capacity: root.querySelector("[data-cohort-capacity]"),
            pending: root.querySelector("[data-todo-applications]"),
            late: root.querySelector("[data-todo-late]"),
            reported: root.querySelector("[data-todo-community]"),
            edit: root.querySelector("[data-edit-cohort]"),
            form: root.querySelector("[data-cohort-edit-form]"),
            cancel: root.querySelector("[data-cancel-cohort-edit]")
        };
        let renderedCohortId;

        function getModel() {
            const state = store.getState();
            const cohort = state.currentCohort;
            return {
                cohort,
                pendingCount: state.applications.filter(
                    (item) => item.cohortId === cohort.id && item.status === "PENDING"
                ).length,
                lateCount: cohort.attendance.filter(
                    (item) => item.date === state.today && ["LATE", "PENDING", "ABSENT"].includes(item.finalStatus)
                ).length,
                reportedCount: state.notices.filter(
                    (item) => item.cohortId === cohort.id && item.reports > 0
                ).length
            };
        }

        function activate() {
            const model = getModel();
            const cohort = model.cohort;
            if (renderedCohortId !== cohort.id) {
                elements.form.hidden = true;
                renderedCohortId = cohort.id;
            }
            elements.name.textContent = cohort.name;
            elements.period.textContent = `${cohort.startDate} ~ ${cohort.endDate}`;
            elements.status.textContent = statusLabel(cohort.status);
            elements.capacity.textContent = "API 계약 미제공";
            elements.pending.textContent = `${model.pendingCount}건`;
            elements.late.textContent = `${model.lateCount}명`;
            elements.reported.textContent = `${model.reportedCount}건`;
            elements.form.elements.namedItem("description").value = cohort.description;
        }

        elements.edit.addEventListener("click", () => {
            elements.form.hidden = false;
        });
        elements.cancel.addEventListener("click", () => {
            elements.form.hidden = true;
        });
        elements.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const cohort = getModel().cohort;
            const description = elements.form.elements.namedItem("description").value.trim();
            try {
                await globalThis.OmagotchiApi.manager.updateCohort(cohort.id, {
                    name: cohort.name,
                    description,
                    startDate: cohort.startDate,
                    endDate: cohort.endDate
                });
                elements.form.hidden = true;
                await refreshDashboard();
            } catch (error) {
                console.error("기수 정보를 수정하지 못했습니다.", error);
            }
        });

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "overview",
        route: "overview",
        label: "운영 요약",
        order: 10,
        topics: ["cohortInfo", "members", "applications", "attendance", "notices", "selection"],
        create
    });
})();
