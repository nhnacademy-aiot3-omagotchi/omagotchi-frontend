(() => {
    function create({ root, store, statusLabel, openDialog, setBubble }) {
        if (!root) throw new Error("Codes panel root is required.");

        const issueButton = root.querySelector("[data-issue-code]");
        const codeCard = root.querySelector("[data-code-card]");
        const cardTemplate = root.querySelector("[data-code-card-template]");
        const emptyTemplate = root.querySelector("[data-code-empty-template]");

        function getCode() {
            return store.getState().currentCohort.joinCode;
        }

        function activate() {
            const code = getCode();
            if (!code?.value) {
                codeCard.replaceChildren(emptyTemplate.content.cloneNode(true));
                return;
            }
            codeCard.replaceChildren(cardTemplate.content.cloneNode(true));
            codeCard.querySelector("[data-code-value]").textContent = code.value;
            codeCard.querySelector("[data-code-status]").textContent = statusLabel(code.status);
            codeCard.querySelector("[data-code-expires-at]").textContent = `만료 ${code.expiresAt ?? ""}`;
            codeCard.querySelector("[data-code-issued-at]").textContent = `발급 ${code.issuedAt ?? ""}`;
            codeCard.querySelector("[data-code-used]").textContent = `사용 ${Number(code.used) || 0}회`;
            codeCard.querySelector("[data-code-revoke]").disabled = code.status !== "ACTIVE";
        }

        issueButton.addEventListener("click", () => {
            const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
            openDialog({
                title: "가입 코드 발급",
                message: "새 코드를 발급하면 기존 코드는 폐기됩니다. 만료일을 지정하세요.",
                inputLabel: "만료일",
                inputType: "date",
                initialValue: defaultExpiry,
                confirmText: "발급"
            }, (expiresAt) => {
                if (!expiresAt) return false;
                return store.dispatch({ type: "ISSUE_JOIN_CODE", expiresAt }).ok;
            });
        });

        codeCard.addEventListener("click", async (event) => {
            if (event.target.closest("[data-code-copy]")) {
                const code = getCode();
                try {
                    await navigator.clipboard.writeText(code.value);
                    setBubble("가입 코드를\n복사했습니다.");
                } catch {
                    setBubble(`가입 코드\n${code.value}`);
                }
            }
            if (event.target.closest("[data-code-revoke]")) {
                openDialog({
                    title: "가입 코드 폐기",
                    message: "현재 코드를 더 이상 사용할 수 없게 합니다.",
                    confirmText: "폐기"
                }, () => store.dispatch({ type: "REVOKE_JOIN_CODE" }).ok);
            }
        });

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "codes",
        route: "codes",
        label: "가입 코드",
        order: 20,
        topics: ["joinCode", "selection"],
        create
    });
})();
