(() => {
    function create({ root, store, escapeHtml }) {
        if (!root) throw new Error("Community panel root is required.");

        const elements = {
            open: root.querySelector("[data-open-notice-form]"),
            form: root.querySelector("[data-notice-form]"),
            cancel: root.querySelector("[data-cancel-notice]"),
            list: root.querySelector("[data-community-list]")
        };

        function getRows() {
            const state = store.getState();
            return state.notices.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = [...getRows()].sort((a, b) => Number(b.pinned) - Number(a.pinned));
            elements.list.innerHTML = rows.length ? rows.map((item) => `
                <article class="community-item ${item.reports ? "is-reported" : ""}">
                    <span class="status-badge">${item.type === "NOTICE" ? "공지" : "자유"}</span>
                    <div><h3>${item.pinned ? "고정 · " : ""}${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)} · 신고 ${item.reports || 0}건</p></div>
                    <button type="button" data-community-action="${item.id}">${item.pinned ? "고정 해제" : item.reports ? "신고 확인" : "고정"}</button>
                </article>`).join("") : `<p class="scope-note">등록된 게시글이 없습니다.</p>`;
        }

        elements.open.addEventListener("click", () => {
            elements.form.hidden = false;
        });
        elements.cancel.addEventListener("click", () => {
            elements.form.hidden = true;
        });
        elements.form.addEventListener("submit", (event) => {
            event.preventDefault();
            const title = elements.form.elements.namedItem("title").value.trim();
            const content = elements.form.elements.namedItem("content").value.trim();
            if (!title || !content) return;
            elements.form.reset();
            elements.form.hidden = true;
            store.dispatch({ type: "CREATE_NOTICE", title, content });
        });
        elements.list.addEventListener("click", (event) => {
            const button = event.target.closest("[data-community-action]");
            if (button) store.dispatch({ type: "MODERATE_POST", postId: button.dataset.communityAction });
        });

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "community",
        route: "community",
        label: "커뮤니티",
        order: 70,
        topics: ["notices", "selection"],
        create
    });
})();
