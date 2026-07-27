// 홈 화면에서 갱신하는 주요 UI 요소
const timerDisplay = document.querySelector("[data-timer-display]");
const timerToggle = document.querySelector("[data-timer-toggle]");
const attendanceButton = document.querySelector("[data-attendance-button]");
const checkInTime = document.querySelector("[data-check-in-time]");
const checkOutTime = document.querySelector("[data-check-out-time]");
const earlyLeave = document.querySelector("[data-early-leave]");
const lateMinutes = document.querySelector("[data-late-minutes]");
const homeCharacter = document.querySelector("[data-home-character]");
const characterStage = document.querySelector("[data-character-stage]");
const characterInteraction = document.querySelector("[data-character-interaction]");
const characterBubble = document.querySelector("[data-character-bubble]");
const characterName = document.querySelector("[data-character-name]");
const characterLevel = document.querySelector("[data-character-level]");
const xpFill = document.querySelector("[data-xp-fill]");
const currentXpLabel = document.querySelector("[data-current-xp]");
const nextLevelLabel = document.querySelector("[data-next-level]");
const calendarGrid = document.querySelector(".calendar-grid");
const calendarTitle = document.querySelector("[data-calendar-title]");
const calendarPeriod = document.querySelector("[data-calendar-period]");
const streakCount = document.querySelector("[data-streak-count]");
const streakList = document.querySelector("[data-streak-list]");
const homeOverlayRoot = document.querySelector("[data-home-overlay-root]");

// 로그인 사용자와 캐릭터 선택 결과 복원
const currentUserEmail = sessionStorage.getItem("omagotchiEmail")
    || localStorage.getItem("omagotchiLastEmail")
    || "guest";
const selectedCharacterId = sessionStorage.getItem("omagotchiCharacterId")
    || localStorage.getItem(`omagotchiCharacterId:${currentUserEmail}`);
const selectedCharacterColorId = sessionStorage.getItem("omagotchiCharacterColorId")
    || localStorage.getItem(`omagotchiCharacterColorId:${currentUserEmail}`)
    || "original";

const selectedCharacterImage = sessionStorage.getItem("omagotchiCharacterImage")
    || localStorage.getItem(`omagotchiCharacterImage:${currentUserEmail}`)
    || "/images/characters/default/omagotchi.png";
const selectedCharacterAnimatedImage = sessionStorage.getItem("omagotchiCharacterAnimatedImage")
    || localStorage.getItem(`omagotchiCharacterAnimatedImage:${currentUserEmail}`)
    || (selectedCharacterId
        ? window.OmagotchiCharacterAssets.getEyeGif(selectedCharacterId, selectedCharacterColorId)
        : "/images/characters/default/omagotchi_eye.gif");

const storedCharacterName = sessionStorage.getItem("omagotchiCharacterName")
    || localStorage.getItem(`omagotchiCharacterName:${currentUserEmail}`)
    || "오마고치";
const selectedCharacterName = storedCharacterName
    .replace(/^\[([^\]]+)]$/, "$1")
    .trim();

if (selectedCharacterName !== storedCharacterName) {
    sessionStorage.setItem("omagotchiCharacterName", selectedCharacterName);
    localStorage.setItem(`omagotchiCharacterName:${currentUserEmail}`, selectedCharacterName);
}

// 백엔드 연동 전 사용자별 상태를 구분하기 위한 저장소 키
const attendanceKey = `omagotchiAttendance:${currentUserEmail}`;
const xpKey = `omagotchiXp:${currentUserEmail}`;
const brightnessKey = "omagotchiHomeBrightness";
const xpPerLevel = 50;
const sessionOnlyKeys = [
    "omagotchiEmail",
    "omagotchiCharacterId",
    "omagotchiCharacterName",
    "omagotchiCharacterImage",
    "omagotchiCharacterAnimatedImage",
    "omagotchiCharacterBaseImage",
    "omagotchiCharacterColorId",
    "omagotchiCharacterColorName",
    "omagotchiCharacterColor"
];

// 타이머, 레벨 효과, 커뮤니티 목록의 현재 화면 상태
let timerStatus = "idle";
let startedAt = 0;
let elapsedBeforeStart = 0;
let tickId = null;
let characterBubbleTimer = null;
let characterClickCount = 0;
let characterClickResetTimer = null;
let renderedLevel = null;
let communityFilter = "all";
let communityKeyword = "";
let communityPage = 1;
let renderedAttendanceDateKey = getLocalDateKey();
const communityPageSize = 3;

// 관리자 화면에서 저장한 기수 정보를 사용자 기수 화면에 반영
function getHomeManagedCohorts() {
    try {
        return JSON.parse(localStorage.getItem("omagotchiCohortOperations") || "[]");
    } catch {
        return [];
    }
}

function renderHomeCohortCards() {
    const managed = getHomeManagedCohorts();

    if (!managed.length) {
        return `
            <article>
                <h3>AIoT 3기</h3>
                <p>현재 참여 중인 기수입니다.</p>
                <span class="overlay-pill">5 / 24</span>
                <span class="overlay-pill">참가중</span>
            </article>`;
    }

    return managed.map((cohort) => {
        const activeMembers = cohort.members?.filter((member) => member.status === "ACTIVE").length || 0;
        return `
            <article>
                <h3>${escapeHtml(cohort.name)}</h3>
                <p>${escapeHtml(cohort.description || "가입 코드로 참가 신청할 수 있습니다.")}</p>
                <span class="overlay-pill">${activeMembers} / ${cohort.capacity}</span>
                <span class="overlay-pill">${cohort.status === "ACTIVE" ? "운영 중" : "모집 중"}</span>
            </article>`;
    }).join("");
}
const communityPosts = [
    {
        id: 1,
        type: "notice",
        title: "오늘 집중 세션 인증 올려주세요",
        content: "타이머 30분 이상 기록한 사람은 진행 탭에서 보상도 같이 받아가면 됩니다.",
        likes: 12,
        comments: 4,
        attachments: 1
    },
    {
        id: 2,
        type: "free",
        title: "회의실 B 자리 남아있나요?",
        content: "백엔드 API 명세 같이 정리할 사람 있으면 댓글 남겨주세요.",
        likes: 5,
        comments: 2,
        attachments: 0
    },
    {
        id: 3,
        type: "free",
        title: "출석 알림 Telegram ADR 초안 공유",
        content: "알림 방식과 MQ 선택 기준을 문서로 정리하고 있습니다.",
        likes: 8,
        comments: 3,
        attachments: 1
    },
    {
        id: 4,
        type: "notice",
        title: "실습실 센서 점검 일정",
        content: "금요일 오후 실습실 센서 점검이 예정되어 있습니다.",
        likes: 3,
        comments: 1,
        attachments: 0
    },
    {
        id: 5,
        type: "free",
        title: "오늘 저녁 알고리즘 스터디",
        content: "도서관 B구역에서 7시에 시작합니다.",
        likes: 7,
        comments: 6,
        attachments: 0
    }
];

// 학습 타이머: 시작 시각과 누적 시간을 기준으로 실제 경과 시간 계산
function formatDuration(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

function getElapsedSeconds() {
    if (timerStatus !== "running") {
        return elapsedBeforeStart;
    }

    return elapsedBeforeStart + Math.floor((Date.now() - startedAt) / 1000);
}
// document.title
function renderTimer() {
    const elapsed = getElapsedSeconds();
    const formattedTime = formatDuration(elapsed);

    timerDisplay.textContent = formattedTime;
    timerDisplay.setAttribute("datetime", `PT${elapsed}S`);

    document.title = `${formattedTime} - Omagotchi`;
}

// 캐릭터 반응: 타이머 상태와 클릭 동작에 맞춰 표정 대신 움직임과 대사를 변경
function getCharacterIdleMessage() {
    return timerStatus === "running"
        ? "집중하고 있어요!"
        : "오늘도 같이 공부해요!";
}

function showCharacterMessage(message, resetDelay = 2200) {
    if (!characterBubble) {
        return;
    }

    window.clearTimeout(characterBubbleTimer);
    characterBubble.textContent = message;
    characterBubble.classList.remove("is-changing");

    window.requestAnimationFrame(() => {
        characterBubble.classList.add("is-changing");
    });

    characterBubbleTimer = window.setTimeout(() => {
        characterBubble.textContent = getCharacterIdleMessage();
        characterBubble.classList.remove("is-changing");
    }, resetDelay);
}

function setCharacterStudyState(isStudying) {
    characterStage?.classList.toggle("is-studying", isStudying);
}

function startTimer() {
    timerStatus = "running";
    startedAt = Date.now();
    timerToggle.textContent = "일시정지";
    setCharacterStudyState(true);
    showCharacterMessage("집중 모드 시작!");
    tickId = window.setInterval(renderTimer, 1000);
    renderTimer();
}

function pauseTimer() {
    elapsedBeforeStart = getElapsedSeconds();
    timerStatus = "idle";
    timerToggle.textContent = "시작";
    setCharacterStudyState(false);
    showCharacterMessage("잠깐 쉬어도 괜찮아요.");
    window.clearInterval(tickId);
    renderTimer();
}

// 출결 상태: 사용자별 입실/퇴실 기록 저장 및 화면 갱신
function formatTime(date) {
    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getAttendanceHistory() {
    try {
        const savedAttendance = JSON.parse(localStorage.getItem(attendanceKey)) || {};

        // 기존 단일 출석 기록을 날짜별 저장 형식으로 한 번 변환합니다.
        if (savedAttendance.checkInAt) {
            const attendanceDate = getLocalDateKey(new Date(savedAttendance.checkInAt));
            const migratedAttendance = {
                [attendanceDate]: savedAttendance
            };

            localStorage.setItem(attendanceKey, JSON.stringify(migratedAttendance));
            return migratedAttendance;
        }

        return savedAttendance;
    } catch {
        return {};
    }
}

function saveTodayAttendance(attendance) {
    const attendanceHistory = getAttendanceHistory();
    attendanceHistory[getLocalDateKey()] = attendance;
    localStorage.setItem(attendanceKey, JSON.stringify(attendanceHistory));
}

function renderAttendance() {
    const attendanceHistory = getAttendanceHistory();
    const attendance = attendanceHistory[getLocalDateKey()] || {};
    const hasCheckIn = Boolean(attendance.checkInAt);
    const hasCheckOut = hasCheckIn && Boolean(attendance.checkOutAt);

    checkInTime.textContent = hasCheckIn
        ? formatTime(new Date(attendance.checkInAt))
        : "아직 입실 전";
    checkOutTime.textContent = hasCheckOut
        ? formatTime(new Date(attendance.checkOutAt))
        : "아직 퇴실 전";
    earlyLeave.textContent = hasCheckOut ? "0분" : "기록 없음";
    lateMinutes.textContent = hasCheckIn ? "0분" : "기록 없음";

    if (hasCheckIn && !hasCheckOut) {
        attendanceButton.textContent = "퇴실하기";
        attendanceButton.classList.add("is-checked-in");
        attendanceButton.classList.remove("is-complete");
        attendanceButton.disabled = false;
    } else if (hasCheckIn && hasCheckOut) {
        attendanceButton.textContent = "✓ 퇴실 완료";
        attendanceButton.classList.remove("is-checked-in");
        attendanceButton.classList.add("is-complete");
        attendanceButton.disabled = true;
    } else {
        attendanceButton.textContent = "입실하기";
        attendanceButton.classList.remove("is-checked-in");
        attendanceButton.classList.remove("is-complete");
        attendanceButton.disabled = false;
    }

    renderCalendar(attendanceHistory);
    renderStreak(attendanceHistory);
}

function toggleAttendance() {
    const attendanceHistory = getAttendanceHistory();
    const todayKey = getLocalDateKey();
    const attendance = attendanceHistory[todayKey] || {};

    if (attendance.checkInAt && !attendance.checkOutAt) {
        attendance.checkOutAt = new Date().toISOString();
    } else if (!attendance.checkInAt) {
        attendance.checkInAt = new Date().toISOString();
        delete attendance.checkOutAt;
    } else {
        return;
    }

    saveTodayAttendance(attendance);
    renderAttendance();
}

// 현재 월의 출석 달력을 날짜와 주말 정보에 맞춰 생성
function renderCalendar(attendanceHistory) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentMonthLabel = new Intl.DateTimeFormat("ko-KR", {
        month: "long"
    }).format(today);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const fragment = document.createDocumentFragment();

    if (calendarTitle) {
        calendarTitle.textContent = `${currentMonthLabel} 출석 기록`;
    }

    if (calendarPeriod) {
        calendarPeriod.textContent = `${currentYear}년 ${currentMonthLabel}`;
    }

    calendarGrid.setAttribute("aria-label", `${currentYear}년 ${currentMonthLabel} 출석 달력`);
    calendarGrid.querySelectorAll(".calendar-day, .calendar-blank").forEach((node) => node.remove());

    for (let index = 0; index < offset; index += 1) {
        const blank = document.createElement("span");
        blank.className = "calendar-blank";
        blank.setAttribute("aria-hidden", "true");
        fragment.append(blank);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
        const dayNode = document.createElement("span");
        dayNode.className = "calendar-day";
        dayNode.textContent = String(day);

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayNode.classList.add("is-weekend");
        }

        if (day === today.getDate()) {
            dayNode.classList.add("is-today");
        }

        const dateKey = getLocalDateKey(new Date(currentYear, currentMonth, day));
        if (attendanceHistory[dateKey]?.checkInAt) {
            dayNode.classList.add("is-present");
            dayNode.setAttribute("aria-label", `${day}일 출석`);
        }

        fragment.append(dayNode);
    }

    calendarGrid.append(fragment);
}

// 오늘을 포함한 최근 출석 기록으로 연속 출석과 7일 현황을 계산
function renderStreak(attendanceHistory) {
    if (!streakCount || !streakList) {
        return;
    }

    const hasAttendance = (date) => Boolean(
        attendanceHistory[getLocalDateKey(date)]?.checkInAt
    );
    const streakCursor = new Date();
    let currentStreak = 0;

    // 오늘 입실 전에는 어제까지 이어진 출석을 유지합니다.
    if (!hasAttendance(streakCursor)) {
        streakCursor.setDate(streakCursor.getDate() - 1);
    }

    while (hasAttendance(streakCursor)) {
        currentStreak += 1;
        streakCursor.setDate(streakCursor.getDate() - 1);
    }

    streakCount.textContent = `${currentStreak}일`;
    streakList.replaceChildren();

    const recentDates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return date;
    });

    recentDates.forEach((date, index) => {
        const item = document.createElement("li");
        const marker = document.createElement("span");
        const label = document.createElement("strong");

        if (hasAttendance(date)) {
            item.classList.add("is-active");
        }

        label.textContent = index === recentDates.length - 1
            ? "오늘"
            : `${date.getMonth() + 1}/${date.getDate()}`;

        item.append(marker, label);
        streakList.append(item);
    });
}

// 페이지를 계속 열어둔 상태에서 날짜가 바뀌면 오늘 출석을 다시 표시
function refreshAttendanceDate() {
    const currentDateKey = getLocalDateKey();

    if (currentDateKey === renderedAttendanceDateKey) {
        return;
    }

    renderedAttendanceDateKey = currentDateKey;
    renderAttendance();
}

// 화면 설정과 캐릭터 경험치 상태 관리
function setBrightness(value) {
    document.documentElement.style.setProperty("--home-brightness", `${value}%`);
    localStorage.setItem(brightnessKey, value);
}

function getStoredXp() {
    const storedXp = Number(localStorage.getItem(xpKey));
    return Number.isFinite(storedXp) && storedXp > 0 ? storedXp : 0;
}

function playLevelUpEffect() {
    const badge = characterLevel?.closest(".character-badge");

    badge?.classList.remove("is-level-up");
    homeCharacter?.classList.remove("is-level-up");

    window.requestAnimationFrame(() => {
        badge?.classList.add("is-level-up");
        homeCharacter?.classList.add("is-level-up");
    });

    window.setTimeout(() => {
        badge?.classList.remove("is-level-up");
        homeCharacter?.classList.remove("is-level-up");
    }, 1200);
}

function renderLevel(options = {}) {
    const totalXp = getStoredXp();
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const xpInLevel = totalXp % xpPerLevel;
    const progress = Math.min(100, Math.round((xpInLevel / xpPerLevel) * 100));
    const shouldAnimate = options.animate && renderedLevel !== null && level > renderedLevel;

    if (characterLevel) {
        characterLevel.textContent = `Lv ${level}`;
    }

    if (xpFill) {
        xpFill.style.width = `${progress}%`;
    }

    if (currentXpLabel) {
        currentXpLabel.textContent = `${xpInLevel}xp`;
    }

    if (nextLevelLabel) {
        nextLevelLabel.textContent = `다음 레벨까지 ${xpPerLevel - xpInLevel}xp`;
    }

    if (shouldAnimate) {
        playLevelUpEffect();
    }

    renderedLevel = level;
}

function addXp(amount) {
    const nextXp = getStoredXp() + amount;
    localStorage.setItem(xpKey, String(nextXp));
    renderLevel({ animate: true });
}

// 홈 메뉴별 오버레이 제목과 본문 템플릿
const overlayTitles = {
    help: "도움말",
    progress: "진행",
    personal: "내 정보",
    cohort: "기수",
    write: "기록",
    space: "공간",
    community: "커뮤",
    settings: "설정",
    password: "비밀번호 변경"
};

const overlayContent = {
    help: `
        <div class="overlay-card-grid">
            <article>
                <h3>입실하기</h3>
                <p>하루 학습을 시작할 때 입실을 기록합니다. 이후 퇴실 기록과 출석률 계산에 사용됩니다.</p>
            </article>
            <article>
                <h3>학습 타이머</h3>
                <p>집중 시간을 기록하고 퀘스트 진행도와 캐릭터 성장에 반영합니다.</p>
            </article>
            <article>
                <h3>공간</h3>
                <p>실습실, 회의실, 도서관처럼 사용할 공간을 선택합니다.</p>
            </article>
            <article>
                <h3>기수</h3>
                <p>참여 중인 기수와 가입 가능한 기수를 확인합니다.</p>
            </article>
        </div>
    `,
    progress: `
        <div class="overlay-tabs" aria-label="진행 탭">
            <button class="is-active" type="button" data-overlay-tab="quests">퀘스트</button>
            <button type="button" data-overlay-tab="achievements">업적</button>
            <button type="button" data-overlay-tab="leaders">랭킹</button>
            <button type="button" data-overlay-tab="timeline">타임라인</button>
            <button type="button" data-overlay-tab="stats">통계</button>
        </div>
        <section class="overlay-tab-panel is-active" data-overlay-panel="quests">
            <div class="overlay-section-label"><strong>일일</strong><span></span><em>자정에 초기화</em></div>
            <article class="overlay-quest is-claimable" data-home-quest="focus-beginner">
                <header>
                    <div>
                        <h3>집중 시작</h3>
                        <p>오늘 학습 타이머를 30분 이상 기록합니다.</p>
                    </div>
                    <strong>+50xp</strong>
                </header>
                <div class="overlay-progress-line"><span style="width: 100%"></span></div>
                <div class="overlay-quest-foot">
                    <span>49분 / 30분</span>
                    <button type="button" data-home-claim data-xp-reward="50">보상 받기</button>
                    <em>수령 완료</em>
                </div>
            </article>
            <article class="overlay-quest">
                <header>
                    <div>
                        <h3>출석 완료</h3>
                        <p>입실과 퇴실을 모두 기록합니다.</p>
                    </div>
                    <strong>+30xp</strong>
                </header>
                <div class="overlay-progress-line"><span style="width: 50%"></span></div>
                <div class="overlay-quest-foot"><span>입실 완료</span></div>
            </article>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="achievements" hidden>
            <div class="overlay-card-grid">
                <article><h3>첫 발걸음</h3><p>처음으로 출석을 완료합니다.</p></article>
                <article><h3>꾸준한 학습자</h3><p>학습 타이머 10시간을 달성합니다.</p></article>
                <article><h3>세션 마스터</h3><p>학습 세션 100회를 완료합니다.</p></article>
            </div>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="leaders" hidden>
            <ol class="overlay-list">
                <li><strong>1</strong><span>잼민</span><em>312분</em></li>
                <li><strong>2</strong><span>공부쟁이</span><em>294분</em></li>
                <li><strong>3</strong><span>디버깅이</span><em>284분</em></li>
            </ol>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="timeline" hidden>
            <div class="overlay-card-grid">
                <article><h3>입실</h3><p>오늘 09:04에 입실했습니다.</p></article>
                <article><h3>학습 세션</h3><p>49분 집중 세션을 완료했습니다.</p></article>
            </div>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="stats" hidden>
            <div class="overlay-stat-grid">
                <article><h3>오늘 집중</h3><strong>49분</strong></article>
                <article><h3>세션</h3><strong>1회</strong></article>
                <article><h3>연속 출석</h3><strong>1일</strong></article>
                <article><h3>이번 주</h3><strong>49분</strong></article>
            </div>
        </section>
    `,
    personal: `
        <div class="overlay-stat-grid">
            <article><h3>총 학습</h3><strong>${formatDuration(getElapsedSeconds())}</strong><p>현재 타이머 기준</p></article>
            <article><h3>세션</h3><strong>0회</strong><p>완료한 학습 세션</p></article>
            <article><h3>연속 출석</h3><strong>0일</strong><p>입실 기록 기준</p></article>
            <article><h3>캐릭터</h3><strong>${characterLevel?.textContent || "Lv 1"}</strong><p>${selectedCharacterName}</p></article>
            <article><h3>참여 기수</h3><strong>AIoT 3기</strong><p>5 / 24 · 참가중</p></article>
        </div>
    `,
    cohort: `
        <div class="overlay-card-grid">
            ${renderHomeCohortCards()}
        </div>
        <form class="overlay-cohort-join" data-home-cohort-form>
            <label><span>가입 코드</span><input name="cohortCode" type="text" placeholder="관리자에게 받은 코드를 입력하세요" autocomplete="off" /></label>
            <button type="submit">참가 신청</button>
            <p data-home-cohort-message>유효한 코드를 입력하면 관리자 승인 대기 상태로 등록됩니다.</p>
        </form>
    `,
    write: `
        <form class="overlay-write-form">
            <input type="text" placeholder="제목" aria-label="기록 제목" />
            <textarea placeholder="오늘 배운 내용이나 회고를 적어주세요." aria-label="기록 내용"></textarea>
            <button type="button" data-close-home-overlay>임시 저장</button>
        </form>
    `,
    space: `
        <div class="overlay-tabs" aria-label="공간 탭">
            <button class="is-active" type="button" data-overlay-tab="lab">실습실</button>
            <button type="button" data-overlay-tab="meeting">회의실</button>
            <button type="button" data-overlay-tab="library">도서관</button>
        </div>
        <section class="overlay-tab-panel is-active" data-overlay-panel="lab">
            <div class="overlay-space-lab">
                <aside>
                    <article><strong>CO₂</strong><span>410ppm</span></article>
                    <article><strong>온도</strong><span>24℃</span></article>
                    <article><strong>습도</strong><span>42%</span></article>
                </aside>
                <div class="overlay-space-stage">
                    <span class="overlay-space-capacity">참여 인원 0 / 50</span>
                    <div class="overlay-space-bubble">오늘도 집중!</div>
                </div>
            </div>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="meeting" hidden>
            <div class="overlay-room-list">
                <article><strong>1</strong><div><h3>회의실 A</h3><p>사용 가능 · 4인실</p></div><button type="button">사용하기</button></article>
                <article><strong>2</strong><div><h3>회의실 B</h3><p>사용 중 · 2 / 4<br>남은 시간 11:03</p></div><button type="button">참여하기</button><button type="button">알림</button></article>
                <article class="is-mine"><strong>3</strong><div><span>사용 중</span><h3>회의실 C</h3><p>내가 사용 중 · 남은 시간 24:10</p></div><button type="button">연장</button><button type="button">반납</button></article>
            </div>
        </section>
        <section class="overlay-tab-panel" data-overlay-panel="library" hidden>
            <div class="overlay-room-list">
                <article><strong>1</strong><div><h3>도서관 A구역</h3><p>사용 가능 · 12 / 20 좌석</p></div><button type="button">입장</button></article>
                <article><strong>2</strong><div><h3>도서관 B구역</h3><p>사용 중</p></div><button type="button">퇴장</button></article>
                <article><strong>3</strong><div><h3>도서관 C구역</h3><p>만석 · 20 / 20 좌석</p></div><button type="button">알림</button></article>
            </div>
        </section>
    `,
    community: `
        <div class="overlay-community">
            <header class="overlay-community-toolbar">
                <div class="overlay-community-tabs" aria-label="게시판 구분">
                    <button class="is-active" type="button" data-community-filter="all">전체</button>
                    <button type="button" data-community-filter="notice">공지</button>
                    <button type="button" data-community-filter="free">자유</button>
                </div>
                <label class="overlay-community-search">
                    <span>검색</span>
                    <input type="search" placeholder="제목이나 내용을 검색하세요" data-community-search />
                </label>
                <button class="overlay-community-write" type="button" aria-label="글쓰기" title="글쓰기" data-community-write>✎</button>
            </header>

            <section class="overlay-community-notice" aria-label="고정 공지">
                <strong>고정 공지</strong>
                <div>
                    <h3>7월 운영 안내와 공간 사용 규칙</h3>
                    <p>공지 게시글은 기수 관리자가 작성하고, 목록 상단에 고정할 수 있습니다.</p>
                </div>
            </section>

            <ol class="overlay-community-list" aria-label="커뮤니티 게시글 목록" data-community-list></ol>

            <nav class="overlay-community-pagination" aria-label="커뮤니티 페이지 이동">
                <button type="button" aria-label="이전 페이지" data-community-page="-1">‹</button>
                <strong data-community-page-label>1 / 1</strong>
                <button type="button" aria-label="다음 페이지" data-community-page="1">›</button>
            </nav>
        </div>
    `,
    settings: `
        <div class="overlay-settings-list">
            <label>
                <span><strong>화면 밝기</strong><em>홈 화면의 초록 배경 밝기를 조절합니다.</em></span>
                <input type="range" min="84" max="116" value="${localStorage.getItem(brightnessKey) || "100"}" data-overlay-brightness />
            </label>
            <button type="button" data-open-password-overlay>
                <span><strong>비밀번호 변경</strong><em>현재 화면에서 로그인 비밀번호를 변경합니다.</em></span>
                <span>열기</span>
            </button>
            <button class="is-danger" type="button" data-logout>
                <span><strong>로그아웃</strong><em>현재 접속 정보를 비우고 처음 화면으로 이동합니다.</em></span>
                <span>나가기</span>
            </button>
        </div>
    `,
    password: `
        <form class="overlay-write-form overlay-password-form">
            <input type="password" placeholder="현재 비밀번호" aria-label="현재 비밀번호" />
            <input type="password" placeholder="새 비밀번호" aria-label="새 비밀번호" />
            <input type="password" placeholder="새 비밀번호 확인" aria-label="새 비밀번호 확인" />
            <button type="button" data-close-home-overlay>변경하기</button>
        </form>
    `
};

// 커뮤니티 검색, 필터, 페이지 이동 및 글쓰기 처리
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getFilteredCommunityPosts() {
    const normalizedKeyword = communityKeyword.trim().toLowerCase();

    return communityPosts.filter((post) => {
        const matchesFilter = communityFilter === "all" || post.type === communityFilter;
        const matchesKeyword = !normalizedKeyword
            || post.title.toLowerCase().includes(normalizedKeyword)
            || post.content.toLowerCase().includes(normalizedKeyword);

        return matchesFilter && matchesKeyword;
    });
}

function renderCommunity() {
    const list = homeOverlayRoot?.querySelector("[data-community-list]");
    const pageLabel = homeOverlayRoot?.querySelector("[data-community-page-label]");
    const pageButtons = homeOverlayRoot?.querySelectorAll("[data-community-page]");

    if (!list || !pageLabel) {
        return;
    }

    const filteredPosts = getFilteredCommunityPosts();
    const pageCount = Math.max(1, Math.ceil(filteredPosts.length / communityPageSize));
    communityPage = Math.min(Math.max(communityPage, 1), pageCount);
    const pagePosts = filteredPosts.slice(
        (communityPage - 1) * communityPageSize,
        communityPage * communityPageSize
    );

    list.innerHTML = pagePosts.length
        ? pagePosts.map((post) => `
            <li>
                <span class="overlay-community-type${post.type === "notice" ? " is-notice" : ""}">
                    ${post.type === "notice" ? "공지" : "자유"}
                </span>
                <div>
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.content)}</p>
                </div>
                <footer>
                    <span>좋아요 ${post.likes}</span>
                    <span>댓글 ${post.comments}</span>
                    ${post.attachments ? `<span>첨부 ${post.attachments}</span>` : ""}
                </footer>
            </li>
        `).join("")
        : `
            <li class="overlay-community-empty">
                <strong>검색 결과가 없습니다.</strong>
                <p>검색어나 게시판 구분을 다시 확인해 주세요.</p>
            </li>
        `;

    pageLabel.textContent = `${communityPage} / ${pageCount}`;
    pageButtons?.forEach((button) => {
        const direction = Number(button.dataset.communityPage);
        button.disabled = direction < 0 ? communityPage === 1 : communityPage === pageCount;
    });

    homeOverlayRoot.querySelectorAll("[data-community-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.communityFilter === communityFilter);
    });
}

function openCommunityComposer() {
    const title = homeOverlayRoot?.querySelector("#home-overlay-title");
    const body = homeOverlayRoot?.querySelector(".home-overlay-body");

    if (!title || !body) {
        return;
    }

    title.textContent = "새 게시글";
    body.innerHTML = `
        <form class="overlay-community-compose" data-community-compose>
            <label>
                <span>게시판</span>
                <select name="type">
                    <option value="free">자유 게시판</option>
                    <option value="notice">공지 게시판</option>
                </select>
            </label>
            <label>
                <span>제목</span>
                <input type="text" name="title" maxlength="100" placeholder="게시글 제목을 입력하세요" required />
            </label>
            <label>
                <span>내용</span>
                <textarea name="content" maxlength="1000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required></textarea>
            </label>
            <div>
                <button type="button" data-community-cancel>취소</button>
                <button type="submit">등록하기</button>
            </div>
        </form>
    `;
    body.querySelector("input")?.focus();
}

function submitCommunityPost(form) {
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "").trim();

    if (!title || !content) {
        return;
    }

    communityPosts.unshift({
        id: Date.now(),
        type: formData.get("type") === "notice" ? "notice" : "free",
        title,
        content,
        likes: 0,
        comments: 0,
        attachments: 0
    });
    communityFilter = "all";
    communityKeyword = "";
    communityPage = 1;
    openHomeOverlay("community");
}

// 홈 화면을 유지한 채 메뉴 내용을 모달 오버레이로 전환
function closeHomeOverlay() {
    if (!homeOverlayRoot) {
        return;
    }

    homeOverlayRoot.innerHTML = "";
    homeOverlayRoot.classList.remove("is-open");
    document.body.classList.remove("has-home-overlay");
}

function openHomeOverlay(type) {
    if (!homeOverlayRoot || !overlayContent[type]) {
        return;
    }

    homeOverlayRoot.innerHTML = `
        <section class="home-overlay-backdrop" data-close-home-overlay>
            <article class="home-overlay" role="dialog" aria-modal="true" aria-labelledby="home-overlay-title">
                <button class="home-overlay-close" type="button" data-close-home-overlay aria-label="닫기">×</button>
                <header>
                    <h2 id="home-overlay-title">${overlayTitles[type]}</h2>
                </header>
                <div class="home-overlay-body">
                    ${overlayContent[type]}
                </div>
            </article>
        </section>
    `;
    homeOverlayRoot.classList.add("is-open");
    document.body.classList.add("has-home-overlay");

    if (type === "community") {
        renderCommunity();
    }

    if (type === "space") {
        const spaceCharacter = homeOverlayRoot.querySelector("[data-space-character]");

        if (spaceCharacter) {
            spaceCharacter.onerror = () => {
                spaceCharacter.onerror = null;
                spaceCharacter.src = selectedCharacterImage;
            };
        }
    }
}

function setOverlayTab(tabButton) {
    const overlay = tabButton.closest(".home-overlay");
    const tabName = tabButton.dataset.overlayTab;

    overlay.querySelectorAll("[data-overlay-tab]").forEach((button) => {
        button.classList.toggle("is-active", button === tabButton);
    });

    overlay.querySelectorAll("[data-overlay-panel]").forEach((panel) => {
        const isActive = panel.dataset.overlayPanel === tabName;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    });
}

function logout() {
    sessionOnlyKeys.forEach((key) => {
        sessionStorage.removeItem(key);
    });

    window.location.href = "/";
}

// 홈의 고정 버튼 이벤트
timerToggle?.addEventListener("click", () => {
    if (timerStatus === "running") {
        pauseTimer();
        return;
    }

    startTimer();
});

attendanceButton?.addEventListener("click", toggleAttendance);

characterInteraction?.addEventListener("click", () => {
    characterClickCount += 1;

    const messages = [
        "좋아요!",
        "같이 공부해요!",
        "한 번 더!",
        "오늘도 성장 중!"
    ];

    characterInteraction.classList.remove("is-reacting");
    window.requestAnimationFrame(() => {
        characterInteraction.classList.add("is-reacting");
    });

    if (characterClickCount === 10) {
        showCharacterMessage("그만 눌러!", 5000);
        characterClickResetTimer = window.setTimeout(() => {
            characterClickCount = 0;
            characterClickResetTimer = null;
        }, 5000);
        return;
    }

    if (characterClickCount < 10 && !characterClickResetTimer) {
        const message = messages[Math.floor(Math.random() * messages.length)];
        showCharacterMessage(message);
    }
});

characterInteraction?.addEventListener("animationend", (event) => {
    if (event.animationName === "character-play-hop") {
        characterInteraction.classList.remove("is-reacting");
    }
});

document.querySelector("[data-open-write]")?.addEventListener("click", () => {
    openHomeOverlay("write");
});

document.querySelectorAll("[data-home-overlay]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        openHomeOverlay(link.dataset.homeOverlay);
    });
});

// 동적으로 생성되는 오버레이 버튼은 상위 요소에서 한 번에 처리
homeOverlayRoot?.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-home-overlay]");
    const tabButton = event.target.closest("[data-overlay-tab]");
    const claimButton = event.target.closest("[data-home-claim]");
    const brightnessInput = event.target.closest("[data-overlay-brightness]");
    const passwordButton = event.target.closest("[data-open-password-overlay]");
    const logoutButton = event.target.closest("[data-logout]");
    const communityFilterButton = event.target.closest("[data-community-filter]");
    const communityPageButton = event.target.closest("[data-community-page]");
    const communityWriteButton = event.target.closest("[data-community-write]");
    const communityCancelButton = event.target.closest("[data-community-cancel]");

    if (closeTarget && (event.target === closeTarget || closeTarget.matches("button, a"))) {
        closeHomeOverlay();
        return;
    }

    if (tabButton) {
        setOverlayTab(tabButton);
        return;
    }

    if (communityFilterButton) {
        communityFilter = communityFilterButton.dataset.communityFilter;
        communityPage = 1;
        renderCommunity();
        return;
    }

    if (communityPageButton) {
        communityPage += Number(communityPageButton.dataset.communityPage);
        renderCommunity();
        return;
    }

    if (communityWriteButton) {
        openCommunityComposer();
        return;
    }

    if (communityCancelButton) {
        openHomeOverlay("community");
        return;
    }

    if (claimButton) {
        const quest = claimButton.closest(".overlay-quest");
        quest?.classList.add("is-claimed");
        addXp(Number(claimButton.dataset.xpReward) || 0);
        claimButton.disabled = true;
        return;
    }

    if (brightnessInput) {
        setBrightness(brightnessInput.value);
        return;
    }

    if (passwordButton) {
        openHomeOverlay("password");
        return;
    }

    if (logoutButton) {
        logout();
    }
});

// 슬라이더와 검색창처럼 입력 즉시 반영되는 이벤트
homeOverlayRoot?.addEventListener("input", (event) => {
    const brightnessInput = event.target.closest("[data-overlay-brightness]");
    const communitySearch = event.target.closest("[data-community-search]");

    if (communitySearch) {
        communityKeyword = communitySearch.value;
        communityPage = 1;
        renderCommunity();
        return;
    }

    if (brightnessInput) {
        setBrightness(brightnessInput.value);
    }
});

// 커뮤니티 글쓰기와 기수 가입 코드 제출 처리
homeOverlayRoot?.addEventListener("submit", (event) => {
    const communityForm = event.target.closest("[data-community-compose]");
    const cohortForm = event.target.closest("[data-home-cohort-form]");

    if (cohortForm) {
        event.preventDefault();
        const code = cohortForm.cohortCode.value.trim().toUpperCase();
        const message = cohortForm.querySelector("[data-home-cohort-message]");
        const managed = getHomeManagedCohorts();
        const cohort = managed.find((item) => (
            item.joinCode?.value === code
            && item.joinCode?.status === "ACTIVE"
            && (!item.joinCode.expiresAt || item.joinCode.expiresAt >= new Date().toISOString().slice(0, 10))
        ));

        if (!cohort) {
            message.textContent = "사용할 수 없거나 만료된 가입 코드입니다.";
            return;
        }

        let applications = [];
        try {
            applications = JSON.parse(localStorage.getItem("omagotchiCohortApplications") || "[]");
        } catch {
            applications = [];
        }

        const duplicate = applications.some((application) => (
            application.cohortId === cohort.id
            && application.userId === currentUserEmail
            && application.status === "PENDING"
        ));

        if (duplicate) {
            message.textContent = `${cohort.name} 참가 승인을 기다리고 있습니다.`;
            return;
        }

        applications.push({
            id: `application-${Date.now()}`,
            cohortId: cohort.id,
            userId: currentUserEmail,
            name: sessionStorage.getItem("omagotchiUsername") || currentUserEmail.split("@")[0],
            email: currentUserEmail,
            requestedAt: new Date().toLocaleString("ko-KR", { hour12: false }),
            status: "PENDING"
        });
        localStorage.setItem("omagotchiCohortApplications", JSON.stringify(applications));
        message.textContent = `${cohort.name} 참가 신청이 완료되었습니다. 관리자 승인을 기다려주세요.`;
        cohortForm.reset();
        return;
    }

    if (!communityForm) {
        return;
    }

    event.preventDefault();
    submitCommunityPost(communityForm);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeHomeOverlay();
    }
});

// 저장된 사용자 설정을 적용한 뒤 최초 화면 렌더링
if (homeCharacter) {
    homeCharacter.onerror = () => {
        homeCharacter.onerror = null;
        homeCharacter.src = selectedCharacterImage;
    };
    homeCharacter.src = selectedCharacterAnimatedImage;
}

if (characterName) {
    characterName.textContent = selectedCharacterName;
}

const savedBrightness = localStorage.getItem(brightnessKey) || "100";
setBrightness(savedBrightness);
renderLevel();
renderTimer();
renderAttendance();

window.setInterval(refreshAttendanceDate, 30_000);
window.addEventListener("focus", refreshAttendanceDate);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        refreshAttendanceDate();
    }
});
