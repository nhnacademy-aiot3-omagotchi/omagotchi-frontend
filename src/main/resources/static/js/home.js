import { createAttendance } from "./home/attendance.js";
import { createBgmPlayer } from "./home/bgm.js";
import { createCharacter } from "./home/character.js";
import { createLevel } from "./home/level.js";
import { createPresence } from "./home/presence.js";
import { createStudyRecords } from "./home/studyRecords.js?v=20260812-1";
import { createTimer } from "./home/timer.js";
import { escapeHtml, formatDuration, getLocalDateKey } from "./home/utils.js";

const timerDisplay = document.querySelector("[data-timer-display]");
const timerToggle = document.querySelector("[data-timer-toggle]");
const attendanceButton = document.querySelector("[data-attendance-button]");
const checkInTime = document.querySelector("[data-check-in-time]");
const checkOutTime = document.querySelector("[data-check-out-time]");
const earlyLeave = document.querySelector("[data-early-leave]");
const lateMinutes = document.querySelector("[data-late-minutes]");
const homeCharacter = document.querySelector("[data-home-character]");
const characterWing = document.querySelector("[data-character-wing]");
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
const calendarPrev = document.querySelector("[data-calendar-prev]");
const calendarNext = document.querySelector("[data-calendar-next]");
const streakCount = document.querySelector("[data-streak-count]");
const streakList = document.querySelector("[data-streak-list]");
const homeOverlayRoot = document.querySelector("[data-home-overlay-root]");
const presenceHud = document.querySelector("[data-presence-hud]");
const presenceTrigger = document.querySelector("[data-presence-trigger]");
const presencePanel = document.querySelector("[data-presence-panel]");
const presenceCount = document.querySelector("[data-presence-count]");
const presenceCapacity = document.querySelector("[data-presence-capacity]");
const presenceSearch = document.querySelector("[data-presence-search]");
const presenceList = document.querySelector("[data-presence-list]");
const presenceRefresh = document.querySelector("[data-presence-refresh]");
const presenceClose = document.querySelector("[data-presence-close]");
const presenceUpdated = document.querySelector("[data-presence-updated]");
const bgmPlayerRoot = document.querySelector("[data-bgm-player]");
const homePage = document.querySelector(".home-page");
const musicToggle = document.querySelector("[data-home-music-toggle]");
const musicClose = document.querySelector("[data-home-music-close]");
const attendancePanelToggle = document.querySelector("[data-attendance-panel-toggle]");
const attendancePanelClose = document.querySelector("[data-attendance-panel-close]");
const chatToggle = document.querySelector(".home-chat-toggle");
const homeToast = document.querySelector("[data-home-toast]");
const attendanceDetail = document.querySelector("[data-attendance-panel-toggle]")?.getAttribute("aria-controls")
    ? document.getElementById(document.querySelector("[data-attendance-panel-toggle]").getAttribute("aria-controls"))
    : null;

const currentProfile = window.OmagotchiProfile || {};
const currentCharacter = currentProfile.currentCharacter || {};
const currentUserEmail = "current-user";
const currentUserName = currentProfile.nickname || currentCharacter.nickname || "나";
const selectedCharacterId = currentCharacter.type || "study";
const selectedCharacterColorId = currentCharacter.colorId || "original";
const selectedCharacterImage = currentCharacter.assetKey
    ? `/images/characters/${currentCharacter.assetKey}.png`
    : window.OmagotchiCharacterAssets.getPng(selectedCharacterId, selectedCharacterColorId);
const selectedCharacterAnimatedImage = window.OmagotchiCharacterAssets
    .getEyeGif(selectedCharacterId, selectedCharacterColorId);
const selectedCharacterName = currentCharacter.name || "오마고치";
const displayCharacterName = currentCharacter.nickname || currentUserName;

const studyRecordsKey = `omagotchiStudyRecords:${currentUserEmail}`;
const timerKey = `omagotchiStudyTimer:${currentUserEmail}`;
const sessionOnlyKeys = [
    "omagotchiEmail",
    "omagotchiUsername",
    "omagotchiCharacterId",
    "omagotchiCharacterName",
    "omagotchiCharacterImage",
    "omagotchiCharacterAnimatedImage",
    "omagotchiCharacterBaseImage",
    "omagotchiCharacterColorId",
    "omagotchiCharacterColorName",
    "omagotchiCharacterColor"
];
const api = window.OmagotchiApi;

let communityFilter = "all";
let communityKeyword = "";
let communityPage = 1;
const communityPageSize = 3;

function getHomeManagedCohorts() {
    return currentProfile.approvedCohort ? [currentProfile.approvedCohort] : [];
}

function renderHomeCohortCards() {
    const managed = getHomeManagedCohorts();

    if (!managed.length) {
        return `
            <article>
                <h3>참여 기수 없음</h3>
                <p>승인된 기수 정보가 없습니다.</p>
                <span class="overlay-pill">대기</span>
            </article>`;
    }

    return managed.map((cohort) => {
        return `
            <article>
                <h3>${escapeHtml(cohort.name)}</h3>
                <p>${escapeHtml(`${cohort.startDate} ~ ${cohort.endDate}`)}</p>
                <span class="overlay-pill">${escapeHtml(cohort.role || "STUDENT")}</span>
                <span class="overlay-pill">${cohort.cohortStatus === "ACTIVE" ? "운영 중" : "대기"}</span>
            </article>`;
    }).join("");
}

function getPersonalSnapshot() {
    return {
        accountId: "로그인된 계정",
        nickname: currentUserName || "미설정",
        characterName: selectedCharacterName || "오마고치",
        characterImage: selectedCharacterImage,
        level: currentCharacter.level || 1,
        studyTime: formatDuration(Number(currentProfile.totalStudySeconds) || 0),
        sessions: Number(currentProfile.completedSessionCount) || 0,
        streak: Number(currentProfile.attendanceStreakDays) || 0,
        cohort: currentProfile.approvedCohort?.name || "미연결"
    };
}

function renderPersonalOverlay() {
    const snapshot = getPersonalSnapshot();

    return `
        <section class="player-profile" aria-label="플레이어 스탯">
            <header class="player-profile-identity">
                <span class="player-profile-avatar"><img src="${escapeHtml(snapshot.characterImage)}" alt="" /></span>
                <div>
                    <h3>${escapeHtml(snapshot.nickname)}</h3>
                    <p>${escapeHtml(snapshot.accountId)}</p>
                </div>
                <strong>LV ${escapeHtml(snapshot.level)}</strong>
            </header>
            <div class="player-profile-main">
                <section class="player-profile-stats" aria-labelledby="player-stat-title">
                    <h3 id="player-stat-title">학습 스탯</h3>
                    <dl>
                        <div><dt>총 학습 시간</dt><dd>${escapeHtml(snapshot.studyTime)}</dd></div>
                        <div><dt>완료 세션</dt><dd>${snapshot.sessions}회</dd></div>
                        <div><dt>연속 출석</dt><dd>${snapshot.streak}일</dd></div>
                    </dl>
                </section>
                <section class="player-profile-info" aria-labelledby="player-info-title">
                    <h3 id="player-info-title">플레이어 정보</h3>
                    <dl>
                        <div><dt>닉네임</dt><dd>${escapeHtml(snapshot.nickname)}</dd></div>
                        <div><dt>캐릭터명</dt><dd>${escapeHtml(snapshot.characterName)}</dd></div>
                        <div><dt>참여 기수</dt><dd>${escapeHtml(snapshot.cohort)}</dd></div>
                    </dl>
                </section>
            </div>
        </section>
    `;
}
let communityPosts = [];
let communityPageCount = 1;
let homeToastTimer;
let communitySearchTimer;

function showHomeToast(message) {
    if (!homeToast) return;
    window.clearTimeout(homeToastTimer);
    homeToast.textContent = message;
    homeToast.classList.add("is-visible");
    homeToastTimer = window.setTimeout(() => {
        homeToast.classList.remove("is-visible");
    }, 3200);
}

const characterController = createCharacter({
    image: homeCharacter,
    wing: characterWing,
    stage: characterStage,
    interaction: characterInteraction,
    bubble: characterBubble,
    nameElement: characterName,
    selectedName: displayCharacterName,
    selectedImage: selectedCharacterImage,
    animatedImage: selectedCharacterAnimatedImage
});

const bgmPlayer = createBgmPlayer({
    root: bgmPlayerRoot
});

let studyRecordsController;

const timerController = createTimer({
    display: timerDisplay,
    toggle: timerToggle,
    statusMessage: document.querySelector("[data-timer-status]"),
    storageKey: timerKey,
    onStart: ({ restored }) => {
        characterController.setStudyState(true);
        characterController.showMessage(
            restored ? "이어서 공부해볼까요?" : "집중 모드 시작!"
        );
    },
    onPause: ({ reason }) => {
        characterController.setStudyState(false);

        if (reason === "user" && studyRecordsController) {
            const result = studyRecordsController.addRecord();
            characterController.showMessage(
                result.ok
                    ? `${result.record.sequence}번째 학습 기록을 저장했어요.`
                    : result.message
            );
            return;
        }

        characterController.showMessage("오늘 학습 시간이 저장됐어요.");
    }
});

studyRecordsController = createStudyRecords({
    storageKey: studyRecordsKey,
    getElapsedSeconds: timerController.getElapsedSeconds,
    api: api?.studyRecords
});

const levelController = createLevel({
    levelElement: characterLevel,
    xpFill,
    currentXpLabel,
    nextLevelLabel,
    characterImage: homeCharacter,
    characterStage,
    initialLevel: currentCharacter.level,
    initialCurrentXp: currentCharacter.currentExp,
    initialRequiredXp: currentCharacter.requiredExp
});

let presenceController;
function confirmCheckOut() {
    return new Promise((resolve) => {
        const backdrop = document.createElement("section");
        backdrop.className = "home-confirm-backdrop";
        backdrop.innerHTML = `
            <article class="home-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="home-confirm-title">
                <h2 id="home-confirm-title">퇴실하시겠습니까?</h2>
                <p>퇴실하면 오늘의 퇴실 시간이 기록됩니다.</p>
                <div class="home-confirm-actions">
                    <button type="button" data-confirm-cancel>아니오</button>
                    <button type="button" data-confirm-ok>예</button>
                </div>
            </article>
        `;

        function close(result) {
            document.removeEventListener("keydown", handleKeydown);
            backdrop.remove();
            resolve(result);
        }

        function handleKeydown(event) {
            if (event.key === "Escape") {
                close(false);
            }
        }

        backdrop.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target === backdrop || target.closest("[data-confirm-cancel]")) {
                close(false);
                return;
            }

            if (target.closest("[data-confirm-ok]")) {
                close(true);
            }
        });

        document.addEventListener("keydown", handleKeydown);
        document.body.append(backdrop);
        backdrop.querySelector("[data-confirm-cancel]")?.focus();
    });
}

const attendanceController = createAttendance({
    button: attendanceButton,
    checkInTime,
    checkOutTime,
    earlyLeave,
    lateMinutes,
    calendarGrid,
    calendarTitle,
    calendarPeriod,
    calendarPrev,
    calendarNext,
    streakCount,
    streakList,
    api: api?.attendance,
    onCheckOutSuccess: () => showHomeToast("퇴실 처리됐어요. 타이머는 계속 사용할 수 있어요."),
    onCheckOutError: () => showHomeToast("퇴실 처리에 실패했어요. 잠시 후 다시 시도해 주세요."),
    confirmCheckOut,
    onChange: ({ streakCount: currentStreakCount } = {}) => {
        characterController.setAttendanceStreak(currentStreakCount);
        presenceController?.render();
    }
});

presenceController = createPresence({
    hud: presenceHud,
    trigger: presenceTrigger,
    panel: presencePanel,
    count: presenceCount,
    capacity: presenceCapacity,
    search: presenceSearch,
    list: presenceList,
    refreshButton: presenceRefresh,
    updated: presenceUpdated,
    currentUser: {
        name: displayCharacterName
    },
    selectedCharacterImage,
    getAttendanceHistory: attendanceController.getHistory,
    api: api?.presence,
    isOverlayOpen: () => document.body.classList.contains("has-home-overlay")
});

function setBgmPanelOpen(open) {
    homePage?.classList.toggle("is-bgm-open", open);
    musicToggle?.setAttribute("aria-expanded", String(open));
}

function setAttendancePanelOpen(open) {
    homePage?.classList.toggle("is-attendance-panel-open", open);
    attendancePanelToggle?.setAttribute("aria-expanded", String(open));
    if (attendanceDetail) attendanceDetail.hidden = !open;

    if (!open && attendanceDetail?.contains(document.activeElement)) {
        attendancePanelToggle?.focus();
    }
}

// React가 소유하는 채팅 상태는 DOM을 직접 조작하지 않고 단방향 이벤트로 닫는다.
function closeHomeChat() {
    window.dispatchEvent(new CustomEvent("omagotchi:home-chat-close"));
}

musicToggle?.addEventListener("click", () => {
    const nextOpen = !homePage?.classList.contains("is-bgm-open");
    if (nextOpen) closeHomeChat();
    presenceController?.close();
    setAttendancePanelOpen(false);
    setBgmPanelOpen(nextOpen);
});

musicClose?.addEventListener("click", () => setBgmPanelOpen(false));

attendancePanelToggle?.addEventListener("click", () => {
    const nextOpen = !homePage?.classList.contains("is-attendance-panel-open");
    if (nextOpen) closeHomeChat();
    presenceController?.close();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(nextOpen);
});

attendancePanelClose?.addEventListener("click", () => setAttendancePanelOpen(false));
presenceClose?.addEventListener("click", () => presenceController?.close());
presenceTrigger?.addEventListener("click", () => {
    closeHomeChat();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(false);
});

chatToggle?.addEventListener("click", () => {
    presenceController?.close();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(false);
});

document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (
        homePage?.classList.contains("is-bgm-open")
        && bgmPlayerRoot
        && musicToggle
        && !bgmPlayerRoot.contains(target)
        && !musicToggle.contains(target)
    ) {
        setBgmPanelOpen(false);
    }

    if (
        homePage?.classList.contains("is-attendance-panel-open")
        && attendanceDetail
        && attendancePanelToggle
        && !attendanceDetail.contains(target)
        && !attendancePanelToggle.contains(target)
    ) {
        setAttendancePanelOpen(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setBgmPanelOpen(false);
    setAttendancePanelOpen(false);
});

const overlayMeta = {
    help: { title: "도움말", description: "오마고치 이용 방법을 확인하세요.", icon: "/images/app/help.png" },
    progress: { title: "진행", description: "퀘스트와 성장 기록을 한눈에 확인하세요.", icon: "/images/app/quest.png" },
    personal: { title: "내 정보", description: "나의 학습과 캐릭터 성장 현황입니다.", icon: "/images/app/userList.png" },
    cohort: { title: "기수", description: "참여 중인 기수와 가입 상태를 관리하세요.", icon: "/images/app/cohort.png" },
    write: { title: "학습 기록", description: "집중한 시간을 돌아보고 학습 흐름을 정리하세요.", icon: "/images/app/studyrecord.png" },
    space: { title: "공간", description: "함께 공부할 공간을 선택하고 입장하세요.", icon: "/images/app/door.png" },
    community: { title: "커뮤", description: "공지와 이야기를 확인하고 동료들과 소통하세요.", icon: "/images/app/commu.png" },
    settings: { title: "설정", description: "계정과 서비스 이용 환경을 관리하세요.", icon: "/images/app/set.png" }
};
const overlayContent = {
    help: `
        <div class="help-accordion">
            <details open>
            <summary>1. 출석 및 상태</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>입실하기</strong>: 오늘 출석을 기록하고 담당 기수 실습실에 입실</li>
                    <li><strong>외출하기</strong>: 잠시 자리를 비운 상태로 변경</li>
                    <li><strong>퇴실하기</strong>: 오늘 공간 이용 종료</li>
                    <li>출석부와 연속 출석은 평일 기준으로 표시하며 주말은 제외합니다.</li>
                </ul>

                <h4>사용자 상태</h4>
                <ul>
                    <li><strong>재실</strong>: 실습실 이용 중</li>
                    <li><strong>부재중</strong>: 외출 등으로 자리 비움</li>
                    <li><strong>회의중</strong>: 회의실 이용 중</li>
                    <li><strong>퇴실</strong>: 공간 이용 종료</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>2. 학습 타이머</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>시작</strong>: 학습 시간 측정 시작</li>
                    <li><strong>정지</strong>: 타이머를 멈추고 직전 시작 이후의 학습 시간을 저장</li>
                    <li><strong>학습 기록</strong>: 저장된 학습 기록을 일·월·연간으로 구분</li>
                    <li>측정 중에는 브라우저 탭 제목에 시간이 표시됩니다.</li>
                    <li>저장된 학습 시간은 퀘스트 진행도와 경험치에 반영됩니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>3. 캐릭터 성장</summary>
            <div class="help-detail">
                <ul>
                    <li>출석, 학습 기록, 퀘스트 완료로 경험치를 획득합니다.</li>
                    <li>경험치가 기준에 도달하면 레벨이 상승합니다.</li>
                    <li>캐릭터를 클릭하면 움직임과 말풍선 반응이 나타납니다.</li>
                    <li>평일 출석 스트릭에 따라 캐릭터 뒤에 날개가 표시됩니다.</li>
                    <li>1일차에는 셀렌, 2일차에는 이트, 3일차 이상에는 세슘 날개가 장착됩니다.</li>
                    <li>진행 메뉴에서 완료한 퀘스트의 보상을 받을 수 있습니다.</li>
                </ul>
                <ol class="help-wing-guide" aria-label="출석 스트릭 날개 단계">
                    <li>
                        <img src="/images/wing/dia/셀렌.png" alt="셀렌 날개" />
                        <strong>1일차</strong>
                        <span>셀렌</span>
                    </li>
                    <li>
                        <img src="/images/wing/mas/이트.png" alt="이트 날개" />
                        <strong>2일차</strong>
                        <span>이트</span>
                    </li>
                    <li>
                        <img src="/images/wing/grand/세슘.png" alt="세슘 날개" />
                        <strong>3일차 이상</strong>
                        <span>세슘</span>
                    </li>
                </ol>
            </div>
        </details>

        <details>
            <summary>4. 공간 이용</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>실습실</strong>: 입실하면 담당 기수 실습실에 자동 연결</li>
                    <li><strong>회의실</strong>: 파티를 구성해 제한된 인원으로 이용</li>
                    <li><strong>도서관</strong>: 개인 또는 조용한 학습 공간</li>
                    <li>사용 중인 회의실은 이용 시간을 연장하거나 반납할 수 있습니다.</li>
                    <li>만실인 회의실은 공실 알림을 신청할 수 있습니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>5. 파티와 사용자 목록</summary>
            <div class="help-detail">
                <ul>
                    <li>같은 기수의 실습실 재실 인원을 확인합니다.</li>
                    <li>이름 또는 이메일로 사용자를 검색합니다.</li>
                    <li>사용자 목록에서 파티원을 초대할 수 있습니다.</li>
                    <li>파티를 만든 후 이용 가능한 회의실에 입장합니다.</li>
                    <li>현재 파티 인원과 각 사용자의 상태를 확인합니다.</li>
                    <li>홈 하단 채팅 바는 GLOBAL 채팅방과 COHORT 채팅방을 구분합니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>6. 메뉴 설명</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>진행</strong>: 퀘스트, 업적, 랭킹, 타임라인, 통계 확인</li>
                    <li><strong>내 정보</strong>: 학습 시간, 출석, 캐릭터 정보 확인</li>
                    <li><strong>기수</strong>: 참여 중이거나 가입 가능한 기수 확인</li>
                    <li><strong>학습 기록</strong>: 저장한 구간을 일간·월간·연간으로 확인하고 수정</li>
                    <li><strong>공간</strong>: 실습실, 회의실, 도서관 이용</li>
                    <li><strong>커뮤</strong>: 공지 및 자유 게시판 이용</li>
                    <li><strong>설정</strong>: 비밀번호 변경, 로그아웃</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>7. 배경 음악</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>재생</strong>: 홈 화면의 BGM 버튼을 눌러 음악을 시작하거나 정지합니다.</li>
                    <li><strong>플레이리스트</strong>: 목록 버튼을 눌러 배경 음악 트랙을 확인하고 직접 선택합니다.</li>
                    <li><strong>셔플</strong>: 플레이리스트 안의 Shuffle 버튼으로 섞어서 재생할 수 있습니다.</li>
                    <li><strong>반복</strong>: Repeat 1 버튼으로 현재 곡만 계속 들을 수 있습니다.</li>
                    <li>한 곡이 끝나면 다음 곡이 자동으로 이어집니다.</li>
                    <li>볼륨과 셔플 설정은 브라우저에 저장됩니다.</li>
                    <li>Pixabay Music과 Louie Zong의 Ghost Songs를 사용하며, 표기가 필요한 곡은 재생 시 크레딧을 표시합니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>8. 홈 하단 버튼</summary>
            <div class="help-detail">
                <ul>
                    <li>홈 화면 아래의 고정 버튼으로 자주 쓰는 기능을 빠르게 열 수 있습니다.</li>
                </ul>
                <ol class="help-dock-guide" aria-label="홈 하단 버튼 안내">
                    <li>
                        <img src="/images/app/music.png" alt="BGM 버튼" />
                        <strong>BGM</strong>
                        <span>음악 재생, 다음 곡, 셔플, 플레이리스트를 확인합니다.</span>
                    </li>
                    <li>
                        <img src="/images/app/calendar.png" alt="출석부 버튼" />
                        <strong>출석부</strong>
                        <span>오늘 입실/퇴실 시간과 월별 출석 기록을 확인합니다.</span>
                    </li>
                    <li>
                        <img src="/images/app/social.png" alt="재실 인원 버튼" />
                        <strong>재실 인원</strong>
                        <span>현재 실습실에 있는 인원과 상태를 확인합니다.</span>
                    </li>
                    <li>
                        <img src="/images/app/exit.png" alt="퇴실 버튼" />
                        <strong>퇴실</strong>
                        <span>하루 학습을 마치고 퇴실 기록을 남깁니다.</span>
                    </li>
                </ol>
            </div>
        </details>

        <details>
            <summary>9. 용어 설명</summary>
            <div class="help-detail">
                <dl class="help-key-list">
                    <div><dt>학습 세션</dt><dd>타이머를 시작한 뒤 정지할 때까지 측정한 한 번의 학습 구간</dd></div>
                    <div><dt>완료 세션</dt><dd>타이머를 정지해 학습 기록으로 저장된 세션. 내 정보의 횟수에는 저장된 세션만 포함</dd></div>
                    <div><dt>총 학습 시간</dt><dd>저장된 학습 세션의 시간을 모두 합한 값</dd></div>
                    <div><dt>연속 출석</dt><dd>평일 기준으로 빠짐없이 입실 기록을 이어간 일수. 주말은 계산에서 제외</dd></div>
                    <div><dt>재실 인원</dt><dd>현재 담당 기수의 실습실을 이용 중인 사용자</dd></div>
                    <div><dt>기수</dt><dd>함께 학습하는 사용자 그룹. 승인된 기수에 가입하면 해당 실습실과 기능을 이용</dd></div>
                </dl>
            </div>
        </details>

        <details>
            <summary>10. 키보드 조작</summary>
            <div class="help-detail">
                <dl class="help-key-list">
                    <div><dt><kbd>U</kbd> <kbd>u</kbd> <kbd>ㅕ</kbd></dt><dd>실습실 재실 인원 열기 또는 닫기</dd></div>
                    <div><dt><kbd>Esc</kbd></dt><dd>현재 오버레이 또는 사용자 목록 닫기</dd></div>
                    <div><dt><kbd>Enter</kbd></dt><dd>현재 선택한 버튼 실행</dd></div>
                    <div><dt><kbd>Tab</kbd></dt><dd>다음 조작 요소로 이동</dd></div>
                </dl>
            </div>
        </details>

        <details>
            <summary>11. 자주 묻는 질문</summary>
            <div class="help-detail help-faq">
                <details>
                    <summary>입실과 출석은 같은 기능인가요?</summary>
                    <p>네. 입실하면 오늘 출석을 기록하고 담당 기수 실습실의 재실 상태로 전환됩니다.</p>
                </details>

                <details>
                    <summary>완료 세션은 무엇인가요?</summary>
                    <p>타이머를 시작한 뒤 정지해 학습 기록으로 저장한 한 번의 학습 구간입니다. 측정 중인 시간은 정지하여 저장되기 전까지 완료 세션 횟수에 포함되지 않습니다.</p>
                </details>

                <details>
                    <summary>학습 기록과 커뮤니티 글 기록은 무엇이 다른가요?</summary>
                    <p>학습 기록은 타이머의 구간별 시간을 저장하는 기능이며, 커뮤니티 글은 게시판에 작성하는 일반 게시글입니다.</p>
                </details>

                <details>
                    <summary>공실 알림은 어디에서 확인하나요?</summary>
                    <p>회의실 탭에서 공실 알림을 신청하거나 해제할 수 있습니다. 구체적인 알림 확인 방식은 서비스 연동 후 제공됩니다.</p>
                </details>

                <details>
                    <summary>퀘스트 보상은 어떻게 받나요?</summary>
                    <p>진행 메뉴의 퀘스트 탭에서 완료된 퀘스트의 보상 받기를 선택합니다.</p>
                </details>

                <details>
                    <summary>기수 가입 코드는 어디에 입력하나요?</summary>
                    <p>기수 메뉴에서 가입할 기수를 선택하고 기수 관리자가 발급한 가입 코드를 입력합니다.</p>
                </details>
            </div>
        </details>
        </div>
    `,
    progress: `
        <div class="overlay-tabs" role="tablist" aria-label="진행 탭">
            <button class="is-active" type="button" role="tab" aria-selected="true" data-overlay-tab="quests"><span aria-hidden="true">▣</span>퀘스트</button>
            <button type="button" role="tab" aria-selected="false" data-overlay-tab="achievements"><span aria-hidden="true">★</span>업적</button>
            <button type="button" role="tab" aria-selected="false" data-overlay-tab="leaders"><span aria-hidden="true">▥</span>랭킹</button>
            <button type="button" role="tab" aria-selected="false" data-overlay-tab="timeline"><span aria-hidden="true">↶</span>타임라인</button>
            <button type="button" role="tab" aria-selected="false" data-overlay-tab="stats"><span aria-hidden="true">▥</span>통계</button>
        </div>
        <section class="overlay-tab-panel is-active" role="tabpanel" data-overlay-panel="quests">
            <div class="overlay-section-label"><strong>일일</strong><span></span><em>익일 4시에 초기화</em></div>
            <ul class="overlay-state-list" aria-label="퀘스트 목록" data-progress-quests>
                <li><div><strong>등록된 퀘스트가 없습니다.</strong><p>퀘스트가 제공되면 이 목록에 표시됩니다.</p></div><em>대기</em></li>
            </ul>
        </section>
        <section class="overlay-tab-panel" role="tabpanel" data-overlay-panel="achievements" hidden>
            <div class="overlay-section-label"><strong>업적</strong><span></span><em>달성 기록</em></div>
            <div class="overlay-empty-state" role="status"><strong>업적 기능은 아직 준비되지 않았습니다.</strong><p>기능이 준비되면 달성 기록을 확인할 수 있습니다.</p></div>
        </section>
        <section class="overlay-tab-panel" role="tabpanel" data-overlay-panel="leaders" hidden>
            <div class="overlay-section-label"><strong>명예의 전당</strong><span></span><em>전체 학습 시간</em></div>
            <ol class="overlay-list overlay-leader-list" aria-label="학습 시간 랭킹" data-progress-ranking>
                <li data-empty-ranking><strong>-</strong><span>랭킹 데이터가 없습니다.</span><em>기록 없음</em></li>
            </ol>
        </section>
        <section class="overlay-tab-panel" role="tabpanel" data-overlay-panel="timeline" hidden>
            <div class="overlay-section-label"><strong>타임라인</strong><span></span><em>최근 활동</em></div>
            <ul class="overlay-state-list overlay-timeline-list" aria-label="최근 활동">
                <li><div><strong>활동 기록이 없습니다.</strong><p>출석과 학습 기록이 생기면 시간순으로 표시됩니다.</p></div><em>최근 활동</em></li>
            </ul>
        </section>
        <section class="overlay-tab-panel" role="tabpanel" data-overlay-panel="stats" hidden>
            <div class="overlay-section-label"><strong>학습 통계</strong><span></span><em>나의 기록</em></div>
            <dl class="overlay-metric-list" data-progress-stats>
                <div><dt>오늘 집중</dt><dd>0분</dd></div>
                <div><dt>세션</dt><dd>0회</dd></div>
                <div><dt>연속 출석</dt><dd>0일</dd></div>
                <div><dt>이번 주</dt><dd>0분</dd></div>
            </dl>
        </section>
    `,
    personal: renderPersonalOverlay,
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
    write: `<div data-study-records></div>`,
    space: `<div class="space-room-app" data-space-room-app></div>`,
    community: `
        <div class="overlay-community">
            <header class="overlay-community-toolbar">
                <div class="overlay-community-tabs" aria-label="게시판 구분">
                    <button class="is-active" type="button" aria-pressed="true" data-community-filter="all">전체</button>
                    <button type="button" aria-pressed="false" data-community-filter="notice">공지</button>
                    <button type="button" aria-pressed="false" data-community-filter="free">자유</button>
                </div>
                <label class="overlay-community-search">
                    <span class="sr-only">게시글 검색</span>
                    <input type="search" placeholder="게시글 검색" data-community-search />
                </label>
                <button class="overlay-community-write" type="button" data-community-write>글쓰기</button>
            </header>

            <section class="overlay-community-notice" aria-label="고정 공지">
                <strong>공지</strong>
                <div>
                    <h3>등록된 고정 공지가 없습니다.</h3>
                    <p>기수 관리자가 작성한 공지가 이 영역에 표시됩니다.</p>
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
        <div class="overlay-settings-panel">
            <section class="overlay-settings-section" aria-labelledby="settings-account-title">
                <h3 id="settings-account-title">계정</h3>
                <div class="overlay-settings-row">
                    <span><strong>비밀번호 변경</strong><em>현재 준비 중인 기능입니다.</em></span>
                    <span class="overlay-settings-status">준비 중</span>
                </div>
                <button class="overlay-settings-logout" type="button" data-logout>로그아웃</button>
            </section>
        </div>
    `
};

function questStatusLabel(quest) {
    if (quest.status === "CLAIMED") return "수령 완료";
    if (quest.status === "COMPLETED") return "보상 받기";
    return `${quest.progressCount}/${quest.targetCount}`;
}

async function loadProgressOverlay() {
    const questList = homeOverlayRoot?.querySelector("[data-progress-quests]");
    const rankingList = homeOverlayRoot?.querySelector("[data-progress-ranking]");
    const stats = homeOverlayRoot?.querySelector("[data-progress-stats]");
    if (!questList || !rankingList || !stats) return;

    const cohortId = currentProfile.approvedCohort?.cohortId;
    const [home, rankings] = await Promise.all([
        api.gamification.getHome(),
        cohortId ? api.ranking.getStudyRankings(cohortId) : Promise.resolve(null)
    ]);

    const quests = Array.isArray(home?.dailyQuests) ? home.dailyQuests : [];
    questList.innerHTML = quests.length ? quests.map((quest) => {
        const canClaim = quest.status === "COMPLETED";
        const statusLabel = questStatusLabel(quest);
        return `<li>
            <div><strong>${escapeHtml(quest.title)}</strong><p>${quest.progressCount} / ${quest.targetCount} · ${quest.rewardXp} XP</p></div>
            ${canClaim
                ? `<button type="button" data-home-claim="${quest.id}">${statusLabel}</button>`
                : `<em>${statusLabel}</em>`}
        </li>`;
    }).join("") : `<li><div><strong>등록된 퀘스트가 없습니다.</strong><p>오늘 제공된 퀘스트가 없습니다.</p></div><em>대기</em></li>`;

    const entries = Array.isArray(rankings?.entries) ? rankings.entries : [];
    rankingList.innerHTML = entries.length ? entries.map((entry) => `
        <li><strong>${entry.rank}</strong><span>${escapeHtml(entry.displayName)}</span><em>${formatDuration(entry.studySeconds)}</em></li>
    `).join("") : `<li data-empty-ranking><strong>-</strong><span>랭킹 데이터가 없습니다.</span><em>기록 없음</em></li>`;

    const growth = home?.growth || currentCharacter;
    stats.innerHTML = `
        <div><dt>총 학습 시간</dt><dd>${formatDuration(Number(currentProfile.totalStudySeconds) || 0)}</dd></div>
        <div><dt>완료 세션</dt><dd>${Number(currentProfile.completedSessionCount) || 0}회</dd></div>
        <div><dt>연속 출석</dt><dd>${Number(currentProfile.attendanceStreakDays) || 0}일</dd></div>
        <div><dt>레벨</dt><dd>Lv ${Number(growth?.level) || 1}</dd></div>
    `;
}

// 커뮤니티 검색, 필터, 페이지 이동 및 글쓰기 처리
async function loadCommunity() {
    const result = await api.community.listPosts({
        page: communityPage - 1,
        size: communityPageSize,
        type: communityFilter === "all" ? undefined : communityFilter.toUpperCase(),
        search: communityKeyword.trim() || undefined
    });
    communityPosts = Array.isArray(result?.items) ? result.items : [];
    communityPageCount = Math.max(1, Number(result?.page?.totalPages) || 1);
    renderCommunity();
}

function renderCommunity() {
    const list = homeOverlayRoot?.querySelector("[data-community-list]");
    const pageLabel = homeOverlayRoot?.querySelector("[data-community-page-label]");
    const pagination = homeOverlayRoot?.querySelector(".overlay-community-pagination");
    const pageButtons = homeOverlayRoot?.querySelectorAll("[data-community-page]");

    if (!list || !pageLabel) {
        return;
    }

    const pageCount = communityPageCount;
    communityPage = Math.min(Math.max(communityPage, 1), pageCount);
    const pagePosts = communityPosts;

    const hasSearchCondition = communityFilter !== "all" || communityKeyword.trim();
    list.innerHTML = pagePosts.length
        ? pagePosts.map((post) => `
            <li>
                <button class="overlay-community-open" type="button" data-community-post="${post.postId}" aria-label="${escapeHtml(post.title)} 상세 보기">
                <span class="overlay-community-type${post.type === "NOTICE" ? " is-notice" : ""}">
                    ${post.type === "NOTICE" ? "공지" : "자유"}
                </span>
                <div>
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(new Date(post.createdAt).toLocaleString("ko-KR"))}</p>
                </div>
                <footer>
                    ${post.pinned ? "<span>고정</span>" : ""}
                    ${post.attachmentCount ? `<span>첨부 ${post.attachmentCount}</span>` : ""}
                </footer>
                </button>
            </li>
        `).join("")
        : `
            <li class="overlay-community-empty">
                <strong>${hasSearchCondition ? "검색 결과가 없습니다." : "아직 게시글이 없습니다."}</strong>
                <p>${hasSearchCondition ? "검색어나 게시판 구분을 다시 확인해 주세요." : "첫 번째 이야기를 남겨 보세요."}</p>
            </li>
        `;

    pageLabel.textContent = `${communityPage} / ${pageCount}`;
    if (pagination) pagination.hidden = pageCount <= 1;
    pageButtons?.forEach((button) => {
        const direction = Number(button.dataset.communityPage);
        button.disabled = direction < 0 ? communityPage === 1 : communityPage === pageCount;
    });

    homeOverlayRoot.querySelectorAll("[data-community-filter]").forEach((button) => {
        const isActive = button.dataset.communityFilter === communityFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

function openCommunityComposer(post = null) {
    const title = homeOverlayRoot?.querySelector("#home-overlay-title");
    const body = homeOverlayRoot?.querySelector(".home-overlay-body");

    if (!title || !body) {
        return;
    }

    title.textContent = post ? "게시글 수정" : "새 게시글";
    body.innerHTML = `
        <form class="overlay-community-compose" data-community-compose${post ? ` data-community-post-id="${post.postId}"` : ""}>
            <label>
                <span>게시판</span>
                <select name="type">
                    <option value="free"${post?.type === "FREE" ? " selected" : ""}>자유 게시판</option>
                    <option value="notice"${post?.type === "NOTICE" ? " selected" : ""}>공지 게시판</option>
                </select>
            </label>
            <label>
                <span>제목</span>
                <input type="text" name="title" maxlength="100" value="${escapeHtml(post?.title || "")}" placeholder="게시글 제목을 입력하세요" required />
            </label>
            <label>
                <span>내용</span>
                <textarea name="content" maxlength="1000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required>${escapeHtml(post?.content || "")}</textarea>
            </label>
            <label>
                <span>이미지 첨부</span>
                <input type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple />
            </label>
            <div>
                <button type="button" data-community-cancel>취소</button>
                <button type="submit">${post ? "수정하기" : "등록하기"}</button>
            </div>
        </form>
    `;
    body.querySelector("input")?.focus();
}

async function submitCommunityPost(form) {
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "").trim();

    if (!title || !content) {
        return;
    }

    const post = {
        type: formData.get("type") === "notice" ? "NOTICE" : "FREE",
        title,
        content,
        scope: "COHORT",
        cohortId: currentProfile.approvedCohort?.cohortId
    };
    const attachments = form.querySelector("input[name='attachments']")?.files || [];
    const postId = form.dataset.communityPostId;
    if (postId) {
        if (attachments.length) await api.community.updatePostWithAttachments(postId, post, attachments);
        else await api.community.updatePost(postId, post);
    } else if (attachments.length) {
        await api.community.createPostWithAttachments(post, attachments);
    } else {
        await api.community.createPost(post);
    }
    communityFilter = "all";
    communityKeyword = "";
    communityPage = 1;
    openHomeOverlay("community");
}

async function openCommunityDetail(postId) {
    const title = homeOverlayRoot?.querySelector("#home-overlay-title");
    const body = homeOverlayRoot?.querySelector(".home-overlay-body");
    if (!title || !body) return;

    title.textContent = "게시글";
    body.innerHTML = `<p class="overlay-community-loading">게시글을 불러오는 중입니다.</p>`;
    const post = await api.community.getPost(postId);
    const attachments = Array.isArray(post?.attachments) ? post.attachments : [];
    body.innerHTML = `
        <article class="overlay-community-detail" data-community-detail="${post.postId}">
            <header>
                <span class="overlay-community-type${post.type === "NOTICE" ? " is-notice" : ""}">${post.type === "NOTICE" ? "공지" : "자유"}</span>
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(new Date(post.createdAt).toLocaleString("ko-KR"))}</p>
            </header>
            <div class="overlay-community-detail-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
            ${attachments.length ? `<section class="overlay-community-attachments" aria-label="첨부파일">
                <strong>첨부파일 ${attachments.length}개</strong>
                <ul>${attachments.map((attachment) => `<li>${escapeHtml(attachment.originalFileName)} · ${Math.ceil(Number(attachment.sizeBytes || 0) / 1024)}KB</li>`).join("")}</ul>
                <p>다운로드 기능은 백엔드 첨부파일 조회 계약이 추가된 뒤 제공됩니다.</p>
            </section>` : ""}
            <footer>
                <button type="button" data-community-cancel>목록</button>
                <button type="button" data-community-edit>수정</button>
                <button type="button" data-community-delete>삭제</button>
            </footer>
        </article>
    `;
    body.querySelector("[data-community-edit]")?.addEventListener("click", () => openCommunityComposer(post));
}

// 홈 화면을 유지한 채 메뉴 내용을 모달 오버레이로 전환
function closeHomeOverlay() {
    if (!homeOverlayRoot) {
        return;
    }

    window.OmagotchiHomeOverlay?.close();
    homeOverlayRoot.classList.remove("is-open");
    document.body.classList.remove("has-home-overlay");
}

function openHomeOverlay(type) {
    const meta = overlayMeta[type];
    const content = typeof overlayContent[type] === "function"
        ? overlayContent[type]()
        : overlayContent[type];

    if (!homeOverlayRoot || !content || !meta) {
        return;
    }

    closeHomeChat();
    presenceController?.close();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(false);
    window.OmagotchiHomeOverlay?.open({ type, meta, content });
    homeOverlayRoot.classList.add("is-open");
    document.body.classList.add("has-home-overlay");

    if (type === "community") {
        loadCommunity().catch((error) => showHomeToast(error.message));
    }

    if (type === "progress") {
        loadProgressOverlay().catch((error) => showHomeToast(error.message));
    }

    if (type === "write") {
        studyRecordsController.mount(
            homeOverlayRoot.querySelector("[data-study-records]")
        );
    }

    if (type === "space") {
        window.OmagotchiSpaceRoom?.mount(
            homeOverlayRoot.querySelector("[data-space-room-app]"),
            { initialTab: location.hash.slice(1) || "lab" }
        );
    }
}

function setOverlayTab(tabButton) {
    const overlay = tabButton.closest(".home-overlay");
    const tabName = tabButton.dataset.overlayTab;

    overlay.querySelectorAll("[data-overlay-tab]").forEach((button) => {
        button.classList.toggle("is-active", button === tabButton);
        button.setAttribute("aria-selected", String(button === tabButton));
    });

    overlay.querySelectorAll("[data-overlay-panel]").forEach((panel) => {
        const isActive = panel.dataset.overlayPanel === tabName;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    });
}

function logout(logoutButton) {
    const logoutForm = document.querySelector("[data-logout-form]");
    const detail = logoutButton?.querySelector("em");
    if (logoutButton) logoutButton.disabled = true;

    try {
        sessionOnlyKeys.forEach((key) => sessionStorage.removeItem(key));
        logoutForm.requestSubmit();
    } catch (error) {
        if (logoutButton) logoutButton.disabled = false;
        if (detail) detail.textContent = error.message || "로그아웃 요청에 실패했습니다.";
    }
}

document.querySelectorAll("[data-home-overlay]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        openHomeOverlay(link.dataset.homeOverlay);
    });
});

function deleteCommunityPost(button) {
    const detail = button.closest("[data-community-detail]");
    if (!detail || !globalThis.confirm("이 게시글을 삭제하시겠습니까?")) return;

    button.disabled = true;
    api.community.deletePost(detail.dataset.communityDetail)
        .then(() => openHomeOverlay("community"))
        .catch((error) => {
            button.disabled = false;
            showHomeToast(error.message || "게시글을 삭제하지 못했습니다.");
        });
}

async function claimDailyQuest(button) {
    button.disabled = true;
    try {
        await api.gamification.claimQuest(button.dataset.homeClaim);
        const profile = await api.profile.get();
        Object.assign(currentProfile, profile);
        await loadProgressOverlay();
    } catch (error) {
        button.disabled = false;
        showHomeToast(error.message);
    }
}

// 동적으로 생성되는 오버레이 버튼은 상위 요소에서 한 번에 처리
homeOverlayRoot?.addEventListener("click", (event) => {
    if (studyRecordsController.handleClick(event)) {
        return;
    }

    const closeTarget = event.target.closest("[data-close-home-overlay]");
    const tabButton = event.target.closest("[data-overlay-tab]");
    const claimButton = event.target.closest("[data-home-claim]");
    const logoutButton = event.target.closest("[data-logout]");
    const communityFilterButton = event.target.closest("[data-community-filter]");
    const communityPageButton = event.target.closest("[data-community-page]");
    const communityWriteButton = event.target.closest("[data-community-write]");
    const communityCancelButton = event.target.closest("[data-community-cancel]");
    const communityPostButton = event.target.closest("[data-community-post]");
    const communityDeleteButton = event.target.closest("[data-community-delete]");

    if (closeTarget && (event.target === closeTarget || closeTarget.matches("button, a"))) {
        closeHomeOverlay();
        return;
    }

    if (tabButton) {
        // 진행 Overlay는 Radix Tabs가 선택·키보드 상태를 관리한다.
        if (tabButton.closest(".home-progress-tabs")) {
            return;
        }
        setOverlayTab(tabButton);
        return;
    }

    if (communityFilterButton) {
        communityFilter = communityFilterButton.dataset.communityFilter;
        communityPage = 1;
        loadCommunity().catch((error) => showHomeToast(error.message));
        return;
    }

    if (communityPageButton) {
        communityPage += Number(communityPageButton.dataset.communityPage);
        loadCommunity().catch((error) => showHomeToast(error.message));
        return;
    }

    if (communityWriteButton) {
        openCommunityComposer();
        return;
    }

    if (communityPostButton) {
        openCommunityDetail(communityPostButton.dataset.communityPost)
            .catch((error) => showHomeToast(error.message || "게시글을 불러오지 못했습니다."));
        return;
    }

    if (communityDeleteButton) {
        deleteCommunityPost(communityDeleteButton);
        return;
    }

    if (communityCancelButton) {
        openHomeOverlay("community");
        return;
    }

    if (claimButton) {
        claimDailyQuest(claimButton);
        return;
    }

    if (logoutButton) {
        logout(logoutButton);
    }
});

// 슬라이더와 검색창처럼 입력 즉시 반영되는 이벤트
homeOverlayRoot?.addEventListener("input", (event) => {
    const communitySearch = event.target.closest("[data-community-search]");

    if (communitySearch) {
        communityKeyword = communitySearch.value;
        communityPage = 1;
        window.clearTimeout(communitySearchTimer);
        communitySearchTimer = window.setTimeout(() => {
            loadCommunity().catch((error) => showHomeToast(error.message));
        }, 250);
    }
});

// 커뮤니티 글쓰기와 기수 가입 코드 제출 처리
homeOverlayRoot?.addEventListener("submit", async (event) => {
    if (studyRecordsController.handleSubmit(event)) {
        return;
    }

    const communityForm = event.target.closest("[data-community-compose]");
    const cohortForm = event.target.closest("[data-home-cohort-form]");

    if (cohortForm) {
        event.preventDefault();
        const code = cohortForm.cohortCode.value.trim().toUpperCase();
        const message = cohortForm.querySelector("[data-home-cohort-message]");
        try {
            await api.cohort.applyByCode(code);
            message.textContent = "참가 신청이 완료되었습니다. 관리자 승인을 기다려주세요.";
            cohortForm.reset();
            return;
        } catch (error) {
            message.textContent = error.message || "가입 코드를 확인하고 다시 시도해 주세요.";
        }
        return;
    }

    if (!communityForm) {
        return;
    }

    event.preventDefault();
    try {
        await submitCommunityPost(communityForm);
    } catch (error) {
        showHomeToast(error.message || "게시글을 저장하지 못했습니다.");
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeHomeOverlay();
    }
});

// 저장된 사용자 설정을 적용한 뒤 최초 화면 렌더링
characterController.init();
timerController.init();
levelController.render();
attendanceController.init();
presenceController?.init();
bgmPlayer.init();

if (window.OmagotchiInitialOverlay) {
    openHomeOverlay(window.OmagotchiInitialOverlay);
}
