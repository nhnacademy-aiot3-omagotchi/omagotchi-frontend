import { escapeHtml, isEditableTarget } from "./utils.js";

const statusMeta = {
    present: { label: "재실", order: 0 },
    away: { label: "부재중", order: 1 },
    meeting: { label: "회의중", order: 2 },
    offline: { label: "퇴실", order: 3 }
};

// 운영 권고 TTL 120초의 1/4. 숨김 탭에서도 유지하되 visible 복귀 시 즉시 한 번 더 갱신한다.
const HEARTBEAT_INTERVAL_MS = 30_000;

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
    // 실시간 재실 정보를 실제로 받았는지. false면 인원 수를 0으로 표시하지 않는다.
    let realtimeAvailable = false;
    let heartbeatTimer = null;

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
        // 재실 정보를 못 받은 상태를 "0명"으로 표시하면 차단 상태를 정상 동작으로 위장하게 된다.
        // 진짜 0명과 확인 불가를 화면에서 구분한다.
        if (count) count.textContent = realtimeAvailable ? String(occupiedCount) : "—";
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
        // 2xx라도 계약이 어긋난 응답이 올 수 있다. 그것을 "재실 0명"으로 표시하지 않는다.
        const items = Array.isArray(snapshot?.users) ? snapshot.users : null;
        if (items === null) {
            markRealtimeUnavailable();
            return false;
        }

        labCapacity = null;
        realtimeAvailable = true;
        users = items.map((user) => ({
            id: user.userId,
            name: user.nickname || (user.userId ? `사용자 ${user.userId.slice(0, 8)}…` : "사용자"),
            status: ({ONLINE: "present", AWAY: "away", OFFLINE: "offline"})[user.status] || "offline",
            characterImage: user.currentCharacter?.assetKey
                ? `/images/characters/${user.currentCharacter.assetKey}.png`
                : "/images/characters/default/omagotchi.png"
        }));
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
        return true;
    }

    function markRealtimeUnavailable() {
        realtimeAvailable = false;
        render();
        if (updated) updated.textContent = "실시간 재실 확인 불가";
        if (panel) panel.dataset.uiState = "error";
    }

    async function sendHeartbeat() {
        try {
            // 응답 본문이 곧 최신 snapshot이다. 조회를 위해 한 번 더 왕복하지 않는다.
            if (!applySnapshot(await api.sendHeartbeat())) return;
            if (panel) panel.dataset.uiState = users.length ? "ready" : "empty";
        } catch {
            markRealtimeUnavailable();
        }
    }

    function startHeartbeat() {
        if (heartbeatTimer !== null) return;   // 중복 타이머 방지
        sendHeartbeat();
        heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatTimer === null) return;
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    async function refresh() {
        if (!enabled) return;
        if (!refreshButton || refreshButton.disabled) return;

        refreshButton.disabled = true;
        refreshButton.classList.add("is-loading");
        if (panel) panel.dataset.uiState = "loading";
        try {
            const snapshot = await loadSnapshot();
            if (!applySnapshot(snapshot)) return;
            if (panel) panel.dataset.uiState = users.length ? "ready" : "empty";
        } catch {
            markRealtimeUnavailable();
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
            // 재실의 의미는 "현재 탭을 보고 있음"이 아니라 "브라우저 세션이 살아 있음"이다.
            // 숨김 탭에서도 interval을 유지하고, 스로틀링 후 visible로 돌아오면 즉시 복구한다.
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    sendHeartbeat();
                }
            });

            // 같은 로그인 Session을 여러 탭이 공유한다. 한 탭의 pagehide에서 leave를 호출하면
            // 남은 탭까지 OFFLINE이 되므로 즉시 종료하지 않고 Redis TTL 정리에 맡긴다.
            window.addEventListener("pagehide", () => {
                stopHeartbeat();
            });

            // heartbeat는 패널 표시 여부와 무관하게 항상 돈다. "내가 재실 중"을 알리는 신호이기 때문이다.
            startHeartbeat();
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
