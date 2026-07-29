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
    isOverlayOpen
}) {
    let users = [];
    let keyword = "";
    let labCapacity = 50;
    let occupiedCount = 17;
    let keyTimer = null;

    const mockUsers = [
        { id: "current-user", ...currentUser, status: "offline", characterImage: selectedCharacterImage, current: true },
        { id: "user-moosik", name: "최무식", email: "moosik@omagotchi.site", status: "present", characterImage: "/images/characters/study/study.png" },
        { id: "user-sooki", name: "정수기", email: "sooki@omagotchi.site", status: "present", characterImage: "/images/characters/sprout/sprout.png" },
        { id: "user-suckbong", name: "한석봉", email: "suckbong@omagotchi.site", status: "present", characterImage: "/images/characters/commit/commit.png" },
        { id: "user-oreo", name: "오레오", email: "oreo@omagotchi.site", status: "away", characterImage: "/images/characters/caffeine/caffeine.png" },
        { id: "user-jiwoo", name: "박지우", email: "jiwoo@omagotchi.site", status: "meeting", characterImage: "/images/characters/debug/debug.png" },
        { id: "user-minjun", name: "김민준", email: "minjun@omagotchi.site", status: "meeting", characterImage: "/images/characters/night/night.png" },
        { id: "user-seojun", name: "이서준", email: "seojun@omagotchi.site", status: "offline", characterImage: "/images/characters/server/server.png" },
        { id: "user-subin", name: "박수빈", email: "subin@omagotchi.site", status: "offline", characterImage: "/images/characters/kid/kid.png" }
    ];

    function getCurrentStatus() {
        const attendance = getAttendanceHistory()[getLocalDateKey()] || {};
        if (!attendance.checkInAt || attendance.checkOutAt) return "offline";

        try {
            const spaceState = JSON.parse(sessionStorage.getItem("omagotchiSpacePrototypeV2") || "{}");
            const inMeeting = spaceState.rooms?.some((room) => (
                room.occupancy?.participants?.some((participant) => participant.id === "current-user")
            ));
            return inMeeting ? "meeting" : "present";
        } catch {
            return "present";
        }
    }

    function syncCurrentUser() {
        const current = users.find((user) => user.current);
        if (!current) return;

        current.status = getCurrentStatus();
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

        if (count) count.textContent = String(occupiedCount);
        if (capacity) capacity.textContent = String(labCapacity);
    }

    async function loadSnapshot() {
        if (window.OmagotchiPresenceApi?.getLabPresence) {
            return window.OmagotchiPresenceApi.getLabPresence();
        }

        await new Promise((resolve) => window.setTimeout(resolve, 280));
        const currentIsPresent = getCurrentStatus() === "present";
        return {
            capacity: 50,
            occupiedCount: 17 + Number(currentIsPresent),
            users: mockUsers.map((user) => ({ ...user }))
        };
    }

    async function refresh() {
        if (!refreshButton || refreshButton.disabled) return;

        refreshButton.disabled = true;
        refreshButton.classList.add("is-loading");
        try {
            const snapshot = await loadSnapshot();
            labCapacity = Number(snapshot.capacity) || 50;
            occupiedCount = Number.isFinite(Number(snapshot.occupiedCount))
                ? Number(snapshot.occupiedCount)
                : snapshot.users?.filter((user) => user.status === "present").length || 0;
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
        } catch {
            if (updated) updated.textContent = "갱신 실패 · 기존 목록 표시 중";
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
        refresh();
    }

    return { init, render, close: () => setOpen(false) };
}
