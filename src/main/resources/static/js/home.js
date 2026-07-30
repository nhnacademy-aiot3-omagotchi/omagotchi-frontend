import { createAttendance } from "./home/attendance.js";
import { createCharacter } from "./home/character.js";
import { createLevel } from "./home/level.js";
import { createPresence } from "./home/presence.js";
import { createStudyRecords } from "./home/studyRecords.js";
import { createTimer } from "./home/timer.js";
import { escapeHtml, formatDuration } from "./home/utils.js";

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
const presenceHud = document.querySelector("[data-presence-hud]");
const presenceTrigger = document.querySelector("[data-presence-trigger]");
const presencePanel = document.querySelector("[data-presence-panel]");
const presenceCount = document.querySelector("[data-presence-count]");
const presenceCapacity = document.querySelector("[data-presence-capacity]");
const presenceSearch = document.querySelector("[data-presence-search]");
const presenceList = document.querySelector("[data-presence-list]");
const presenceRefresh = document.querySelector("[data-presence-refresh]");
const presenceUpdated = document.querySelector("[data-presence-updated]");

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
const studyRecordsKey = `omagotchiStudyRecords:${currentUserEmail}`;
const timerKey = `omagotchiStudyTimer:${currentUserEmail}`;
const brightnessKey = "omagotchiHomeBrightness";
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

// 오버레이 안에서 사용하는 목록 상태
let communityFilter = "all";
let communityKeyword = "";
let communityPage = 1;
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

function setBrightness(value) {
    document.documentElement.style.setProperty("--home-brightness", `${value}%`);
    localStorage.setItem(brightnessKey, value);
}

const characterController = createCharacter({
    image: homeCharacter,
    stage: characterStage,
    interaction: characterInteraction,
    bubble: characterBubble,
    nameElement: characterName,
    selectedName: selectedCharacterName,
    selectedImage: selectedCharacterImage,
    animatedImage: selectedCharacterAnimatedImage
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
    getElapsedSeconds: timerController.getElapsedSeconds
});

const levelController = createLevel({
    levelElement: characterLevel,
    xpFill,
    currentXpLabel,
    nextLevelLabel,
    characterImage: homeCharacter,
    characterStage,
    storageKey: xpKey
});

let presenceController;
const attendanceController = createAttendance({
    button: attendanceButton,
    checkInTime,
    checkOutTime,
    earlyLeave,
    lateMinutes,
    calendarGrid,
    calendarTitle,
    calendarPeriod,
    streakCount,
    streakList,
    storageKey: attendanceKey,
    onChange: () => presenceController?.render()
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
        name: sessionStorage.getItem("omagotchiUsername")
            || (currentUserEmail === "guest" ? "나" : currentUserEmail.split("@")[0]),
        email: currentUserEmail === "guest" ? "student@omagotchi.site" : currentUserEmail
    },
    selectedCharacterImage,
    getAttendanceHistory: attendanceController.getHistory,
    isOverlayOpen: () => document.body.classList.contains("has-home-overlay")
});

// 홈 메뉴별 오버레이 제목과 본문 템플릿
const overlayTitles = {
    help: "도움말",
    progress: "진행",
    personal: "내 정보",
    cohort: "기수",
    write: "학습 기록",
    space: "공간",
    community: "커뮤",
    settings: "설정",
    password: "비밀번호 변경"
};
// 메뉴 오버레이
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
                    <li>진행 메뉴에서 완료한 퀘스트의 보상을 받을 수 있습니다.</li>
                </ul>
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
                    <li><strong>설정</strong>: 화면 밝기, 비밀번호 변경, 로그아웃</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>7. 키보드 조작</summary>
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
            <summary>8. 자주 묻는 질문</summary>
            <div class="help-detail help-faq">
                <details>
                    <summary>입실과 출석은 같은 기능인가요?</summary>
                    <p>네. 입실하면 오늘 출석을 기록하고 담당 기수 실습실의 재실 상태로 전환됩니다.</p>
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
            <article><h3>총 학습</h3><strong>${formatDuration(timerController.getElapsedSeconds())}</strong><p>현재 타이머 기준</p></article>
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
    write: `<div data-study-records></div>`,
    space: `<div class="space-room-app" data-space-room-app></div>`,
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

    presenceController.close();
    homeOverlayRoot.innerHTML = `
        <section class="home-overlay-backdrop" data-close-home-overlay>
            <article class="home-overlay home-overlay--${type}" role="dialog" aria-modal="true" aria-labelledby="home-overlay-title">
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

document.querySelectorAll("[data-home-overlay]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        openHomeOverlay(link.dataset.homeOverlay);
    });
});

// 동적으로 생성되는 오버레이 버튼은 상위 요소에서 한 번에 처리
homeOverlayRoot?.addEventListener("click", (event) => {
    if (studyRecordsController.handleClick(event)) {
        return;
    }

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
        levelController.addXp(Number(claimButton.dataset.xpReward) || 0);
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
    if (studyRecordsController.handleSubmit(event)) {
        return;
    }

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
const savedBrightness = localStorage.getItem(brightnessKey) || "100";
setBrightness(savedBrightness);
characterController.init();
timerController.init();
levelController.render();
attendanceController.init();
presenceController.init();
