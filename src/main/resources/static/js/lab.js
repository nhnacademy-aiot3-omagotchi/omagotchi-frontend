// 실습실 화면 요소
const overlayRoot = document.querySelector("[data-overlay-root]");
const workspace = document.querySelector("[data-workspace]");
const speech = document.querySelector("[data-lab-speech]");
const characterImage = document.querySelector("[data-lab-character]");
const roomWidget = document.querySelector("[data-room-widget]");
const roomName = document.querySelector("[data-room-name]");

// 현재 사용자 목업 상태
const user = {
    id: sessionStorage.getItem("omagotchiEmail")
        || localStorage.getItem("omagotchiLastEmail")
        || "user@example.com",
    cohort: "AIot 3기",
    space: localStorage.getItem("omagotchiRoom") || "실습실",
    status: "WAITING"
};

// 선택된 캐릭터 정보
const selectedCharacter = {
    name: sessionStorage.getItem("omagotchiCharacterName") || localStorage.getItem(`omagotchiCharacterName:${user.id}`) || "오마고치",
    image: sessionStorage.getItem("omagotchiCharacterImage") || localStorage.getItem(`omagotchiCharacterImage:${user.id}`) || "/images/normal_character.png"
};

// 방 이동
const roomLabels = {
    lab: "실습실",
    meeting: "회의실",
    library: "도서관"
};
const roomParticles = {
    lab: "로",
    meeting: "로",
    library: "으로"
};

// 기수 가입 목업 데이터
const cohorts = [
    {
        id: "aiot-3",
        name: "AIot 3기",
        capacity: 24,
        code: "AIOT3",
        status: "open",
        members: ["user01", "minji", "hyeon", "jisu", "seung"]
    },
    {
        id: "backend-7",
        name: "Backend 7기",
        capacity: 20,
        code: "BACK7",
        status: "open",
        members: ["spring01", "java02", "api03"]
    },
    {
        id: "frontend-5",
        name: "Frontend 5기",
        capacity: 18,
        code: "FRONT5",
        status: "full",
        members: ["css01", "react02", "pixel03", "ui04", "html05", "js06", "dom07", "vite08", "figma09", "web10", "a11y11", "spa12", "state13", "hook14", "test15", "grid16", "flex17", "asset18"]
    },
    {
        id: "cloud-2",
        name: "Cloud 2기",
        capacity: 16,
        code: "CLOUD2",
        status: "expired",
        members: ["docker01", "kube02", "linux03"]
    },
    {
        id: "aiot-4",
        name: "AIot 4기",
        capacity: 24,
        code: "AIOT4",
        status: "open",
        members: ["sensor01", "edge02"]
    }
];

// 타이머/기수 선택 상태
let timerState = "idle";
let timerStartedAt = 0;
let timerElapsedBeforeStart = 0;
let timerTickId = null;
let memoRecords = [];
let selectedCohortId = cohorts[0].id;

// 말풍선 메시지 변경
function setSpeech(message) {
    speech.innerHTML = message;
}

// 오버레이 교체
function setOverlay(html) {
    overlayRoot.innerHTML = html;
    overlayRoot.classList.toggle("has-overlay", Boolean(html));
}

// 오버레이 닫기
function closeOverlay() {
    setOverlay("");
}

// 방 이동 처리
function setRoom(roomKey, statusMessage) {
    const room = roomLabels[roomKey] || roomLabels.lab;

    user.space = room;
    localStorage.setItem("omagotchiRoom", room);
    roomName.textContent = room;
    workspace.classList.remove("is-lab", "is-meeting", "is-library", "is-away");
    workspace.classList.add(`is-${roomKey}`);

    if (statusMessage) {
        setSpeech(statusMessage);
    }
}

// 방 이름에서 키 찾기
function getRoomKeyByLabel(label) {
    return Object.entries(roomLabels).find((entry) => entry[1] === label)?.[0] || "lab";
}

// 비밀번호 목업 저장소 보장
function ensureUserPassword() {
    const key = `omagotchiPassword:${user.id}`;

    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, sessionStorage.getItem("omagotchiLoginPassword") || "1234");
    }

    return key;
}

// 설정 창 렌더링
function renderSettingsOverlay() {
    setOverlay(`
        <section class="settings-overlay" aria-label="설정">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <aside class="settings-side">
                <div class="profile-medallion">
                    <img src="${selectedCharacter.image}" alt="" />
                </div>
                <button class="side-bottom-button" type="button" data-logout>로그아웃</button>
            </aside>
            <section class="settings-main">
                <h2 class="overlay-title">설정</h2>
                <div class="settings-card">
                    <button class="panel-button edit-button" type="button">수정</button>
                    <dl class="user-info">
                        <div>
                            <dt>사용자 Id:</dt>
                            <dd>${user.id}</dd>
                        </div>
                        <div>
                            <dt>소속:</dt>
                            <dd>NHN Academy</dd>
                        </div>
                        <div>
                            <dt>기수:</dt>
                            <dd>${user.cohort}</dd>
                        </div>
                        <div>
                            <dt>캐릭터:</dt>
                            <dd>${selectedCharacter.name}</dd>
                        </div>
                    </dl>
                    <button class="change-password-button" type="button" data-password-view>비밀번호 변경</button>
                </div>
            </section>
        </section>
    `);
}

// 비밀번호 변경 창 렌더링
function renderPasswordOverlay() {
    setOverlay(`
        <section class="password-overlay" aria-label="비밀번호 변경">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <aside class="password-side">
                <div class="profile-medallion">
                    <img src="${selectedCharacter.image}" alt="" />
                </div>
                <button class="side-bottom-button" type="button" data-settings-view>뒤로가기</button>
            </aside>
            <section class="password-main">
                <h2 class="overlay-title">비밀번호 변경</h2>
                <div class="password-card">
                    <form class="password-form" data-password-form>
                        <input type="password" name="currentPassword" placeholder="기존 비밀번호" />
                        <input type="password" name="newPassword" placeholder="새 비밀번호" />
                        <input type="password" name="confirmPassword" placeholder="새 비밀번호 확인" />
                        <p class="password-error" data-password-error></p>
                        <button type="submit">변경</button>
                    </form>
                </div>
            </section>
        </section>
    `);
}

// 터미널 창 렌더링
function renderTerminalOverlay() {
    const terminalStatus = user.status === "PRESENT"
        ? "입실 완료"
        : user.status === "OUT"
            ? "퇴실 완료"
            : "READY";
    const terminalLog = user.status === "PRESENT"
        ? "&gt; 입실 완료. 현재 실습실에 접속 중"
        : user.status === "OUT"
            ? "&gt; 퇴실 완료. 다음 입실을 기다리는 중"
            : "&gt; enter 키 또는 입실하기로 실습실에 접속";

    setOverlay(`
        <section class="terminal-card" aria-label="출석 터미널">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <header class="terminal-header">
                <span class="terminal-dot"></span>
                <strong>LAB ACCESS TERMINAL</strong>
            </header>
            <div class="terminal-body">
                <dl class="terminal-lines">
                    <div>
                        <dt>USER</dt>
                        <dd>${user.id}</dd>
                    </div>
                    <div>
                        <dt>COHART</dt>
                        <dd>${user.cohort}</dd>
                    </div>
                    <div>
                        <dt>SPACE</dt>
                        <dd>${user.space}</dd>
                    </div>
                </dl>
                <div class="terminal-state">
                    <span>STATUS</span>
                    <strong data-terminal-status>${terminalStatus}</strong>
                </div>
                <p class="terminal-log" data-terminal-log>${terminalLog}</p>
            </div>
            <div class="terminal-actions">
                <button type="button" data-checkin>입실하기</button>
                <button type="button" data-toggle-room-widget>방 이동</button>
                <button type="button" data-checkout>퇴실하기</button>
            </div>
        </section>
    `);
}

// 입실 처리
function handleCheckin() {
    user.status = "PRESENT";
    roomWidget.classList.add("is-visible");
    setRoom("lab", "출석 체크 완료");

    const terminalStatus = document.querySelector("[data-terminal-status]");
    const terminalLog = document.querySelector("[data-terminal-log]");

    if (terminalStatus) {
        terminalStatus.textContent = "입실 완료";
    }

    if (terminalLog) {
        terminalLog.textContent = "> 입실 완료. 현재 실습실에 접속 중";
    }
}

// 퇴실 처리
function handleCheckout() {
    user.status = "OUT";
    stopTimer();
    timerState = "idle";
    timerElapsedBeforeStart = 0;
    memoRecords = [];
    setSpeech("퇴실 완료");
    roomWidget.classList.remove("is-visible");
    workspace.classList.remove("is-away");
    renderTerminalOverlay();

    const terminalStatus = document.querySelector("[data-terminal-status]");
    const terminalLog = document.querySelector("[data-terminal-log]");

    if (terminalStatus) {
        terminalStatus.textContent = "퇴실 완료";
    }

    if (terminalLog) {
        terminalLog.textContent = "> 퇴실 완료. 다음 입실을 기다리는 중";
    }
}

// 타이머 표시 형식
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    return `${hours}: ${minutes}: ${seconds}`;
}

// 현재 타이머 시간 계산
function getTimerElapsed() {
    if (timerState !== "running") {
        return timerElapsedBeforeStart;
    }

    return timerElapsedBeforeStart + Date.now() - timerStartedAt;
}

// 타이머 화면 갱신
function updateTimerDisplay() {
    const display = document.querySelector("[data-timer-display]");

    if (display) {
        display.textContent = formatTime(getTimerElapsed());
    }
}

// 타이머 정지
function stopTimer() {
    if (timerTickId) {
        clearInterval(timerTickId);
        timerTickId = null;
    }
}

// 타이머 시작/재개
function startTimer() {
    if (timerState === "running") {
        return;
    }

    timerState = "running";
    timerStartedAt = Date.now();
    stopTimer();
    timerTickId = setInterval(updateTimerDisplay, 250);
    workspace.classList.remove("is-away");
    workspace.classList.add(`is-${getRoomKeyByLabel(user.space)}`);
    setSpeech("학습중");
    renderTimerOverlay();
}

// 타이머 일시정지
function pauseTimer() {
    if (timerState !== "running") {
        return;
    }

    timerElapsedBeforeStart = getTimerElapsed();
    timerState = "paused";
    stopTimer();
    workspace.classList.remove("is-lab", "is-meeting", "is-library");
    workspace.classList.add("is-away");
    setSpeech("외출");
    renderTimerOverlay();
}

// 타이머 초기화
function resetTimer() {
    timerState = "idle";
    timerElapsedBeforeStart = 0;
    stopTimer();
    setSpeech("타이머 초기화");
    renderTimerOverlay();
}

// 학습 기록 추가
function addMemoRecord() {
    const recordedAt = new Date().toLocaleTimeString("ko-KR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    const record = {
        time: formatTime(getTimerElapsed()),
        createdAt: recordedAt
    };

    memoRecords.push(record);
    setSpeech("기록 완료");

    if (overlayRoot.querySelector(".timer-card")) {
        renderTimerOverlay();
    }
}

// 타이머 창 렌더링
function renderTimerOverlay() {
    const isRunning = timerState === "running";
    const isPaused = timerState === "paused";
    const primaryControl = isRunning
        ? `
            <button class="timer-icon-button" type="button" data-pause aria-label="일시정지">
                <img src="/images/app/pause.png" alt="" />
            </button>
        `
        : `
            <button class="timer-icon-button" type="button" data-start aria-label="${isPaused ? "계속" : "시작"}">
                <img src="/images/app/play.png" alt="" />
            </button>
        `;

    setOverlay(`
        <section class="timer-card" aria-label="학습 타이머">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <div class="timer-device">
                <div class="timer-screen">
                    <p class="timer-label">${isRunning ? "학습중" : isPaused ? "일시정지" : "학습 시간"}</p>
                    <div class="timer-display" data-timer-display>${formatTime(getTimerElapsed())}</div>
                </div>
                <div class="timer-slot"></div>
                <span class="timer-led"></span>
                <span class="timer-cross"></span>
                <span class="timer-dot timer-dot-blue"></span>
                <span class="timer-dot timer-dot-green"></span>
                <span class="timer-dot timer-dot-red"></span>
                <span class="timer-bar timer-bar-left"></span>
                <span class="timer-bar timer-bar-right"></span>
                <div class="timer-controls">
                    ${primaryControl}
                    <button class="timer-icon-button" type="button" data-record aria-label="기록">
                        <img src="/images/app/pencil.png" alt="" />
                    </button>
                    <button class="timer-text-button" type="button" data-reset>초기화</button>
                </div>
                <p class="timer-note-count">NOTE ${memoRecords.length}</p>
            </div>
        </section>
    `);

    if (timerState === "running") {
        updateTimerDisplay();
    }
}

// 노트 창 렌더링
function renderNoteOverlay() {
    const items = memoRecords.length
        ? memoRecords.map((record, index) => `
            <li>
                <span>${index + 1}. ${record.time}</span>
                <small>${record.createdAt}</small>
            </li>
        `).join("")
        : "<li><span>아직 기록이 없습니다</span><small>타이머에서 pencil을 눌러 기록</small></li>";

    setOverlay(`
        <section class="note-card" aria-label="학습 기록 노트">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <header class="note-header">
                <img src="/images/app/note.png" alt="" />
                <h2>학습 기록</h2>
            </header>
            <ol class="note-list">${items}</ol>
        </section>
    `);
}

// 퀘스트 창 렌더링
function renderQuestOverlay() {
    setOverlay(`
        <section class="quest-card" aria-label="퀘스트">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <header class="quest-header">
                <img src="/images/app/quest.png" alt="" />
                <h2>QUEST</h2>
            </header>
            <ul class="quest-list">
                <li><span>오늘 출석하기</span><strong>${user.status === "PRESENT" ? "완료" : "대기"}</strong></li>
                <li><span>학습 타이머 시작</span><strong>${timerState === "running" ? "진행중" : "대기"}</strong></li>
                <li><span>학습 기록 남기기</span><strong>${memoRecords.length > 0 ? "완료" : "대기"}</strong></li>
            </ul>
        </section>
    `);
}

// 가입한 기수 읽기
function getJoinedCohortIds() {
    const stored = localStorage.getItem(`omagotchiJoinedCohorts:${user.id}`);

    try {
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// 가입한 기수 저장
function setJoinedCohortIds(cohortIds) {
    localStorage.setItem(`omagotchiJoinedCohorts:${user.id}`, JSON.stringify(cohortIds));
}

// 신청한 기수 읽기
function getRequestedCohortIds() {
    const stored = localStorage.getItem(`omagotchiRequestedCohorts:${user.id}`);

    try {
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// 신청한 기수 저장
function setRequestedCohortIds(cohortIds) {
    localStorage.setItem(`omagotchiRequestedCohorts:${user.id}`, JSON.stringify(cohortIds));
}

// 기수 상태 라벨
function getCohortStatusLabel(cohort) {
    const joinedIds = getJoinedCohortIds();
    const requestedIds = getRequestedCohortIds();

    if (joinedIds.includes(cohort.id) || cohort.members.includes(user.id)) {
        return "참가중";
    }

    if (requestedIds.includes(cohort.id)) {
        return "승인 대기";
    }

    if (cohort.status === "expired") {
        return "만료";
    }

    if (getCohortMembers(cohort).length >= cohort.capacity || cohort.status === "full") {
        return "마감";
    }

    return "신청 가능";
}

// 기수 참여자 목록
function getCohortMembers(cohort) {
    const joinedIds = getJoinedCohortIds();

    if ((joinedIds.includes(cohort.id) || cohort.members.includes(user.id)) && !cohort.members.includes(user.id)) {
        return [...cohort.members, user.id];
    }

    return cohort.members;
}

// 기수 가입 창 렌더링
function renderCohartOverlay(message = "참가할 기수를 선택하세요") {
    const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId) || cohorts[0];
    const selectedMembers = getCohortMembers(selectedCohort);

    setOverlay(`
        <section class="cohart-card" aria-label="기수 가입">
            <button class="cohart-user-list-button" type="button" data-user-list aria-label="참여자 보기">
                <img src="/images/app/userList.png" alt="" />
                <span>${selectedMembers.length}/${selectedCohort.capacity}</span>
            </button>
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <header class="cohart-header">
                <img src="/images/app/cohart.png" alt="" />
                <div>
                    <h2>기수 가입</h2>
                    <p>관리자가 등록한 기수 목록에서 참가 신청</p>
                </div>
            </header>
            <div class="cohart-layout">
                <section class="cohart-list-panel" aria-label="참가할 기수 목록">
                    <h3>참가할 기수</h3>
                    <div class="cohart-list">
                        ${cohorts.map((cohort) => `
                            <button
                                    class="cohart-item ${cohort.id === selectedCohort.id ? "is-selected" : ""}"
                                    type="button"
                                data-select-cohort="${cohort.id}"
                            >
                                <span>${cohort.name}</span>
                                <small>${getCohortMembers(cohort).length}/${cohort.capacity}</small>
                                <strong>${getCohortStatusLabel(cohort)}</strong>
                            </button>
                        `).join("")}
                    </div>
                </section>
                <section class="cohart-detail-panel" aria-label="기수 코드 입력">
                    <div class="cohart-summary">
                        <h3>${selectedCohort.name}</h3>
                        <p>정원 ${selectedMembers.length}/${selectedCohort.capacity}</p>
                        <strong>${getCohortStatusLabel(selectedCohort)}</strong>
                    </div>
                    <form class="cohart-form" data-cohart-form>
                        <label>
                            <span>가입 코드</span>
                            <input name="cohortCode" type="text" placeholder="코드를 입력하세요" autocomplete="off" />
                        </label>
                        <button type="submit">참가 신청</button>
                    </form>
                    <p class="cohart-message" data-cohart-message>${message}</p>
                </section>
            </div>
        </section>
    `);
}

// 참여자 목록 창 렌더링
function renderUserListOverlay() {
    const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId) || cohorts[0];
    const selectedMembers = getCohortMembers(selectedCohort);

    setOverlay(`
        <section class="user-list-card" aria-label="참여자 목록">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <header class="user-list-header">
                <img src="/images/app/userList.png" alt="" />
                <div>
                    <h2>참여자 목록</h2>
                    <p>${selectedCohort.name} ${selectedMembers.length}/${selectedCohort.capacity}</p>
                </div>
            </header>
            <ul class="user-list">
                ${selectedMembers.map((memberId) => `
                    <li class="${memberId === user.id ? "is-me" : ""}">
                        <span class="user-avatar">${memberId.slice(0, 1).toUpperCase()}</span>
                        <strong>${memberId}</strong>
                        <small>${memberId === user.id ? "나" : "참여자"}</small>
                    </li>
                `).join("")}
            </ul>
            <button class="user-list-back" type="button" data-cohart-view>기수 가입으로</button>
        </section>
    `);
}

// 기수 가입 처리
function joinSelectedCohort(code) {
    const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId);
    const joinedIds = getJoinedCohortIds();
    const requestedIds = getRequestedCohortIds();

    if (!selectedCohort) {
        renderCohartOverlay("선택한 기수를 찾을 수 없습니다");
        return;
    }

    if (joinedIds.includes(selectedCohort.id) || selectedCohort.members.includes(user.id)) {
        renderCohartOverlay("중복 가입은 불가능입니다");
        setSpeech("이미 참가한 기수야");
        return;
    }

    if (requestedIds.includes(selectedCohort.id)) {
        renderCohartOverlay("이미 참가 신청한 기수입니다");
        setSpeech("관리자 승인을 기다리는 중이야");
        return;
    }

    if (selectedCohort.status === "expired") {
        renderCohartOverlay("만료된 코드입니다");
        setSpeech("만료된 코드야");
        return;
    }

    if (getCohortMembers(selectedCohort).length >= selectedCohort.capacity || selectedCohort.status === "full") {
        renderCohartOverlay("정원이 마감되었습니다");
        setSpeech("정원이 다 찼어");
        return;
    }

    if (code.trim().toUpperCase() !== selectedCohort.code) {
        renderCohartOverlay("잘못된 코드입니다");
        setSpeech("코드가 틀렸어");
        return;
    }

    setRequestedCohortIds([...requestedIds, selectedCohort.id]);
    renderCohartOverlay("참가 신청 완료 - 승인 대기");
    setSpeech("관리자 승인을 기다려줘");
}

// 폴더 창 렌더링
function renderFolderOverlay() {
    setOverlay(`
        <section class="folder-card" aria-label="폴더">
            <button class="overlay-close" type="button" data-close-overlay>닫기</button>
            <div class="folder-grid">
                <img src="/images/app/Codex.png" alt="Codex" />
                <img src="/images/app/message.png" alt="Message" />
                <img src="/images/app/mySQL.png" alt="MySQL" />
                <img src="/images/app/postgreSQL.png" alt="PostgreSQL" />
                <img src="/images/app/steam.png" alt="Steam">
            </div>
        </section>
    `);
}

// 하단 앱 버튼 처리
document.querySelector(".lab-dock").addEventListener("click", (event) => {
    const button = event.target.closest(".dock-button");

    if (!button || button.classList.contains("is-passive")) {
        return;
    }

    const app = button.dataset.app;

    if (app === "setting") {
        renderSettingsOverlay();
    }

    if (app === "terminal") {
        renderTerminalOverlay();
    }

    if (app === "vscode") {
        setSpeech("Hello World!");
    }

    if (app === "intellij") {
        setSpeech('System.out.println<br />("Omagotchi");');
    }

    if (app === "github") {
        setSpeech("냐용!");
    }

    if (app === "finder") {
        setSpeech("뭘 찾고 싶은건데?");
    }

    if (app === "timer") {
        renderTimerOverlay();
    }

    if (app === "note") {
        renderNoteOverlay();
    }

    if (app === "quest") {
        renderQuestOverlay();
    }

    if (app === "cohart") {
        renderCohartOverlay();
    }

    if (app === "userList") {
        renderUserListOverlay();
    }

    if (app === "folder") {
        renderFolderOverlay();
    }
});

// 오버레이 내부 클릭 처리
overlayRoot.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-overlay]")) {
        closeOverlay();
    }

    if (event.target.matches("[data-logout]")) {
        sessionStorage.removeItem("omagotchiEmail");
        sessionStorage.removeItem("omagotchiLoginPassword");
        window.location.href = "/login";
    }

    if (event.target.matches("[data-password-view]")) {
        renderPasswordOverlay();
    }

    if (event.target.matches("[data-settings-view]")) {
        renderSettingsOverlay();
    }

    if (event.target.matches("[data-checkin]")) {
        handleCheckin();
    }

    if (event.target.matches("[data-checkout]")) {
        handleCheckout();
    }

    if (event.target.matches("[data-toggle-room-widget]")) {
        roomWidget.classList.toggle("is-visible");
        setSpeech("이동할 방을 골라줘");
    }

    if (event.target.closest("[data-start]")) {
        startTimer();
    }

    if (event.target.closest("[data-pause]")) {
        pauseTimer();
    }

    if (event.target.closest("[data-reset]")) {
        resetTimer();
    }

    if (event.target.closest("[data-record]")) {
        addMemoRecord();
    }

    if (event.target.closest("[data-user-list]")) {
        renderUserListOverlay();
    }

    if (event.target.closest("[data-cohart-view]")) {
        renderCohartOverlay("코드를 입력하세요");
    }

    const cohortButton = event.target.closest("[data-select-cohort]");

    if (cohortButton) {
        selectedCohortId = cohortButton.dataset.selectCohort;
        renderCohartOverlay("코드를 입력하세요");
    }
});

// 오버레이 폼 제출 처리
overlayRoot.addEventListener("submit", (event) => {
    if (event.target.matches("[data-cohart-form]")) {
        event.preventDefault();
        joinSelectedCohort(event.target.cohortCode.value);
        return;
    }

    if (!event.target.matches("[data-password-form]")) {
        return;
    }

    event.preventDefault();

    const form = event.target;
    const error = form.querySelector("[data-password-error]");
    const currentPassword = form.currentPassword.value.trim();
    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();
    const passwordKey = ensureUserPassword();
    const storedPassword = localStorage.getItem(passwordKey);

    if (currentPassword !== storedPassword) {
        error.textContent = "기존 비밀번호가 맞지 않습니다.";
        setSpeech("기존 비밀번호를 확인해줘");
        return;
    }

    if (!newPassword || newPassword === storedPassword) {
        error.textContent = "새 비밀번호는 기존 비밀번호와 달라야 합니다.";
        setSpeech("새 비밀번호를 다시 정해줘");
        return;
    }

    if (newPassword !== confirmPassword) {
        error.textContent = "새 비밀번호 확인이 일치하지 않습니다.";
        setSpeech("확인 값이 달라");
        return;
    }

    localStorage.setItem(passwordKey, newPassword);
    form.reset();
    error.textContent = "";
    setSpeech("비밀번호가 변경되었습니다");
});

// 키보드 단축 처리
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeOverlay();
    }

    if (event.key === "Enter" && overlayRoot.querySelector(".terminal-card")) {
        handleCheckin();
    }
});

// 방 이동 버튼 처리
document.querySelectorAll("[data-room-target]").forEach((button) => {
    button.addEventListener("click", () => {
        const roomKey = button.dataset.roomTarget;
        setRoom(roomKey, `${roomLabels[roomKey]}${roomParticles[roomKey]} 이동`);
    });
});

// 실습실 초기화
characterImage.src = selectedCharacter.image;
characterImage.alt = `${selectedCharacter.name} 캐릭터`;
roomName.textContent = user.space;
workspace.classList.add("is-lab");
ensureUserPassword();
