import { escapeHtml, isEditableTarget } from "./utils.js";

const statusMeta = {
    present: { label: "재실", order: 0 },
    away: { label: "부재중", order: 1 },
    meeting: { label: "회의중", order: 2 },
    offline: { label: "퇴실", order: 3 }
};

export function createPresence({
    hud,
    trigger,
    panel,
    count,
    capacity,
    search,
    list,
    refreshButton,
    updated,
    api,
    enabled = true,
    isOverlayOpen
}) {
    let users = [];
    let keyword = "";
    const initialCapacity = Number(capacity?.textContent) || 50;
    let labCapacity = initialCapacity;
    let occupiedCount = 0;
    let keyTimer = null;

    function render() {
        if (!list) return;

        if (!enabled) {
            list.innerHTML = `<p class="presence-panel-empty">기수에 가입한 후 재실 인원을 확인할 수 있습니다.</p>`;
            if (count) count.textContent = "0";
            if (capacity) capacity.textContent = "—";
            return;
        }

        const normalizedKeyword = keyword.trim().toLowerCase();
        const filtered = users.filter((user) => (
            !normalizedKeyword
            || user.name.toLowerCase().includes(normalizedKeyword)
        ));
        const groups = Object.keys(statusMeta)
            .sort((left, right) => statusMeta[left].order - statusMeta[right].order)
            .map((status) => ({ status, users: filtered.filter((user) => user.status === status) }))
            .filter((group) => group.users.length);

        list.innerHTML = groups.length ? groups.map(({ status, users: groupUsers }) => `
            <section class="presence-group" data-status="${status}">
                <h3>${statusMeta[status].label} · ${groupUsers.length}</h3>
                <ul>
                    ${groupUsers.map((user) => `
                        <li class="presence-user${status === "offline" ? " is-offline" : ""}">
                            <span class="presence-user-avatar"><img src="${escapeHtml(user.characterImage)}" alt="" /></span>
                            <span class="presence-user-copy">
                                <strong>${escapeHtml(user.name)}${user.current ? " · 나" : ""}</strong>
                            </span>
                            <span class="presence-user-status">${statusMeta[status].label}</span>
                        </li>
                    `).join("")}
                </ul>
            </section>
        `).join("") : `<p class="presence-panel-empty">검색 결과가 없습니다.</p>`;

        occupiedCount = users.filter((user) => ["present", "meeting"].includes(user.status)).length;
        if (count) count.textContent = String(occupiedCount);
        if (capacity) capacity.textContent = labCapacity == null ? "—" : String(labCapacity);
    }

    async function loadSnapshot() {
        const serverSnapshot = await api?.getLabPresence?.();
        if (serverSnapshot) {
            return serverSnapshot;
        }
        if (window.OmagotchiPresenceApi?.getLabPresence) {
            return window.OmagotchiPresenceApi.getLabPresence();
        }
        throw new Error("Presence API is unavailable");
    }

    function applySnapshot(snapshot) {
        labCapacity = null;
        users = Array.isArray(snapshot.users) ? snapshot.users.map((user) => ({
            id: user.userId,
            name: user.nickname || (user.userId ? `사용자 ${user.userId.slice(0, 8)}…` : "사용자"),
            status: ({ONLINE: "present", AWAY: "away", OFFLINE: "offline"})[user.status] || "offline",
            characterImage: user.currentCharacter?.assetKey
                ? `/images/characters/${user.currentCharacter.assetKey}.png`
                : "/images/characters/default/omagotchi.png"
        })) : [];
        render();

        if (updated) {
            const time = new Intl.DateTimeFormat("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }).format(new Date());
            updated.textContent = `${time} 갱신`;
        }
    }

    async function refresh() {
        if (!enabled) return;
        if (!refreshButton || refreshButton.disabled) return;

        refreshButton.disabled = true;
        refreshButton.classList.add("is-loading");
        if (panel) panel.dataset.uiState = "loading";
        try {
            const snapshot = await loadSnapshot();
            applySnapshot(snapshot);
            if (panel) panel.dataset.uiState = users.length ? "ready" : "empty";
        } catch {
            if (updated) updated.textContent = "갱신 실패 · 기존 목록 표시 중";
            if (panel) panel.dataset.uiState = "error";
        } finally {
            refreshButton.disabled = false;
            refreshButton.classList.remove("is-loading");
        }
    }

    function setOpen(shouldOpen) {
        if (!panel || !trigger) return;
        panel.hidden = !shouldOpen;
        trigger.setAttribute("aria-expanded", String(shouldOpen));

        if (shouldOpen) {
            refresh();
            window.setTimeout(() => search?.focus(), 0);
        }
    }

    function toggle() {
        setOpen(panel?.hidden !== false);
    }

    function playKeyFeedback() {
        window.clearTimeout(keyTimer);
        trigger?.classList.add("is-key-pressed");
        keyTimer = window.setTimeout(() => trigger?.classList.remove("is-key-pressed"), 140);
    }

    function handleKeydown(event) {
        if (event.key === "Escape") {
            setOpen(false);
            return;
        }
        if (
            event.code === "KeyU"
            && !event.metaKey
            && !event.ctrlKey
            && !event.altKey
            && !event.repeat
            && !isEditableTarget(event.target)
            && !isOverlayOpen()
        ) {
            event.preventDefault();
            playKeyFeedback();
            toggle();
        }
    }

    function init() {
        trigger?.addEventListener("click", toggle);
        refreshButton?.addEventListener("click", refresh);
        search?.addEventListener("input", () => {
            keyword = search.value;
            render();
        });
        document.addEventListener("click", (event) => {
            if (panel?.hidden === false && hud && !hud.contains(event.target)) setOpen(false);
        });
        document.addEventListener("keydown", handleKeydown);
        if (enabled) {
            api?.subscribeLabPresence?.({
                message: applySnapshot,
                error: (_, source) => source.close()
            });
            refresh();
        } else {
            if (refreshButton) refreshButton.disabled = true;
            if (search) search.disabled = true;
            if (updated) updated.textContent = "가입 기수 없음";
            if (panel) panel.dataset.uiState = "empty";
            render();
        }
    }

    return { init, render, close: () => setOpen(false) };
}
