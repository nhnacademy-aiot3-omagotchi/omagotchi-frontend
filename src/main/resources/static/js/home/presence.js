import { escapeHtml, getLocalDateKey, isEditableTarget } from "./utils.js";

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
    currentUser,
    selectedCharacterImage,
    getAttendanceHistory,
    api,
    isOverlayOpen
}) {
    let users = [];
    let keyword = "";
    const initialCapacity = Number(capacity?.textContent) || 50;
    let labCapacity = initialCapacity;
    let occupiedCount = 0;
    let keyTimer = null;

    function getCurrentStatus() {
        const attendance = getAttendanceHistory()[getLocalDateKey()] || {};
        if (!attendance.checkInAt || attendance.checkOutAt) return "offline";

        try {
            const spaceState = JSON.parse(sessionStorage.getItem("omagotchiSpaceState") || "{}");
            const inMeeting = spaceState.rooms?.some((room) => (
                room.occupancy?.participants?.some((participant) => participant.id === "current-user")
            ));
            return inMeeting ? "meeting" : "present";
        } catch {
            return "present";
        }
    }

    function syncCurrentUser() {
        const currentStatus = getCurrentStatus();
        let current = users.find((user) => user.current || user.email === currentUser.email);

        if (!current) {
            current = {
                id: "current-user",
                name: currentUser.name,
                email: currentUser.email,
                status: currentStatus,
                current: true,
                characterImage: selectedCharacterImage
            };
            users.unshift(current);
        }

        current.name = currentUser.name;
        current.email = currentUser.email;
        current.current = true;
        current.status = currentStatus;
        current.characterImage = selectedCharacterImage;
    }

    function render() {
        if (!list) return;

        syncCurrentUser();
        const normalizedKeyword = keyword.trim().toLowerCase();
        const filtered = users.filter((user) => (
            !normalizedKeyword
            || user.name.toLowerCase().includes(normalizedKeyword)
            || user.email.toLowerCase().includes(normalizedKeyword)
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
                                <span>${escapeHtml(user.email)}</span>
                            </span>
                            <span class="presence-user-status">${statusMeta[status].label}</span>
                        </li>
                    `).join("")}
                </ul>
            </section>
        `).join("") : `<p class="presence-panel-empty">검색 결과가 없습니다.</p>`;

        occupiedCount = users.filter((user) => ["present", "meeting"].includes(user.status)).length;
        if (count) count.textContent = String(occupiedCount);
        if (capacity) capacity.textContent = String(labCapacity);
    }

    async function loadSnapshot() {
        // [API-REPLACE] 실제 재실 API가 없을 때 빈 성공 응답으로 위장하지 않는다.
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
        labCapacity = Number(snapshot.capacity) || initialCapacity;
        users = Array.isArray(snapshot.users) ? snapshot.users : [];
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
        api?.subscribeLabPresence?.({
            message: applySnapshot,
            error: (_, source) => source.close()
        });
        refresh();
    }

    return { init, render, close: () => setOpen(false) };
}
