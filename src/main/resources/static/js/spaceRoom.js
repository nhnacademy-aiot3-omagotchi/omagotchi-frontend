(() => {
    const stateKey = "omagotchiSpaceState";
    const profile = window.OmagotchiProfile || {};
    const currentUser = {
        id: "current-user",
        name: profile.currentCharacter?.nickname || profile.nickname || "나",
        cohortId: profile.approvedCohort?.cohortId || null,
        cohortName: profile.approvedCohort?.name || ""
    };

    const initialState = {
        activeTab: "lab",
        selectedRoomId: "",
        alertRoomIds: [],
        libraryInside: false,
        partyPanelOpen: false,
        party: null,
        rooms: []
    };

    const cohortMembers = [];
    let currentAttendance = null;

    const memberStatusLabels = {
        present: "재실",
        away: "부재중",
        meeting: "회의중",
        offline: "퇴실"
    };

    const roots = new Set();
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
                partyPanelOpen: Boolean(saved.partyPanelOpen),
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
            (participant) => participant.id === currentUser.id
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

    function getRoomView(room) {
        const occupancy = room.occupancy;
        const isMine = occupancy?.ownerId === currentUser.id;
        const isParticipant = occupancy?.participants.some((participant) => participant.id === currentUser.id);
        const isSameCohort = occupancy?.cohortId === currentUser.cohortId;

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
                detail: `${occupancy.participants.length} / ${room.capacity}명`
            };
        }

        if (isParticipant) {
            return {
                key: "participating",
                label: "참여 중",
                detail: `${occupancy.participants.length} / ${room.capacity}명`
            };
        }

        return {
            key: isSameCohort ? "occupied" : "other-cohort",
            label: "사용 중",
            detail: `${occupancy.participants.length} / ${room.capacity}명`
        };
    }

    function renderSensor(sensor) {
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

    function renderLab() {
        const checkedIn = isCheckedIn();

        return `
            <section class="space-room-lab" aria-labelledby="space-lab-title">
                <header class="space-room-section-head">
                    <div>
                        <span class="space-room-kicker">MY COHORT LAB</span>
                        <h3 id="space-lab-title">실습실</h3>
                    </div>
                    <span class="space-room-status ${checkedIn ? "is-active" : ""}">
                        ${checkedIn ? "입실 중" : "입실 전"}
                    </span>
                </header>
                <div class="space-room-lab-grid">
                    <aside class="space-room-sensors" aria-label="실습실 센서 상태">
                        ${renderSensor({ co2: null, temperature: null, humidity: null })}
                    </aside>
                    <div class="space-room-lab-stage">
                        <div>
                            <span>현재 인원</span>
                            <strong>${checkedIn ? 1 : 0} / 0</strong>
                        </div>
                        <p>${checkedIn
                            ? "입실 기록과 함께 실습실 참여 상태가 연결되었습니다."
                            : "홈에서 입실하면 담당 기수 실습실에 자동으로 연결됩니다."}</p>
                    </div>
                </div>
            </section>
        `;
    }

    function renderPartyPanel() {
        if (!state.partyPanelOpen) {
            return "";
        }

        if (!state.party) {
            return `
                <section class="space-room-party is-empty" aria-labelledby="space-party-title">
                    <div>
                        <span class="space-room-kicker">MY STUDY PARTY</span>
                        <h4 id="space-party-title">함께 공부할 파티 만들기</h4>
                        <p>파티는 회의실과 별도로 유지되며 같은 기수 사용자만 최대 8명까지 추가할 수 있습니다.</p>
                    </div>
                    <form class="space-room-party-create" data-space-create-party>
                        <label>
                            <span>파티 이름</span>
                            <input
                                name="partyName"
                                type="text"
                                minlength="1"
                                maxlength="30"
                                placeholder="예: 집에 가고싶은 사람들의 모임"
                                required
                            >
                        </label>
                        <button type="submit">파티 만들기</button>
                    </form>
                </section>
            `;
        }

        const memberIds = new Set(state.party.members.map((member) => member.id));
        const candidates = cohortMembers.filter((member) => !memberIds.has(member.id));
        const isFull = state.party.members.length >= 8;

        return `
            <section class="space-room-party" aria-labelledby="space-party-title">
                <div class="space-room-party-head">
                    <div>
                        <span class="space-room-kicker">MY STUDY PARTY</span>
                        <h4 id="space-party-title">${escapeHtml(state.party.name)}</h4>
                        <p>파티원은 회의실 사용 시 참여자 후보에서 먼저 표시됩니다.</p>
                    </div>
                    <strong>${state.party.members.length} / 8명</strong>
                </div>
                <ul class="space-room-party-members" aria-label="파티원 목록">
                    ${state.party.members.map((member) => `
                        <li>
                            <span>${member.name}${member.id === currentUser.id ? " (나)" : ""}</span>
                            ${member.id === state.party.masterId
                                ? "<em>마스터</em>"
                                : `<button type="button" data-space-remove-party-member="${member.id}">제외</button>`}
                        </li>
                    `).join("")}
                </ul>
                <div class="space-room-party-tools">
                    <form data-space-add-party-member>
                        <label>
                            <span>같은 기수 사용자 이메일</span>
                            <div class="space-room-party-picker" data-space-party-picker>
                                <input
                                    name="memberEmail"
                                    type="email"
                                    placeholder="이름 또는 이메일 검색"
                                    aria-label="초대할 같은 기수 사용자 검색"
                                    aria-controls="space-party-candidates"
                                    autocomplete="off"
                                    ${isFull || !candidates.length ? "disabled" : ""}
                                    required
                                >
                                <div
                                    class="space-room-party-candidates"
                                    id="space-party-candidates"
                                    role="listbox"
                                    aria-label="파티 초대 후보"
                                >
                                    ${candidates.map((candidate) => `
                                        <button
                                            type="button"
                                            role="option"
                                            data-space-party-candidate="${escapeHtml(candidate.email)}"
                                            data-space-party-search="${escapeHtml(`${candidate.name} ${candidate.email}`.toLowerCase())}"
                                        >
                                            <img src="${escapeHtml(candidate.characterImage)}" alt="">
                                            <span>
                                                <strong>${escapeHtml(candidate.name)}</strong>
                                                <small>${escapeHtml(candidate.email)}</small>
                                            </span>
                                            <em class="is-${candidate.status}">
                                                ${memberStatusLabels[candidate.status]}
                                            </em>
                                        </button>
                                    `).join("")}
                                    <p data-space-party-empty hidden>일치하는 사용자가 없습니다.</p>
                                </div>
                            </div>
                        </label>
                        <button type="submit" ${isFull || !candidates.length ? "disabled" : ""}>파티원 추가</button>
                    </form>
                    <button class="is-danger" type="button" data-space-disband-party>파티 해체</button>
                </div>
            </section>
        `;
    }

    function renderRoomList() {
        return `
            <div class="space-room-list" role="list" aria-label="회의실 목록">
                ${state.rooms.length ? state.rooms.map((room) => {
                    const view = getRoomView(room);
                    const selected = room.id === state.selectedRoomId;
                    const remaining = room.occupancy ? formatRemaining(room.occupancy.expiresAt) : "";

                    return `
                        <button
                            class="space-room-list-item is-${view.key}${selected ? " is-selected" : ""}"
                            type="button"
                            role="listitem"
                            data-space-select-room="${room.id}"
                            aria-pressed="${selected}"
                        >
                            <span class="space-room-list-number">${room.name.slice(-1)}</span>
                            <span class="space-room-list-copy">
                                <strong>${room.name}</strong>
                                <small>${view.label} · ${view.detail}</small>
                            </span>
                            ${remaining ? `<time data-space-countdown="${room.id}">${remaining}</time>` : ""}
                        </button>
                    `;
                }).join("") : `<p class="space-room-empty-state">등록된 회의실이 없습니다.</p>`}
            </div>
        `;
    }

    function renderParticipantManager(room) {
        const occupancy = room.occupancy;
        const existingIds = new Set(occupancy.participants.map((participant) => participant.id));
        const partyMemberIds = new Set((state.party?.members || []).map((member) => member.id));
        const candidates = cohortMembers
            .filter((member) => !existingIds.has(member.id))
            .sort((a, b) => Number(partyMemberIds.has(b.id)) - Number(partyMemberIds.has(a.id)));
        const full = occupancy.participants.length >= room.capacity;

        return `
            <section class="space-room-participant-manager" aria-labelledby="participant-manager-title">
                <div class="space-room-subhead">
                    <h4 id="participant-manager-title">참여자 관리</h4>
                    <span>${occupancy.participants.length} / ${room.capacity}명</span>
                </div>
                <ul class="space-room-participants">
                    ${occupancy.participants.map((participant) => `
                        <li>
                            <span>${participant.name}${participant.id === currentUser.id ? " (나)" : ""}</span>
                            ${participant.id !== currentUser.id ? `
                                <button type="button" data-space-remove-participant="${participant.id}">내보내기</button>
                            ` : `<em>점유자</em>`}
                        </li>
                    `).join("")}
                </ul>
                <form class="space-room-invite" data-space-add-participant>
                    <label>
                        <span>입실 중인 기수원</span>
                        <select name="participantId" ${full || !candidates.length ? "disabled" : ""}>
                            ${candidates.map((candidate) => `
                                <option value="${candidate.id}" ${candidate.status === "present" ? "" : "disabled"}>
                                    ${candidate.name}${partyMemberIds.has(candidate.id) ? " · 파티원" : ""}${candidate.status === "present" ? "" : ` · ${memberStatusLabels[candidate.status]}`}
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
        const room = state.rooms.find((item) => item.id === state.selectedRoomId) || state.rooms[0];
        if (!room) {
            return `
                <article class="space-room-detail" aria-live="polite">
                    <section class="space-room-empty-state">
                        <h4>회의실 정보가 없습니다</h4>
                        <p>백엔드에서 회의실 목록을 내려주면 이 영역에 표시됩니다.</p>
                    </section>
                </article>
            `;
        }
        const view = getRoomView(room);
        const occupancy = room.occupancy;
        const isMine = occupancy?.ownerId === currentUser.id;
        const isParticipant = occupancy?.participants.some((participant) => participant.id === currentUser.id);
        const isSameCohort = occupancy?.cohortId === currentUser.cohortId;
        const alertEnabled = state.alertRoomIds.includes(room.id);
        const remainingMs = occupancy ? occupancy.expiresAt - Date.now() : 0;
        const canExtend = isMine && remainingMs <= (30 * 60 * 1000) && occupancy.extensionCount < 2;

        return `
            <article class="space-room-detail is-${view.key}" aria-live="polite">
                <header class="space-room-detail-head">
                    <div>
                        <span class="space-room-status is-${view.key}">${view.label}</span>
                        <h3>${room.name}</h3>
                        <p>${room.capacity}인실${occupancy ? ` · ${occupancy.cohortName}` : ""}</p>
                    </div>
                    ${occupancy ? `
                        <div class="space-room-time">
                            <span>남은 시간</span>
                            <strong data-space-detail-countdown>${formatRemaining(occupancy.expiresAt)}</strong>
                        </div>
                    ` : ""}
                </header>

                <div class="space-room-detail-sensors" aria-label="${room.name} 센서 상태">
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
                        <p>${room.inactiveReason}</p>
                    </section>
                ` : ""}

                ${occupancy && isSameCohort ? `
                    <section class="space-room-occupancy">
                        <div class="space-room-subhead">
                            <h4>현재 참여자</h4>
                            <span>${occupancy.participants.length} / ${room.capacity}명</span>
                        </div>
                        <ul class="space-room-member-chips">
                            ${occupancy.participants.map((participant) => `
                                <li>${participant.name}${participant.id === currentUser.id ? " (나)" : ""}</li>
                            `).join("")}
                        </ul>
                    </section>
                ` : ""}

                ${occupancy && !isSameCohort ? `
                    <section class="space-room-private-state">
                        <h4>${occupancy.cohortName} 사용 중</h4>
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
                        >${alertEnabled ? "알림 취소" : "알림 받기"}</button>
                    </section>
                ` : ""}
            </article>
        `;
    }

    function renderMeeting() {
        return `
            <section class="space-room-meeting" aria-labelledby="space-meeting-title">
                <header class="space-room-section-head">
                    <div>
                        <span class="space-room-kicker">FIRST COME, FIRST SERVED</span>
                        <h3 id="space-meeting-title">회의실</h3>
                    </div>
                    <div class="space-room-meeting-tools">
                        <span class="space-room-alert-count">
                            공실 알림 ${state.alertRoomIds.length}건
                        </span>
                        <button
                            type="button"
                            data-space-toggle-party
                            aria-expanded="${state.partyPanelOpen}"
                        >${state.party ? "내 파티" : "파티 만들기"}</button>
                    </div>
                </header>
                ${renderPartyPanel()}
                <div class="space-room-master-detail">
                    ${renderRoomList()}
                    ${renderRoomDetail()}
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
                        <strong>0명</strong>
                        <p>여러 기수가 함께 사용하는 조용한 학습 공간입니다.</p>
                    </article>
                    <article>
                        <span>운영 상태</span>
                        <strong>정상 운영</strong>
                        <p>도서관은 좌석을 선점하거나 공실 알림을 신청하지 않습니다.</p>
                    </article>
                    <article class="space-room-library-action">
                        <span>내 상태</span>
                        <strong>${state.libraryInside ? "도서관 이용 중" : "실습실에 있음"}</strong>
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
                        ["lab", "실습실"],
                        ["meeting", "회의실"],
                        ["library", "도서관"]
                    ].map(([key, label]) => `
                        <button
                            class="${state.activeTab === key ? "is-active" : ""}"
                            type="button"
                            role="tab"
                            data-space-tab="${key}"
                            aria-selected="${state.activeTab === key}"
                        >${label}</button>
                    `).join("")}
                </nav>
                <div class="space-room-content">
                    ${state.activeTab === "lab" ? renderLab() : ""}
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
        const room = state.rooms.find((item) => item.id === roomId);

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
        state.alertRoomIds = state.alertRoomIds.filter((id) => id !== roomId);
        renderAll(`${room.name} 사용을 시작했습니다.`);
    }

    function addParticipant(roomId, participantId) {
        const room = state.rooms.find((item) => item.id === roomId);
        const candidate = cohortMembers.find((member) => member.id === participantId);

        if (!room?.occupancy || room.occupancy.ownerId !== currentUser.id || !candidate) {
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
        const toggleParty = event.target.closest("[data-space-toggle-party]");
        const partyCandidate = event.target.closest("[data-space-party-candidate]");
        const removePartyMember = event.target.closest("[data-space-remove-party-member]");
        const disbandParty = event.target.closest("[data-space-disband-party]");

        if (partyCandidate) {
            const picker = partyCandidate.closest("[data-space-party-picker]");
            const input = picker?.querySelector('input[name="memberEmail"]');
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
            const enabled = state.alertRoomIds.includes(roomId);
            state.alertRoomIds = enabled
                ? state.alertRoomIds.filter((id) => id !== roomId)
                : [...state.alertRoomIds, roomId];
            renderAll(enabled ? "공실 알림을 취소했습니다." : "공실 알림을 신청했습니다.");
        } else if (release) {
            const room = state.rooms.find((item) => item.id === release.dataset.spaceRelease);
            if (room?.occupancy?.ownerId === currentUser.id) {
                room.occupancy = null;
                room.status = "AVAILABLE";
                renderAll(`${room.name}을 반납했습니다.`);
            }
        } else if (extend) {
            const room = state.rooms.find((item) => item.id === extend.dataset.spaceExtend);
            const remaining = room?.occupancy?.expiresAt - Date.now();
            if (room?.occupancy?.ownerId === currentUser.id
                && remaining <= (30 * 60 * 1000)
                && room.occupancy.extensionCount < 2) {
                room.occupancy.expiresAt += 30 * 60 * 1000;
                room.occupancy.extensionCount += 1;
                renderAll("사용 시간을 30분 연장했습니다.");
            }
        } else if (leave) {
            const room = state.rooms.find((item) => item.id === leave.dataset.spaceLeave);
            if (room?.occupancy && room.occupancy.ownerId !== currentUser.id) {
                room.occupancy.participants = room.occupancy.participants.filter(
                    (participant) => participant.id !== currentUser.id
                );
                renderAll(`${room.name} 참여를 종료했습니다.`);
            }
        } else if (remove) {
            const room = state.rooms.find((item) => item.id === state.selectedRoomId);
            const participant = room?.occupancy?.participants.find(
                (item) => item.id === remove.dataset.spaceRemoveParticipant
            );
            if (room?.occupancy?.ownerId === currentUser.id && participant) {
                room.occupancy.participants = room.occupancy.participants.filter(
                    (item) => item.id !== participant.id
                );
                renderAll(`${participant.name} 님의 참여를 종료했습니다.`);
            }
        } else if (libraryToggle) {
            state.libraryInside = !state.libraryInside;
            renderAll(state.libraryInside ? "도서관에 입장했습니다." : "도서관에서 나왔습니다.");
        } else if (toggleParty) {
            state.partyPanelOpen = !state.partyPanelOpen;
            renderAll();
        } else if (removePartyMember) {
            const member = state.party?.members.find(
                (item) => item.id === removePartyMember.dataset.spaceRemovePartyMember
            );
            if (state.party?.masterId === currentUser.id && member) {
                state.party.members = state.party.members.filter((item) => item.id !== member.id);
                renderAll(`${member.name} 님을 파티에서 제외했습니다.`);
            }
        } else if (disbandParty && state.party?.masterId === currentUser.id) {
            const partyName = state.party.name;
            state.party = null;
            renderAll(`${partyName} 파티를 해체했습니다.`);
        }

        if (root.isConnected && event.target.closest("button")) {
            root.querySelector("[data-space-toast]")?.setAttribute("aria-atomic", "true");
        }
    }

    function handleSubmit(event) {
        const participantForm = event.target.closest("[data-space-add-participant]");
        const createPartyForm = event.target.closest("[data-space-create-party]");
        const addPartyMemberForm = event.target.closest("[data-space-add-party-member]");

        if (!participantForm && !createPartyForm && !addPartyMemberForm) {
            return;
        }

        event.preventDefault();

        if (participantForm) {
            const room = state.rooms.find((item) => item.id === state.selectedRoomId);
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
                members: [{ id: currentUser.id, name: currentUser.name }]
            };
            renderAll(`${partyName} 파티를 만들었습니다.`);
            return;
        }

        const memberEmail = String(new FormData(addPartyMemberForm).get("memberEmail") || "").trim();
        const member = cohortMembers.find((item) => item.email === memberEmail);
        if (!state.party || state.party.masterId !== currentUser.id || !member) {
            renderAll("파티원을 추가할 수 없습니다.");
            return;
        }
        if (state.party.members.length >= 8) {
            renderAll("파티는 최대 8명까지 참여할 수 있습니다.");
            return;
        }
        if (state.party.members.some((item) => item.id === member.id)) {
            renderAll("이미 파티에 참여 중인 사용자입니다.");
            return;
        }

        state.party.members.push({ id: member.id, name: member.name });
        renderAll(`${member.name} 님을 파티에 추가했습니다.`);
    }

    function handlePartySearch(event) {
        const input = event.target.closest('input[name="memberEmail"]');
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
                const room = state.rooms.find((item) => item.id === element.dataset.spaceCountdown);
                if (room?.occupancy) {
                    element.textContent = formatRemaining(room.occupancy.expiresAt);
                }
            });

            const selectedRoom = state.rooms.find((item) => item.id === state.selectedRoomId);
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
        if (["lab", "meeting", "library"].includes(options.initialTab)) {
            state.activeTab = options.initialTab;
        }

        if (!root.dataset.spaceRoomMounted) {
            root.addEventListener("click", (event) => handleAction(event, root));
            root.addEventListener("submit", handleSubmit);
            root.addEventListener("input", handlePartySearch);
            root.addEventListener("focusin", (event) => {
                event.target.closest('input[name="memberEmail"]')
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

    window.OmagotchiSpaceRoom = { mount };
})();
