(() => {
    const MAX_TIMEOUT_DELAY = 2_147_483_647;

    function create({ root, store, statusLabel, openDialog, setBubble, refreshDashboard, updateCurrentCohort }) {
        if (!root) throw new Error("Codes panel root is required.");

        const issueButton = root.querySelector("[data-issue-code]");
        const codeCard = root.querySelector("[data-code-card]");
        const cardTemplate = root.querySelector("[data-code-card-template]");
        const emptyTemplate = root.querySelector("[data-code-empty-template]");
        const metadataTemplate = root.querySelector("[data-code-metadata-template]");
        let expiryTimerId = null;

        function getCode() {
            return store.getState().currentCohort.joinCode;
        }

        function isBeforeExpiry(code) {
            if (!code) return false;
            const expiresAt = Date.parse(code.expiresAt);
            return Number.isNaN(expiresAt) || expiresAt > Date.now();
        }

        function isUnexpiredActive(code) {
            return code?.status === "ACTIVE" && isBeforeExpiry(code);
        }

        function visibleStatus(code) {
            return code?.status === "ACTIVE" && !isUnexpiredActive(code)
                ? "EXPIRED"
                : code?.status;
        }

        function scheduleExpiryRefresh(code) {
            if (expiryTimerId !== null) {
                window.clearTimeout(expiryTimerId);
                expiryTimerId = null;
            }
            const expiresAt = Date.parse(code?.expiresAt);
            const delay = expiresAt - Date.now();
            if (!Number.isFinite(delay) || delay <= 0) return;
            expiryTimerId = window.setTimeout(() => {
                expiryTimerId = null;
                activate();
            }, Math.min(delay + 50, MAX_TIMEOUT_DELAY));
        }

        function activate() {
            const code = getCode();
            const unexpiredActive = isUnexpiredActive(code);
            const issuanceBlocked = isBeforeExpiry(code);
            scheduleExpiryRefresh(code);
            issueButton.disabled = issuanceBlocked;
            issueButton.textContent = issuanceBlocked
                ? (unexpiredActive ? "발급 완료" : "만료 대기")
                : "새 코드 발급";
            if (!code) {
                codeCard.replaceChildren(emptyTemplate.content.cloneNode(true));
                return;
            }
            if (!code.value) {
                codeCard.replaceChildren(metadataTemplate.content.cloneNode(true));
                codeCard.querySelector("[data-code-status]").textContent = statusLabel(visibleStatus(code));
                codeCard.querySelector("[data-code-expires-at]").textContent = `만료 ${code.expiresAt ?? ""}`;
                codeCard.querySelector("[data-code-issued-at]").textContent = `발급 ${code.issuedAt ?? ""}`;
                codeCard.querySelector("[data-code-revoke]").disabled = !unexpiredActive;
                return;
            }
            codeCard.replaceChildren(cardTemplate.content.cloneNode(true));
            codeCard.querySelector("[data-code-value]").textContent = code.value;
            codeCard.querySelector("[data-code-status]").textContent = statusLabel(visibleStatus(code));
            codeCard.querySelector("[data-code-expires-at]").textContent = `만료 ${code.expiresAt ?? ""}`;
            codeCard.querySelector("[data-code-issued-at]").textContent = `발급 ${code.issuedAt ?? ""}`;
            codeCard.querySelector("[data-code-used]").textContent = `사용 ${Number(code.used) || 0}회`;
            codeCard.querySelector("[data-code-copy]").disabled = !unexpiredActive;
            codeCard.querySelector("[data-code-revoke]").disabled = !unexpiredActive;
        }

        issueButton.addEventListener("click", () => {
            const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
            openDialog({
                title: "가입 코드 발급",
                message: "한 번 발급한 코드는 만료 전 재발급할 수 없습니다. 만료일을 지정하세요.",
                inputLabel: "만료일",
                inputType: "date",
                initialValue: defaultExpiry,
                confirmText: "발급"
            }, (expiresAt) => {
                if (!expiresAt) return false;
                const cohortId = store.getState().selectedCohortId;
                window.OmagotchiApi.manager.createJoinCode(cohortId, `${expiresAt}T23:59:59+09:00`)
                    .then((issued) => {
                        updateCurrentCohort({
                            joinCode: {
                                ...issued,
                                value: issued.code,
                                status: issued.status || "ACTIVE"
                            }
                        });
                    })
                    .catch((error) => {
                        console.error("가입 코드를 발급하지 못했습니다.", error);
                        setBubble(error?.code === "JOIN_CODE_ALREADY_EXISTS"
                            ? "기존 코드 만료 후\n다시 발급할 수 있습니다."
                            : error?.message || "가입 코드를\n발급하지 못했습니다.");
                    });
                return true;
            });
        });

        async function revokeCurrentCode(cohortId) {
            let revoked;
            try {
                revoked = await window.OmagotchiApi.manager.revokeJoinCode(cohortId);
            } catch (error) {
                console.error("가입 코드를 폐기하지 못했습니다.", error);
                setBubble(error?.message || "가입 코드를\n폐기하지 못했습니다.");
                return;
            }

            updateCurrentCohort({ joinCode: revoked });
            try {
                await refreshDashboard();
            } catch (error) {
                console.error("가입 코드 폐기 후 대시보드를 갱신하지 못했습니다.", error);
                setBubble("가입 코드는 폐기했지만\n화면을 갱신하지 못했습니다.");
            }
        }

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
                }, () => {
                    const cohortId = store.getState().selectedCohortId;
                    void revokeCurrentCode(cohortId);
                    return true;
                });
            }
        });

        window.addEventListener("focus", activate);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) activate();
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
