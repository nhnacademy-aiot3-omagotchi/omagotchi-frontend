(() => {
    const ALLOWED_STATUSES = new Set(["NORMAL", "LATE", "ABSENT", "EARLY_LEAVE"]);

    function findAttendanceRecord(cohort, memberId, date) {
        return cohort.attendance.find(
            (item) => item.memberId === memberId && item.date === date
        );
    }

    function memberRow(member, record, { statusLabel, escapeHtml }) {
        return `<tr>
            <td><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email)}</small></td>
            <td>${record?.checkIn || "-"}</td><td>${record?.checkOut || "-"}</td>
            <td>${statusLabel(record?.autoStatus || "PENDING")}</td>
            <td><span class="status-badge">${statusLabel(record?.finalStatus || "PENDING")}</span></td>
            <td><div class="table-actions"><button type="button" data-attendance-edit="${member.id}">상태 변경</button></div></td>
        </tr>`;
    }

    function create({ root, store, statusLabel, escapeHtml, openDialog }) {
        if (!root) throw new Error("Attendance panel root is required.");

        const dateInput = root.querySelector("[data-attendance-date]");
        const list = root.querySelector("[data-attendance-list]");
        const today = store.getState().today;
        let pendingEdit = null;
        dateInput.value = today;

        function getCohort() {
            return store.getState().currentCohort;
        }

        function activate() {
            const date = dateInput.value || today;
            const cohort = getCohort();
            const rows = [];

            for (const member of cohort.members) {
                if (member.role === "MANAGER" || member.status === "ENDED") continue;
                const record = findAttendanceRecord(cohort, member.id, date);
                rows.push(memberRow(member, record, { statusLabel, escapeHtml }));
            }

            list.innerHTML = rows.join("")
                || `<tr><td class="empty-row" colspan="6">조회할 구성원이 없습니다.</td></tr>`;
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
