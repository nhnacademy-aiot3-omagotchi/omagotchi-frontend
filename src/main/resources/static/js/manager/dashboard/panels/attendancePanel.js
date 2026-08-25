(() => {
    const ALLOWED_STATUSES = new Set([
        "PRESENT",
        "LATE",
        "ABSENT",
        "LEFT_EARLY",
        "LATE_LEFT_EARLY",
        "MISSING_CHECK_OUT"
    ]);

    function createAttendanceRow(template, record, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        row.querySelector("[data-attendance-member-name]").textContent = `출결 기록 #${record.id}`;
        row.querySelector("[data-attendance-member-email]").textContent = "사용자 정보는 Identity 연동 후 표시됩니다.";
        row.querySelector("[data-attendance-check-in]").textContent = record?.checkIn || "-";
        row.querySelector("[data-attendance-check-out]").textContent = record?.checkOut || "-";
        row.querySelector("[data-attendance-auto-status]").textContent = statusLabel(record?.autoStatus || "PENDING");
        row.querySelector("[data-attendance-final-status]").textContent = statusLabel(record?.finalStatus || "PENDING");
        row.querySelector("[data-attendance-edit]").dataset.attendanceEdit = String(record.id);
        return row;
    }

    function create({ root, store, statusLabel, openDialog, setBubble, refreshDashboard }) {
        if (!root) throw new Error("Attendance panel root is required.");

        const dateInput = root.querySelector("[data-attendance-date]");
        const list = root.querySelector("[data-attendance-list]");
        const rowTemplate = root.querySelector("[data-attendance-row-template]");
        const emptyTemplate = root.querySelector("[data-attendance-empty-template]");
        const today = store.getState().today;
        let displayedDate = today;
        let pendingEdit = null;
        dateInput.value = today;

        function getCohort() {
            return store.getState().currentCohort;
        }

        function activate() {
            const date = dateInput.value || today;
            const cohort = getCohort();
            const fragment = document.createDocumentFragment();
            let rowCount = 0;

            for (const record of cohort.attendance.filter((item) => item.date === date)) {
                fragment.append(createAttendanceRow(rowTemplate, record, statusLabel));
                rowCount += 1;
            }

            if (!rowCount) fragment.append(emptyTemplate.content.cloneNode(true));
            list.replaceChildren(fragment);
        }

        function submitStatus(value) {
            if (!pendingEdit) return false;
            const nextStatus = value.trim().toUpperCase();
            if (!ALLOWED_STATUSES.has(nextStatus)) return false;
            globalThis.OmagotchiApi.manager.updateAttendanceStatus(
                getCohort().id,
                pendingEdit.recordId,
                nextStatus,
                "관리자 화면에서 수동 정정"
            ).then(() => refreshDashboard(pendingEdit.date))
                .catch((error) => {
                    console.error("출결 상태를 변경하지 못했습니다.", error);
                    setBubble("출결 상태를\n변경하지 못했습니다.");
                });
            return true;
        }

        function handleListClick(event) {
            const button = event.target.closest("[data-attendance-edit]");
            if (!button) return;
            const record = getCohort().attendance.find(
                (item) => String(item.id) === String(button.dataset.attendanceEdit)
            );
            if (!record) return;
            const date = dateInput.value;
            pendingEdit = { recordId: record.id, date };
            openDialog({
                title: "출결 상태 변경",
                message: `${date} 출결 기록 #${record.id}의 최종 상태를 입력하세요. PRESENT, LATE, ABSENT, LEFT_EARLY, LATE_LEFT_EARLY, MISSING_CHECK_OUT 중 하나를 사용합니다.`,
                inputLabel: "최종 상태",
                initialValue: "PRESENT"
            }, submitStatus);
        }

        dateInput.addEventListener("change", () => {
            const requestedDate = dateInput.value;
            refreshDashboard(requestedDate, { rejectAttendanceFailure: true })
                .then(() => {
                    displayedDate = requestedDate;
                    activate();
                })
                .catch((error) => {
                    dateInput.value = displayedDate;
                    activate();
                    console.error("출결을 불러오지 못했습니다.", error);
                    setBubble("출결 기록을\n불러오지 못했습니다.");
                });
        });
        list.addEventListener("click", handleListClick);

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "attendance",
        route: "attendance",
        label: "출결 관리",
        order: 50,
        topics: ["members", "attendance", "selection"],
        create
    });
})();
