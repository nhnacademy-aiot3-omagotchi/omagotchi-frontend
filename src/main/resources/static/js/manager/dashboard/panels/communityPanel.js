(() => {
    function createCommunityItem(template, item) {
        const article = template.content.firstElementChild.cloneNode(true);
        const action = article.querySelector("[data-community-action]");
        article.classList.toggle("is-reported", Boolean(item.reports));
        article.querySelector("[data-community-type]").textContent = item.type === "NOTICE" ? "공지" : "자유";
        article.querySelector("[data-community-title]").textContent = `${item.pinned ? "고정 · " : ""}${item.title ?? ""}`;
        article.querySelector("[data-community-content]").textContent = new Date(item.createdAt).toLocaleString("ko-KR");
        action.dataset.communityAction = String(item.postId);
        action.textContent = item.pinned ? "고정 해제" : "고정";
        return article;
    }

    function create({ root, store, setBubble, refreshDashboard }) {
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
        elements.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const title = elements.form.elements.namedItem("title").value.trim();
            const content = elements.form.elements.namedItem("content").value.trim();
            if (!title || !content) return;
            try {
                await window.OmagotchiApi.community.createPost({
                    type: "NOTICE",
                    title,
                    content,
                    scope: "COHORT",
                    cohortId: store.getState().selectedCohortId
                });
                elements.form.reset();
                elements.form.hidden = true;
                await refreshDashboard();
            } catch (error) {
                console.error("공지를 등록하지 못했습니다.", error);
                setBubble("공지를\n등록하지 못했습니다.");
            }
        });
        elements.list.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-community-action]");
            if (!button) return;
            const post = getRows().find((item) => String(item.postId) === button.dataset.communityAction);
            if (!post) return;
            try {
                await window.OmagotchiApi.manager.updatePostPin(post.postId, !post.pinned);
                await refreshDashboard();
            } catch (error) {
                console.error("게시글 고정 상태를 변경하지 못했습니다.", error);
                setBubble("게시글 고정 상태를\n변경하지 못했습니다.");
            }
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
