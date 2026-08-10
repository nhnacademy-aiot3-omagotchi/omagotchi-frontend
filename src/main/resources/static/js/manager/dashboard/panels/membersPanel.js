(() => {
    function create({ root, store, statusLabel, escapeHtml, openDialog }) {
        if (!root) throw new Error("Members panel root is required.");

        const search = root.querySelector("[data-member-search]");
        const list = root.querySelector("[data-member-list]");

        function getMembers() {
            return store.getState().currentCohort.members;
        }

        function activate() {
            const query = search.value.trim().toLowerCase();
            const rows = getMembers().filter((member) => (
                member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
            ));
            list.innerHTML = rows.map((member) => `
                <tr>
                    <td><strong>${escapeHtml(member.name)}</strong></td>
                    <td>${escapeHtml(member.email)}</td>
                    <td>${statusLabel(member.role)}</td>
                    <td><span class="status-badge">${statusLabel(member.status)}</span></td>
                    <td><div class="table-actions">
                        ${member.role === "MANAGER"
                            ? `<small>시스템 관리자만 변경 가능</small>`
                            : `<button type="button" data-member-status="${member.id}">${member.status === "ACTIVE" ? "비활성화" : "활성화"}</button>
                               <button class="is-danger" type="button" data-member-end="${member.id}" ${member.status === "ENDED" ? "disabled" : ""}>소속 종료</button>`}
                    </div></td>
                </tr>`).join("");
        }

        search.addEventListener("input", activate);
        list.addEventListener("click", (event) => {
            const statusButton = event.target.closest("[data-member-status]");
            const endButton = event.target.closest("[data-member-end]");
            const memberId = statusButton?.dataset.memberStatus || endButton?.dataset.memberEnd;
            const member = getMembers().find((item) => String(item.id) === String(memberId));
            if (!member || member.role === "MANAGER") return;
            const nextStatus = endButton ? "ENDED" : member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            openDialog({
                title: "소속 상태 변경",
                message: `${member.name} 님의 소속을 ${statusLabel(nextStatus)} 상태로 변경합니다.`,
                inputLabel: "변경 사유"
            }, (reason) => {
                if (!reason.trim()) return false;
                return store.dispatch({
                    type: "CHANGE_MEMBER_STATUS",
                    memberId: member.id,
                    status: nextStatus,
                    reason: reason.trim()
                }).ok;
            });
        });

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
