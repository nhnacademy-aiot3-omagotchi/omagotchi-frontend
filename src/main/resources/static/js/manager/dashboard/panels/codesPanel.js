(() => {
    function create({ root, store, statusLabel, escapeHtml, openDialog, setBubble }) {
        if (!root) throw new Error("Codes panel root is required.");

        const issueButton = root.querySelector("[data-issue-code]");
        const codeCard = root.querySelector("[data-code-card]");

        function getCode() {
            return store.getState().currentCohort.joinCode;
        }

        function activate() {
            const code = getCode();
            if (!code?.value) {
                codeCard.innerHTML = `<div><strong>발급된 가입 코드가 없습니다.</strong><p style="margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.65;">새 코드를 발급하면 이전 코드는 즉시 폐기됩니다.</p></div>`;
                return;
            }
            codeCard.innerHTML = `
                <div>
                    <div class="code-value"><strong>${escapeHtml(code.value)}</strong><span class="status-badge">${statusLabel(code.status)}</span></div>
                    <div class="code-meta"><span>만료 ${escapeHtml(code.expiresAt)}</span><span>발급 ${escapeHtml(code.issuedAt)}</span><span>사용 ${code.used || 0}회</span></div>
                </div>
                <div class="code-actions">
                    <button class="is-primary" type="button" data-code-copy>복사</button>
                    <button class="is-danger" type="button" data-code-revoke ${code.status !== "ACTIVE" ? "disabled" : ""}>폐기</button>
                </div>`;
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
                    setBubble("가입 코드를<br />복사했습니다.");
                } catch {
                    setBubble(`가입 코드<br />${code.value}`);
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
