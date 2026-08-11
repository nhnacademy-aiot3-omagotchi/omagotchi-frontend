(() => {
    function createCommunityItem(template, item) {
        const article = template.content.firstElementChild.cloneNode(true);
        const action = article.querySelector("[data-community-action]");
        article.classList.toggle("is-reported", Boolean(item.reports));
        article.querySelector("[data-community-type]").textContent = item.type === "NOTICE" ? "공지" : "자유";
        article.querySelector("[data-community-title]").textContent = `${item.pinned ? "고정 · " : ""}${item.title ?? ""}`;
        article.querySelector("[data-community-content]").textContent = `${item.content ?? ""} · 신고 ${Number(item.reports) || 0}건`;
        action.dataset.communityAction = String(item.id);
        action.textContent = item.pinned ? "고정 해제" : item.reports ? "신고 확인" : "고정";
        return article;
    }

    function create({ root, store }) {
        if (!root) throw new Error("Community panel root is required.");

        const elements = {
            open: root.querySelector("[data-open-notice-form]"),
            form: root.querySelector("[data-notice-form]"),
            cancel: root.querySelector("[data-cancel-notice]"),
            list: root.querySelector("[data-community-list]"),
            itemTemplate: root.querySelector("[data-community-item-template]"),
            emptyTemplate: root.querySelector("[data-community-empty-template]")
        };

        function getRows() {
            const state = store.getState();
            return state.notices.filter((item) => item.cohortId === state.selectedCohortId);
        }

        function activate() {
            const rows = [...getRows()].sort((a, b) => Number(b.pinned) - Number(a.pinned));
            if (!rows.length) {
                elements.list.replaceChildren(elements.emptyTemplate.content.cloneNode(true));
                return;
            }
            const fragment = document.createDocumentFragment();
            rows.forEach((item) => fragment.append(createCommunityItem(elements.itemTemplate, item)));
            elements.list.replaceChildren(fragment);
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
