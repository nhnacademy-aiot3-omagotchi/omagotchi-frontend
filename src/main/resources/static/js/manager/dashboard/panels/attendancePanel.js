(() => {
    const ALLOWED_STATUSES = new Set(["NORMAL", "LATE", "ABSENT", "EARLY_LEAVE"]);

    function findAttendanceRecord(cohort, memberId, date) {
        return cohort.attendance.find(
            (item) => String(item.memberId) === String(memberId) && item.date === date
        );
    }

    function createAttendanceRow(template, member, record, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        row.querySelector("[data-attendance-member-name]").textContent = member.name ?? "";
        row.querySelector("[data-attendance-member-email]").textContent = member.email ?? "";
        row.querySelector("[data-attendance-check-in]").textContent = record?.checkIn || "-";
        row.querySelector("[data-attendance-check-out]").textContent = record?.checkOut || "-";
        row.querySelector("[data-attendance-auto-status]").textContent = statusLabel(record?.autoStatus || "PENDING");
        row.querySelector("[data-attendance-final-status]").textContent = statusLabel(record?.finalStatus || "PENDING");
        row.querySelector("[data-attendance-edit]").dataset.attendanceEdit = String(member.id);
        return row;
    }

    function create({ root, store, statusLabel, openDialog }) {
        if (!root) throw new Error("Attendance panel root is required.");

        const dateInput = root.querySelector("[data-attendance-date]");
        const list = root.querySelector("[data-attendance-list]");
        const rowTemplate = root.querySelector("[data-attendance-row-template]");
        const emptyTemplate = root.querySelector("[data-attendance-empty-template]");
        const today = store.getState().today;
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

            for (const member of cohort.members) {
                if (member.role === "MANAGER" || member.status === "ENDED") continue;
                const record = findAttendanceRecord(cohort, member.id, date);
                fragment.append(createAttendanceRow(rowTemplate, member, record, statusLabel));
                rowCount += 1;
            }

            if (!rowCount) fragment.append(emptyTemplate.content.cloneNode(true));
            list.replaceChildren(fragment);
        }

        function submitStatus(value) {
            if (!pendingEdit) return false;
            const nextStatus = value.trim().toUpperCase();
            if (!ALLOWED_STATUSES.has(nextStatus)) return false;
            return store.dispatch({
                type: "CHANGE_ATTENDANCE_STATUS",
                memberId: pendingEdit.memberId,
                date: pendingEdit.date,
                status: nextStatus
            }).ok;
        }

        function handleListClick(event) {
            const button = event.target.closest("[data-attendance-edit]");
            if (!button) return;
            const member = getCohort().members.find(
                (item) => String(item.id) === String(button.dataset.attendanceEdit)
            );
            if (!member) return;
            const date = dateInput.value;
            pendingEdit = { memberId: member.id, date };
            openDialog({
                title: "출결 상태 변경",
                message: `${member.name} 님의 ${date} 최종 출결 상태를 입력하세요. NORMAL, LATE, ABSENT, EARLY_LEAVE 중 하나를 사용합니다.`,
                inputLabel: "최종 상태",
                initialValue: "NORMAL"
            }, submitStatus);
        }

        dateInput.addEventListener("change", activate);
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
