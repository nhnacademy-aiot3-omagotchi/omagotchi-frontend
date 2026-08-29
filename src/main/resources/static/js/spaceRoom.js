(() => {
    const stateKey = "omagotchiSpaceState";
    const profile = window.OmagotchiProfile || {};
    const characterAssets = window.OmagotchiCharacterAssets;
    const profileCharacter = profile.currentCharacter || {};
    const profileAssetKey = typeof profileCharacter.assetKey === "string"
        ? profileCharacter.assetKey.trim().replace(/^\/+/, "").replace(/\.(?:png|gif)$/i, "")
        : "";
    const currentCharacterImage = profileAssetKey
        ? `/images/characters/${profileAssetKey}.png`
        : characterAssets?.getPng?.(profileCharacter.type || "study", profileCharacter.colorId || "original")
            || "/images/characters/study/study.png";
    const currentUser = {
        id: profile.userId || "current-user",
        name: profile.currentCharacter?.nickname || profile.nickname || "나",
        cohortId: profile.approvedCohort?.cohortId || null,
        cohortName: profile.approvedCohort?.name || "",
        characterImage: currentCharacterImage
    };

    const initialState = {
        activeTab: "meeting",
        selectedRoomId: "",
        alertRoomIds: [],
        libraryInside: false,
        roomPage: 0,
        partyCreateOpen: false,
        partyDetailOpen: false,
        party: null,
        rooms: []
    };

    let cohortMembers = normalizeCohortMembers(profile.approvedCohort?.members);
    let telegramOverride = null;
    let currentAttendance = null;

    const memberStatusLabels = {
        present: "재실",
        away: "부재중",
        meeting: "회의중",
        offline: "퇴실"
    };

    const roots = new Set();
    const partyRoots = new Set();
    let state = loadState();
    let ticker = null;

    window.OmagotchiApi?.attendance?.getToday?.()
        .then((attendance) => {
            currentAttendance = attendance;
        })
        .catch(() => {
            currentAttendance = null;
        });
    window.addEventListener("omagotchi:attendance", (event) => {
        currentAttendance = event.detail || null;
    });
    window.addEventListener("omagotchi:space-data", (event) => {
        updateData(event.detail || {});
    });
    window.addEventListener("omagotchi:telegram", (event) => {
        updateData({ telegram: event.detail || {} });
    });

    function cloneInitialState() {
        return JSON.parse(JSON.stringify(initialState));
    }

    function loadState() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(stateKey));
            if (!saved?.rooms) {
                return cloneInitialState();
            }

            return {
                ...cloneInitialState(),
                ...saved,
                activeTab: saved.activeTab === "library" ? "library" : "meeting",
                roomPage: Math.max(0, Number(saved.roomPage) || 0),
                partyCreateOpen: Boolean(saved.partyCreateOpen),
                partyDetailOpen: Boolean(saved.partyDetailOpen),
                party: saved.party || null
            };
        } catch {
            return cloneInitialState();
        }
    }

    function saveState() {
        sessionStorage.setItem(stateKey, JSON.stringify(state));
    }

    function getLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function isCheckedIn() {
        return Boolean(currentAttendance?.checkedInAt) && !currentAttendance?.checkedOutAt;
    }

    function getCurrentOccupancyRoom() {
        return state.rooms.find((room) => room.occupancy?.participants.some(
            (participant) => sameId(participant.id, currentUser.id)
        ));
    }

    function formatRemaining(expiresAt) {
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#039;");
    }

    function sameId(left, right) {
        return left !== undefined && left !== null && right !== undefined && right !== null
            && String(left) === String(right);
    }

    function normalizeCohortMembers(members) {
        if (!Array.isArray(members)) return [];
        return members.map((member) => ({
            id: member.id || member.userId,
            name: member.name || member.nickname || "기수원",
            email: member.email || "",
            status: member.status || "offline",
            characterImage: member.characterImage || "/images/characters/study/study.png"
        })).filter((member) => member.id);
    }

    function safeTelegramDeepLink(value) {
        if (typeof value !== "string" || !value.trim()) return "";
        try {
            const url = new URL(value, window.location.origin);
            if (url.protocol === "tg:") return url.href;
            if (url.protocol === "https:" && ["t.me", "telegram.me"].includes(url.hostname)) return url.href;
        } catch {
            return "";
        }
        return "";
    }

    function getTelegramState() {
        const injected = telegramOverride || window.OmagotchiTelegram || {};
        const profileTelegram = profile.integrations?.telegram || {};
        return {
            connected: Boolean(
                injected.connected
                ?? profileTelegram.connected
                ?? profile.telegramConnected
            ),
            deepLink: safeTelegramDeepLink(
                injected.deepLink
                || profileTelegram.deepLink
                || profile.telegramDeepLink
            )
        };
    }

    function renderCharacter(member, compact = false) {
        const image = member.characterImage || "/images/characters/study/study.png";
        return `
            <span class="ui-character-avatar${compact ? " is-compact" : ""}" title="${escapeHtml(member.name)}">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(member.name)} 캐릭터" />
            </span>`;
    }

    function getRoomView(room) {
        const occupancy = room.occupancy;
        const isMine = sameId(occupancy?.ownerId, currentUser.id);
        const isParticipant = occupancy?.participants.some((participant) => sameId(participant.id, currentUser.id));
        const isSameCohort = sameId(occupancy?.cohortId, currentUser.cohortId);

        if (room.status === "INACTIVE") {
            return { key: "inactive", label: "운영 중지", detail: room.inactiveReason };
        }

        if (!occupancy) {
            return { key: "available", label: "사용 가능", detail: `${room.capacity}인실` };
        }

        if (isMine) {
            return {
                key: "mine",
                label: "내 회의실",
                detail: `${occupancy.participants.length} / ${room.capacity}`
            };
        }

        if (isParticipant) {
            return {
                key: "participating",
                label: "참여 중",
                detail: `${occupancy.participants.length} / ${room.capacity}`
            };
        }

        return {
            key: isSameCohort ? "occupied" : "other-cohort",
            label: "사용 중",
            detail: `${occupancy.participants.length} / ${room.capacity}`
        };
    }

    function renderSensor(sensor = {}) {
        const values = [
            ["CO₂", sensor.co2 == null ? "확인 불가" : `${sensor.co2}ppm`],
            ["온도", sensor.temperature == null ? "확인 불가" : `${sensor.temperature}℃`],
            ["습도", sensor.humidity == null ? "확인 불가" : `${sensor.humidity}%`]
        ];

        return values.map(([label, value]) => `
            <article class="space-room-sensor">
                <span>${label}</span>
                <strong>${value}</strong>
            </article>
        `).join("");
    }

    function partyMembers() {
        return Array.isArray(state.party?.members) ? state.party.members : [];
    }

    function renderPartyHud() {
        if (!state.party) {
            return `
                <aside class="ui-party-hud is-empty" aria-label="내 파티 없음">
                    <strong>MY PARTY</strong>
                    <p>참여 중인 파티가 없습니다.</p>
                    <small>기수 · 팀 메뉴에서 파티를 만들 수 있어요.</small>
                </aside>`;
        }

        const members = partyMembers();
        return `
            <aside class="ui-party-hud" aria-label="내 파티 ${escapeHtml(state.party.name)}">
                <header>
                    <div><span>MY PARTY</span><h3>${escapeHtml(state.party.name)}</h3></div>
                    <strong>${members.length} / 8</strong>
                </header>
                <ul>
                    ${members.map((member) => `
                        <li>
                            ${renderCharacter(member)}
                            <strong>${escapeHtml(member.name)}</strong>
                        </li>`).join("")}
                </ul>
            </aside>`;
    }

    function renderPartyInvite(candidates, isFull) {
        return `
            <form class="ui-party-invite" data-party-add-member>
                <h3>파티원 초대</h3>
                <p>같은 기수 구성원만 초대할 수 있어요.</p>
                <label class="ui-field">
                    <span class="ui-field__label">이름 또는 이메일</span>
                    <div class="space-room-party-picker" data-space-party-picker>
                        <input
                            name="partyMemberEmail"
                            type="email"
                            placeholder="이름 또는 이메일 검색"
                            aria-label="초대할 같은 기수 사용자 검색"
                            aria-controls="home-party-candidates"
                            autocomplete="off"
                            ${isFull || !candidates.length ? "disabled" : ""}
                            required
                        />
                        <div class="space-room-party-candidates" id="home-party-candidates" role="listbox" aria-label="파티 초대 후보">
                            ${candidates.map((candidate) => `
                                <button
                                    type="button"
                                    role="option"
                                    data-space-party-candidate="${escapeHtml(candidate.email)}"
                                    data-space-party-search="${escapeHtml(`${candidate.name} ${candidate.email}`.toLowerCase())}"
                                >
                                    <span><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.email)}</small></span>
                                    <em>선택</em>
                                </button>`).join("")}
                            <p data-space-party-empty hidden>일치하는 사용자가 없습니다.</p>
                        </div>
                    </div>
                </label>
                <button class="ui-button ui-button--primary" type="submit" ${isFull || !candidates.length ? "disabled" : ""}>초대 보내기</button>
                ${!candidates.length ? "<small>현재 초대할 수 있는 기수원이 없습니다.</small>" : ""}
            </form>`;
    }

    function renderPartyManager() {
        if (!state.party) {
            if (!state.partyCreateOpen) {
                return `
                    <div class="ui-cohort-party-grid is-single">
                        <button class="ui-cohort-party-create" type="button" data-party-open-create>
                            <strong>새 파티 만들기</strong>
                            <small>참여 중인 파티가 없습니다.</small>
                        </button>
                    </div>`;
            }

            return `
                <form class="home-party-create-form" data-space-create-party>
                    <div>
                        <span class="ui-menu-eyebrow">MY STUDY PARTY</span>
                        <h3>함께 공부할 파티 만들기</h3>
                        <p>같은 기수 구성원과 최대 8명까지 함께할 수 있어요.</p>
                    </div>
                    <label class="ui-field">
                        <span class="ui-field__label">파티 이름</span>
                        <input name="partyName" type="text" minlength="1" maxlength="30" placeholder="파티 이름을 입력하세요" required />
                    </label>
                    <div>
                        <button class="ui-button ui-button--secondary" type="button" data-party-cancel-create>취소</button>
                        <button class="ui-button ui-button--primary" type="submit">파티 만들기</button>
                    </div>
                </form>`;
        }

        const members = partyMembers();
        if (!state.partyDetailOpen) {
            return `
                <div class="ui-cohort-party-grid is-single">
                    <article class="ui-cohort-party-card">
                        <div><h4>${escapeHtml(state.party.name)}</h4><span>${members.length} / 8</span></div>
                        <div class="ui-cohort-party-card__members">${members.map((member) => renderCharacter(member)).join("")}</div>
                        <span class="ui-menu-chip">내 파티</span>
                        <button class="ui-button ui-button--secondary" type="button" data-party-open-detail>파티 보기</button>
                    </article>
                </div>`;
        }

        const memberIds = new Set(members.map((member) => String(member.id)));
        const candidates = cohortMembers.filter((member) => !memberIds.has(String(member.id)) && member.email);
        const isFull = members.length >= 8;
        const isMaster = sameId(state.party.masterId, currentUser.id);

        return `
            <div class="ui-party-page">
                <header class="home-party-detail-head">
                    <button type="button" data-party-close-detail>기수 · 팀</button>
                    <span aria-hidden="true">›</span>
                    <div><small>내 파티</small><strong>${escapeHtml(state.party.name)}</strong></div>
                    <span class="ui-menu-chip">${members.length} / 8</span>
                </header>
                <div class="ui-party-management">
                    <section class="ui-party-members" aria-labelledby="home-party-members-title">
                        <h3 id="home-party-members-title">파티원</h3>
                        <ul>
                            ${members.map((member) => `
                                <li>
                                    ${renderCharacter(member, true)}
                                    <strong>${escapeHtml(member.name)}</strong>
                                    ${sameId(member.id, currentUser.id) ? "<span>나</span>" : ""}
                                    ${sameId(member.id, state.party.masterId) ? "<em>마스터</em>" : ""}
                                    ${isMaster && !sameId(member.id, currentUser.id) ? `<button type="button" data-space-remove-party-member="${escapeHtml(member.id)}">제외</button>` : ""}
                                </li>`).join("")}
                        </ul>
                    </section>
                    ${isMaster
                        ? renderPartyInvite(candidates, isFull)
                        : `<section class="ui-party-member-note"><h3>파티 정보</h3><p>파티원은 회의실 입장 시 참여자 후보에 먼저 표시됩니다.</p></section>`}
                </div>
                <footer class="ui-party-danger-zone">
                    <p>파티에서 나가도 기수에는 계속 참여합니다.</p>
                    <button class="ui-button ui-button--danger ui-party-danger-action" type="button" data-party-leave>파티 나가기</button>
                    ${isMaster ? '<button class="ui-button ui-button--danger ui-party-danger-action" type="button" data-space-disband-party>파티 해체</button>' : ""}
                </footer>
            </div>`;
    }

    function renderRoomList() {
        const items = [
            ...state.rooms.map((room) => ({ type: "room", room })),
            { type: "upcoming", id: "manager-upcoming-space" }
        ];
        const pageSize = 2;
        const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
        const page = Math.min(Math.max(0, Number(state.roomPage) || 0), pageCount - 1);
        const visibleItems = items.slice(page * pageSize, (page + 1) * pageSize);

        return `
            <section class="ui-space-list" aria-labelledby="space-room-list-title">
                <header><h3 id="space-room-list-title">공간 목록</h3><span>${state.rooms.length}개</span></header>
                <div class="ui-space-list__grid" role="list" aria-label="회의실 목록">
                    ${visibleItems.map((item) => {
                        if (item.type === "upcoming") {
                            return `
                                <article class="ui-space-upcoming" aria-label="공간 추가 예정 관리자 준비 중">
                                    <div><h4>공간 추가 예정</h4><strong>관리자 준비 중</strong><p>기수 관리자가 공간을 추가하면 이 목록에 표시됩니다.</p></div>
                                </article>`;
                        }

                        const room = item.room;
                        const view = getRoomView(room);
                        const alertEnabled = state.alertRoomIds.some((id) => String(id) === String(room.id));
                        const occupantCount = room.occupancy?.participants?.length || 0;
                        const canEnter = view.key === "available";
                        const canAlert = Boolean(room.occupancy) && !["mine", "participating"].includes(view.key);
                        const showDetail = !canEnter && !canAlert;

                        return `
                            <article class="ui-space-room-card is-${view.key}" role="listitem">
                                <div><h4>${escapeHtml(room.name)}</h4><p>${room.capacity}인실 · 함께 공부할 파티와 입장하세요.</p></div>
                                <span class="ui-menu-chip${canEnter ? " is-available" : ""}">${view.label}</span>
                                <strong>${occupantCount} / ${room.capacity}</strong>
                                ${canEnter ? `<button class="ui-button ui-button--primary" type="button" data-space-occupy="${escapeHtml(room.id)}">입장</button>` : ""}
                                ${canAlert ? `<button class="ui-button ui-button--secondary" type="button" data-space-alert="${escapeHtml(room.id)}" aria-pressed="${alertEnabled}">${alertEnabled ? "공실 알림 취소" : "공실 알림 신청"}</button>` : ""}
                                ${showDetail ? `<button class="ui-button ui-button--secondary" type="button" data-space-select-room="${escapeHtml(room.id)}">상세 보기</button>` : ""}
                            </article>`;
                    }).join("")}
                </div>
                <footer class="ui-space-pagination" aria-label="공간 목록 페이지">
                    <span>${page + 1} / ${pageCount}</span>
                    <button type="button" data-space-next-page ${pageCount <= 1 ? "disabled" : ""}>다음 공간 →</button>
                </footer>
            </section>
        `;
    }

    function renderParticipantManager(room) {
        const occupancy = room.occupancy;
        const existingIds = new Set(occupancy.participants.map((participant) => String(participant.id)));
        const partyMemberIds = new Set((state.party?.members || []).map((member) => String(member.id)));
        const candidates = cohortMembers
            .filter((member) => !existingIds.has(String(member.id)))
            .sort((a, b) => Number(partyMemberIds.has(String(b.id))) - Number(partyMemberIds.has(String(a.id))));
        const full = occupancy.participants.length >= room.capacity;

        return `
            <section class="space-room-participant-manager" aria-labelledby="participant-manager-title">
                <div class="space-room-subhead">
                    <h4 id="participant-manager-title">참여자 관리</h4>
                    <span>${occupancy.participants.length} / ${room.capacity}</span>
                </div>
                <ul class="space-room-participants">
                    ${occupancy.participants.map((participant) => `
                        <li>
                            <span>${escapeHtml(participant.name)}${sameId(participant.id, currentUser.id) ? " (나)" : ""}</span>
                            ${!sameId(participant.id, currentUser.id) ? `
                                <button type="button" data-space-remove-participant="${escapeHtml(participant.id)}">내보내기</button>
                            ` : `<em>점유자</em>`}
                        </li>
                    `).join("")}
                </ul>
                <form class="space-room-invite" data-space-add-participant>
                    <label>
                        <span>입실 중인 기수원</span>
                        <select name="participantId" ${full || !candidates.length ? "disabled" : ""}>
                            ${candidates.map((candidate) => `
                                <option value="${escapeHtml(candidate.id)}" ${candidate.status === "present" ? "" : "disabled"}>
                                    ${escapeHtml(candidate.name)}${partyMemberIds.has(String(candidate.id)) ? " · 파티원" : ""}${candidate.status === "present" ? "" : ` · ${memberStatusLabels[candidate.status]}`}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <button type="submit" ${full || !candidates.some((candidate) => candidate.status === "present") ? "disabled" : ""}>
                        바로 추가
                    </button>
                </form>
            </section>
        `;
    }

    function renderRoomDetail() {
        const room = state.rooms.find((item) => sameId(item.id, state.selectedRoomId))
            || getCurrentOccupancyRoom();
        if (!room) {
            return "";
        }
        const view = getRoomView(room);
        const occupancy = room.occupancy;
        const isMine = sameId(occupancy?.ownerId, currentUser.id);
        const isParticipant = occupancy?.participants.some((participant) => sameId(participant.id, currentUser.id));
        const isSameCohort = sameId(occupancy?.cohortId, currentUser.cohortId);
        const alertEnabled = state.alertRoomIds.some((id) => String(id) === String(room.id));
        const remainingMs = occupancy ? occupancy.expiresAt - Date.now() : 0;
        const canExtend = isMine && remainingMs <= (30 * 60 * 1000) && occupancy.extensionCount < 2;

        return `
            <article class="space-room-detail is-${view.key}" aria-live="polite">
                <header class="space-room-detail-head">
                    <div>
                        <span class="space-room-status is-${view.key}">${view.label}</span>
                        <h3>${escapeHtml(room.name)}</h3>
                        <p>${escapeHtml(room.capacity)}인실${occupancy ? ` · ${escapeHtml(occupancy.cohortName || "")}` : ""}</p>
                    </div>
                    ${occupancy ? `
                        <div class="space-room-time">
                            <span>남은 시간</span>
                            <strong data-space-detail-countdown>${formatRemaining(occupancy.expiresAt)}</strong>
                        </div>
                    ` : ""}
                </header>

                <div class="space-room-detail-sensors" aria-label="${escapeHtml(room.name)} 센서 상태">
                    ${renderSensor(room.sensor)}
                </div>

                ${view.key === "available" ? `
                    <section class="space-room-empty-state">
                        <h4>바로 사용할 수 있습니다</h4>
                        <p>사용을 시작하면 본인이 점유자가 되고 기본 2시간이 적용됩니다.</p>
                        <button class="space-room-primary" type="button" data-space-occupy="${room.id}">
                            회의실 사용
                        </button>
                    </section>
                ` : ""}

                ${view.key === "inactive" ? `
                    <section class="space-room-empty-state">
                        <h4>현재 사용할 수 없습니다</h4>
                        <p>${escapeHtml(room.inactiveReason || "운영이 일시 중지되었습니다.")}</p>
                    </section>
                ` : ""}

                ${occupancy && isSameCohort ? `
                    <section class="space-room-occupancy">
                        <div class="space-room-subhead">
                            <h4>현재 참여자</h4>
                            <span>${occupancy.participants.length} / ${room.capacity}</span>
                        </div>
                        <ul class="space-room-member-chips">
                            ${occupancy.participants.map((participant) => `
                                <li>${escapeHtml(participant.name)}${sameId(participant.id, currentUser.id) ? " (나)" : ""}</li>
                            `).join("")}
                        </ul>
                    </section>
                ` : ""}

                ${occupancy && !isSameCohort ? `
                    <section class="space-room-private-state">
                        <h4>${escapeHtml(occupancy.cohortName || "다른 기수")} 사용 중</h4>
                        <p>다른 기수의 참여자 정보는 표시하지 않습니다.</p>
                    </section>
                ` : ""}

                ${isMine ? renderParticipantManager(room) : ""}

                ${isMine ? `
                    <div class="space-room-actions">
                        <button
                            type="button"
                            data-space-extend="${room.id}"
                            ${canExtend ? "" : "disabled"}
                            title="${canExtend ? "30분 연장" : "만료 30분 전부터 최대 2회 연장할 수 있습니다"}"
                        >30분 연장</button>
                        <button class="is-danger" type="button" data-space-release="${room.id}">회의실 반납</button>
                    </div>
                    <p class="space-room-action-note">
                        ${canExtend
                            ? `현재 ${occupancy.extensionCount}회 연장했습니다.`
                            : "연장은 만료 30분 전부터 최대 2회 가능합니다."}
                    </p>
                ` : ""}

                ${isParticipant && !isMine ? `
                    <div class="space-room-actions">
                        <button class="is-danger" type="button" data-space-leave="${room.id}">참여 종료</button>
                    </div>
                ` : ""}

                ${occupancy && !isMine && !isParticipant ? `
                    <section class="space-room-alert-panel">
                        <div>
                            <h4>공실 알림</h4>
                            <p>방이 비면 알려드립니다. 알림은 예약이 아니며 사용은 선착순입니다.</p>
                        </div>
                        <button
                            class="${alertEnabled ? "is-active" : ""}"
                            type="button"
                            data-space-alert="${room.id}"
                            aria-pressed="${alertEnabled}"
                        >${alertEnabled ? "공실 알림 취소" : "공실 알림 신청"}</button>
                    </section>
                ` : ""}
            </article>
        `;
    }

    function renderMeeting() {
        const telegram = getTelegramState();
        const telegramControl = telegram.connected
            ? '<span class="ui-space-telegram-status">텔레그램 알림 설정됨</span>'
            : telegram.deepLink
                ? `<a class="ui-space-telegram-link" href="${escapeHtml(telegram.deepLink)}" target="_blank" rel="noreferrer">텔레그램 알림 설정</a>`
                : '<button class="ui-space-telegram-link" type="button" disabled title="텔레그램 연결 기능을 준비하고 있습니다">텔레그램 알림 준비 중</button>';

        return `
            <section class="ui-space-meeting" aria-labelledby="space-meeting-title">
                <header>
                    <div>
                        <span class="ui-menu-eyebrow">FIRST COME, FIRST SERVED</span>
                        <h3 id="space-meeting-title">회의실</h3>
                    </div>
                    <div class="ui-space-meeting__tools">
                        <span class="ui-menu-chip">공실 알림 ${state.alertRoomIds.length}건</span>
                        ${telegramControl}
                    </div>
                </header>
                <div class="ui-space-meeting__body">
                    ${renderPartyHud()}
                    <div class="space-room-directory">
                        ${renderRoomList()}
                        ${renderRoomDetail()}
                    </div>
                </div>
            </section>
        `;
    }

    function renderLibrary() {
        return `
            <section class="space-room-library" aria-labelledby="space-library-title">
                <header class="space-room-section-head">
                    <div>
                        <span class="space-room-kicker">SHARED STUDY SPACE</span>
                        <h3 id="space-library-title">도서관</h3>
                    </div>
                    <span class="space-room-status ${state.libraryInside ? "is-active" : ""}">
                        ${state.libraryInside ? "이용 중" : "이용 가능"}
                    </span>
                </header>
                <div class="space-room-library-grid">
                    <article>
                        <span>현재 이용</span>
                        <strong>0</strong>
                        <p>여러 기수가 함께 사용하는 조용한 학습 공간입니다.</p>
                    </article>
                    <article>
                        <span>운영 상태</span>
                        <strong>정상 운영</strong>
                        <p>도서관은 좌석을 선점하거나 공실 알림을 신청하지 않습니다.</p>
                    </article>
                    <article class="space-room-library-action">
                        <span>내 상태</span>
                        <strong>${state.libraryInside ? "도서관 이용 중" : "도서관 밖"}</strong>
                        <button type="button" data-space-library-toggle>
                            ${state.libraryInside ? "도서관 나가기" : "도서관 입장"}
                        </button>
                    </article>
                </div>
            </section>
        `;
    }

    function render(root) {
        roots.forEach((item) => {
            if (!item.isConnected) {
                roots.delete(item);
            }
        });

        root.innerHTML = `
            <div class="space-room-app-inner">
                <nav class="space-room-tabs" aria-label="공간 종류">
                    ${[
                        ["meeting", "회의실"],
                        ["library", "도서관"]
                    ].map(([key, label]) => `
                        <button
                            class="${state.activeTab === key ? "is-active" : ""}"
                            type="button"
                            role="tab"
                            data-space-tab="${key}"
                            aria-selected="${state.activeTab === key}"
                            aria-pressed="${state.activeTab === key}"
                        >${label}</button>
                    `).join("")}
                </nav>
                <div class="space-room-content">
                    ${state.activeTab === "meeting" ? renderMeeting() : ""}
                    ${state.activeTab === "library" ? renderLibrary() : ""}
                </div>
                <div class="space-room-toast" role="status" aria-live="polite" data-space-toast></div>
            </div>
        `;
    }

    function renderAll(message = "") {
        roots.forEach((root) => {
            if (!root.isConnected) {
                roots.delete(root);
                return;
            }
            render(root);
            if (message) {
                showToast(root, message);
            }
        });
        partyRoots.forEach((root) => {
            if (!root.isConnected) {
                partyRoots.delete(root);
                return;
            }
            root.innerHTML = renderPartyManager();
            if (message) {
                root.insertAdjacentHTML("beforeend", `<p class="home-party-message" role="status">${escapeHtml(message)}</p>`);
            }
        });
        saveState();
    }

    function showToast(root, message) {
        const toast = root.querySelector("[data-space-toast]");
        if (!toast) {
            return;
        }
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
    }

    function occupyRoom(roomId) {
        const room = state.rooms.find((item) => sameId(item.id, roomId));

        if (!isCheckedIn()) {
            renderAll("회의실 사용 전 홈에서 입실해 주세요.");
            return;
        }

        if (getCurrentOccupancyRoom()) {
            renderAll("한 번에 하나의 회의실만 참여할 수 있습니다.");
            return;
        }

        if (!room || room.status !== "AVAILABLE" || room.occupancy) {
            renderAll("다른 사용자가 먼저 사용을 시작했습니다.");
            return;
        }

        room.status = "OCCUPIED";
        room.occupancy = {
            ownerId: currentUser.id,
            cohortId: currentUser.cohortId,
            cohortName: currentUser.cohortName,
            startedAt: Date.now(),
            expiresAt: Date.now() + (2 * 60 * 60 * 1000),
            extensionCount: 0,
            participants: [{ id: currentUser.id, name: currentUser.name }]
        };
        state.selectedRoomId = room.id;
        state.alertRoomIds = state.alertRoomIds.filter((id) => String(id) !== String(roomId));
        renderAll(`${room.name} 사용을 시작했습니다.`);
    }

    function addParticipant(roomId, participantId) {
        const room = state.rooms.find((item) => sameId(item.id, roomId));
        const candidate = cohortMembers.find((member) => sameId(member.id, participantId));

        if (!room?.occupancy || !sameId(room.occupancy.ownerId, currentUser.id) || !candidate) {
            renderAll("참여자를 추가할 수 없습니다.");
            return;
        }

        if (candidate.status !== "present") {
            renderAll("현재 입실 중인 기수원만 추가할 수 있습니다.");
            return;
        }

        if (room.occupancy.participants.length >= room.capacity) {
            renderAll("회의실 정원이 가득 찼습니다.");
            return;
        }

        room.occupancy.participants.push({ id: candidate.id, name: candidate.name });
        renderAll(`${candidate.name} 님을 참여자로 추가했습니다.`);
    }

    function handleAction(event, root) {
        const tab = event.target.closest("[data-space-tab]");
        const roomSelect = event.target.closest("[data-space-select-room]");
        const occupy = event.target.closest("[data-space-occupy]");
        const alert = event.target.closest("[data-space-alert]");
        const release = event.target.closest("[data-space-release]");
        const extend = event.target.closest("[data-space-extend]");
        const leave = event.target.closest("[data-space-leave]");
        const remove = event.target.closest("[data-space-remove-participant]");
        const libraryToggle = event.target.closest("[data-space-library-toggle]");
        const nextPage = event.target.closest("[data-space-next-page]");
        const partyCandidate = event.target.closest("[data-space-party-candidate]");
        const openPartyCreate = event.target.closest("[data-party-open-create]");
        const cancelPartyCreate = event.target.closest("[data-party-cancel-create]");
        const openPartyDetail = event.target.closest("[data-party-open-detail]");
        const closePartyDetail = event.target.closest("[data-party-close-detail]");
        const leaveParty = event.target.closest("[data-party-leave]");
        const removePartyMember = event.target.closest("[data-space-remove-party-member]");
        const disbandParty = event.target.closest("[data-space-disband-party]");

        if (partyCandidate) {
            const picker = partyCandidate.closest("[data-space-party-picker]");
            const input = picker?.querySelector('input[name="partyMemberEmail"]');
            if (input) {
                input.value = partyCandidate.dataset.spacePartyCandidate;
                picker.classList.add("has-selection");
            }
        } else if (tab) {
            state.activeTab = tab.dataset.spaceTab;
            renderAll();
        } else if (roomSelect) {
            state.selectedRoomId = roomSelect.dataset.spaceSelectRoom;
            renderAll();
        } else if (occupy) {
            occupyRoom(occupy.dataset.spaceOccupy);
        } else if (alert) {
            const roomId = alert.dataset.spaceAlert;
            const enabled = state.alertRoomIds.some((id) => String(id) === String(roomId));
            state.alertRoomIds = enabled
                ? state.alertRoomIds.filter((id) => String(id) !== String(roomId))
                : [...state.alertRoomIds, roomId];
            renderAll(enabled ? "공실 알림을 취소했습니다." : "공실 알림을 신청했습니다.");
        } else if (release) {
            const room = state.rooms.find((item) => sameId(item.id, release.dataset.spaceRelease));
            if (sameId(room?.occupancy?.ownerId, currentUser.id)) {
                room.occupancy = null;
                room.status = "AVAILABLE";
                renderAll(`${room.name}을 반납했습니다.`);
            }
        } else if (extend) {
            const room = state.rooms.find((item) => sameId(item.id, extend.dataset.spaceExtend));
            const remaining = room?.occupancy?.expiresAt - Date.now();
            if (sameId(room?.occupancy?.ownerId, currentUser.id)
                && remaining <= (30 * 60 * 1000)
                && room.occupancy.extensionCount < 2) {
                room.occupancy.expiresAt += 30 * 60 * 1000;
                room.occupancy.extensionCount += 1;
                renderAll("사용 시간을 30분 연장했습니다.");
            }
        } else if (leave) {
            const room = state.rooms.find((item) => sameId(item.id, leave.dataset.spaceLeave));
            if (room?.occupancy && !sameId(room.occupancy.ownerId, currentUser.id)) {
                room.occupancy.participants = room.occupancy.participants.filter(
                    (participant) => !sameId(participant.id, currentUser.id)
                );
                renderAll(`${room.name} 참여를 종료했습니다.`);
            }
        } else if (remove) {
            const room = state.rooms.find((item) => sameId(item.id, state.selectedRoomId));
            const participant = room?.occupancy?.participants.find(
                (item) => sameId(item.id, remove.dataset.spaceRemoveParticipant)
            );
            if (sameId(room?.occupancy?.ownerId, currentUser.id) && participant) {
                room.occupancy.participants = room.occupancy.participants.filter(
                    (item) => !sameId(item.id, participant.id)
                );
                renderAll(`${participant.name} 님의 참여를 종료했습니다.`);
            }
        } else if (libraryToggle) {
            state.libraryInside = !state.libraryInside;
            renderAll(state.libraryInside ? "도서관에 입장했습니다." : "도서관에서 나왔습니다.");
        } else if (nextPage) {
            const pageCount = Math.max(1, Math.ceil((state.rooms.length + 1) / 2));
            state.roomPage = (Math.max(0, Number(state.roomPage) || 0) + 1) % pageCount;
            renderAll();
        } else if (openPartyCreate) {
            state.partyCreateOpen = true;
            renderAll();
        } else if (cancelPartyCreate) {
            state.partyCreateOpen = false;
            renderAll();
        } else if (openPartyDetail) {
            state.partyDetailOpen = true;
            renderAll();
        } else if (closePartyDetail) {
            state.partyDetailOpen = false;
            renderAll();
        } else if (leaveParty && state.party) {
            const partyName = state.party.name;
            state.party = null;
            state.partyCreateOpen = false;
            state.partyDetailOpen = false;
            renderAll(`${partyName} 파티에서 나갔습니다.`);
        } else if (removePartyMember) {
            const member = state.party?.members.find(
                (item) => String(item.id) === removePartyMember.dataset.spaceRemovePartyMember
            );
            if (sameId(state.party?.masterId, currentUser.id) && member) {
                state.party.members = state.party.members.filter((item) => !sameId(item.id, member.id));
                renderAll(`${member.name} 님을 파티에서 제외했습니다.`);
            }
        } else if (disbandParty && sameId(state.party?.masterId, currentUser.id)) {
            const partyName = state.party.name;
            state.party = null;
            state.partyCreateOpen = false;
            state.partyDetailOpen = false;
            renderAll(`${partyName} 파티를 해체했습니다.`);
        }

        if (root.isConnected && event.target.closest("button")) {
            root.querySelector("[data-space-toast]")?.setAttribute("aria-atomic", "true");
        }
    }

    function handleSubmit(event) {
        const participantForm = event.target.closest("[data-space-add-participant]");
        const createPartyForm = event.target.closest("[data-space-create-party]");
        const addPartyMemberForm = event.target.closest("[data-party-add-member]");

        if (!participantForm && !createPartyForm && !addPartyMemberForm) {
            return;
        }

        event.preventDefault();

        if (participantForm) {
            const room = state.rooms.find((item) => sameId(item.id, state.selectedRoomId));
            const participantId = new FormData(participantForm).get("participantId");
            addParticipant(room?.id, participantId);
            return;
        }

        if (createPartyForm) {
            const partyName = String(new FormData(createPartyForm).get("partyName") || "").trim();
            if (!partyName) {
                renderAll("파티 이름을 입력해 주세요.");
                return;
            }

            state.party = {
                id: `party-${Date.now()}`,
                name: partyName,
                cohortId: currentUser.cohortId,
                masterId: currentUser.id,
                members: [{
                    id: currentUser.id,
                    name: currentUser.name,
                    characterImage: currentUser.characterImage
                }]
            };
            state.partyCreateOpen = false;
            state.partyDetailOpen = false;
            renderAll(`${partyName} 파티를 만들었습니다.`);
            return;
        }

        const memberEmail = String(new FormData(addPartyMemberForm).get("partyMemberEmail") || "").trim();
        const member = cohortMembers.find((item) => item.email === memberEmail);
        if (!state.party || !sameId(state.party.masterId, currentUser.id) || !member) {
            renderAll("파티원을 추가할 수 없습니다.");
            return;
        }
        if (state.party.members.length >= 8) {
            renderAll("파티는 최대 8명까지 참여할 수 있습니다.");
            return;
        }
        if (state.party.members.some((item) => sameId(item.id, member.id))) {
            renderAll("이미 파티에 참여 중인 사용자입니다.");
            return;
        }

        state.party.members.push({
            id: member.id,
            name: member.name,
            email: member.email,
            characterImage: member.characterImage
        });
        renderAll(`${member.name} 님을 파티에 추가했습니다.`);
    }

    function handlePartySearch(event) {
        const input = event.target.closest('input[name="partyMemberEmail"]');
        if (!input) return;

        const picker = input.closest("[data-space-party-picker]");
        const keyword = input.value.trim().toLowerCase();
        let visibleCount = 0;

        picker?.classList.remove("has-selection");
        picker?.querySelectorAll("[data-space-party-candidate]").forEach((candidate) => {
            const matches = !keyword || candidate.dataset.spacePartySearch.includes(keyword);
            candidate.hidden = !matches;
            if (matches) visibleCount += 1;
        });

        const empty = picker?.querySelector("[data-space-party-empty]");
        if (empty) empty.hidden = visibleCount > 0;
    }

    function updateCountdowns() {
        let expiredRoom = null;

        state.rooms.forEach((room) => {
            if (room.occupancy && room.occupancy.expiresAt <= Date.now()) {
                room.occupancy = null;
                room.status = "AVAILABLE";
                expiredRoom = room;
            }
        });

        if (expiredRoom) {
            renderAll(`${expiredRoom.name} 사용 시간이 종료되었습니다.`);
            return;
        }

        roots.forEach((root) => {
            if (!root.isConnected) {
                roots.delete(root);
                return;
            }

            root.querySelectorAll("[data-space-countdown]").forEach((element) => {
                const room = state.rooms.find((item) => sameId(item.id, element.dataset.spaceCountdown));
                if (room?.occupancy) {
                    element.textContent = formatRemaining(room.occupancy.expiresAt);
                }
            });

            const selectedRoom = state.rooms.find((item) => sameId(item.id, state.selectedRoomId));
            const detailCountdown = root.querySelector("[data-space-detail-countdown]");
            if (selectedRoom?.occupancy && detailCountdown) {
                detailCountdown.textContent = formatRemaining(selectedRoom.occupancy.expiresAt);
            }
        });
    }

    function mount(root, options = {}) {
        if (!root) {
            return;
        }

        roots.add(root);
        if (["meeting", "library"].includes(options.initialTab)) {
            state.activeTab = options.initialTab;
        }

        if (!root.dataset.spaceRoomMounted) {
            root.addEventListener("click", (event) => handleAction(event, root));
            root.addEventListener("submit", handleSubmit);
            root.addEventListener("input", handlePartySearch);
            root.addEventListener("focusin", (event) => {
                event.target.closest('input[name="partyMemberEmail"]')
                    ?.closest("[data-space-party-picker]")
                    ?.classList.remove("has-selection");
            });
            root.dataset.spaceRoomMounted = "true";
        }

        render(root);

        if (!ticker) {
            ticker = window.setInterval(updateCountdowns, 1000);
        }
    }

    function mountParty(root) {
        if (!root) return;

        partyRoots.add(root);
        if (!root.dataset.partyManagerMounted) {
            root.addEventListener("click", (event) => handleAction(event, root));
            root.addEventListener("submit", handleSubmit);
            root.addEventListener("input", handlePartySearch);
            root.addEventListener("focusin", (event) => {
                event.target.closest('input[name="partyMemberEmail"]')
                    ?.closest("[data-space-party-picker]")
                    ?.classList.remove("has-selection");
            });
            root.dataset.partyManagerMounted = "true";
        }
        root.innerHTML = renderPartyManager();
    }

    function updateData(data = {}) {
        if (Array.isArray(data.rooms)) {
            state.rooms = data.rooms;
            const hasSelectedRoom = state.rooms.some((room) => String(room.id) === String(state.selectedRoomId));
            if (!hasSelectedRoom) state.selectedRoomId = "";
        }
        if (Object.hasOwn(data, "party")) {
            state.party = data.party;
            state.partyCreateOpen = false;
            state.partyDetailOpen = false;
        }
        if (Array.isArray(data.cohortMembers)) {
            cohortMembers = normalizeCohortMembers(data.cohortMembers);
        }
        if (data.telegram && typeof data.telegram === "object") {
            telegramOverride = { ...data.telegram };
        }
        renderAll();
    }

    window.OmagotchiSpaceRoom = { mount, mountParty, updateData };
})();
