import { createAttendance, hasApprovedCohort } from "./home/attendance.js";
import { createBgmPlayer } from "./home/bgm.js";
import { createCharacter } from "./home/character.js?v=20260902-7";
import {
    renderCommunityAttachmentPreviews,
    renderCommunitySelectedAttachmentPreviews,
    saveCommunityPost
} from "./home/community.js?v=20260904-1";
import { createLevel } from "./home/level.js";
import { isAiRecommendedQuest, loadProgressResources, normalizeDailyQuests } from "./home/questData.js?v=20260902-1";
import { renderRankingBoard } from "./home/rankingBoard.js?v=20260902-2";
import {
    lastClosedRankingDate,
    normalizeStudyRanking,
    rankingCoverageLabel,
    rankingPeriodLabel,
    requestStudyRanking
} from "./home/rankingData.js?v=20260903-1";
import { createStudyRecords } from "./home/studyRecords.js?v=20260825-5";
import { createTimer } from "./home/timer.js?v=20260902-1";
import { promptResumeTimer } from "./home/timerPrompt.js?v=20260902-1";
import { escapeHtml, formatDuration } from "./home/utils.js";

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
const calendarGrid = document.querySelector(".calendar-grid");
const calendarTitle = document.querySelector("[data-calendar-title]");
const calendarPeriod = document.querySelector("[data-calendar-period]");
const calendarPrev = document.querySelector("[data-calendar-prev]");
const calendarNext = document.querySelector("[data-calendar-next]");
const streakCount = document.querySelector("[data-streak-count]");
const streakList = document.querySelector("[data-streak-list]");
const homeOverlayRoot = document.querySelector("[data-home-overlay-root]");
const bgmPlayerRoot = document.querySelector("[data-bgm-player]");
const homePage = document.querySelector(".home-page");
const musicToggle = document.querySelector("[data-home-music-toggle]");
const musicClose = document.querySelector("[data-home-music-close]");
const attendancePanelToggle = document.querySelector("[data-attendance-panel-toggle]");
const attendancePanelClose = document.querySelector("[data-attendance-panel-close]");
const aiAssistantToggle = document.querySelector(".home-ai-toggle");
const homeToast = document.querySelector("[data-home-toast]");
const attendanceDetail = document.querySelector("[data-attendance-panel-toggle]")?.getAttribute("aria-controls")
    ? document.getElementById(document.querySelector("[data-attendance-panel-toggle]").getAttribute("aria-controls"))
    : null;

const currentProfile = window.OmagotchiProfile || {};
let currentCharacter = currentProfile.currentCharacter || {};
const currentUserName = currentProfile.nickname || currentCharacter.nickname || "나";
const selectedCharacterAssetKey = typeof currentCharacter.assetKey === "string"
    ? currentCharacter.assetKey.trim().replace(/^\/+/, "").replace(/\.(?:png|gif)$/i, "")
    : "";
const selectedCharacterAssetParts = selectedCharacterAssetKey
    .split("/")
    .filter(Boolean);
const selectedCharacterAssetName = selectedCharacterAssetParts.at(-1) || "";
const selectedCharacterId = selectedCharacterAssetParts.length > 1
    ? selectedCharacterAssetParts.at(-2)
    : currentCharacter.type || selectedCharacterAssetName || "study";
const selectedCharacterColorId = currentCharacter.colorId
    || (selectedCharacterAssetName && selectedCharacterAssetName !== selectedCharacterId
        ? selectedCharacterAssetName
        : "original");
const characterAssets = window.OmagotchiCharacterAssets;
const fallbackCharacterImage = "/images/characters/study/study.png";
const fallbackCharacterAnimatedImage = "/images/characters/study/study_eye.gif";

const selectedCharacterImage = selectedCharacterAssetKey
    // 서버가 준 assetKey 로 직접 만든 경로도 캐시 버전을 붙인다.
    // getPng 를 안 거치므로 빠뜨리면 이 경로만 옛 그림으로 남는다.
    ? characterAssets?.versioned?.(`/images/characters/${selectedCharacterAssetKey}.png`)
        ?? `/images/characters/${selectedCharacterAssetKey}.png`
    : characterAssets?.getPng(selectedCharacterId, selectedCharacterColorId) ?? fallbackCharacterImage;
const selectedCharacterAnimatedImage = characterAssets
    ?.getEyeGif(selectedCharacterId, selectedCharacterColorId) ?? fallbackCharacterAnimatedImage;

const selectedCharacterName = currentCharacter.name || "오마고치";
const displayCharacterName = currentCharacter.nickname || currentUserName;

const api = window.OmagotchiApi;

let communityFilter = "all";
let communityKeyword = "";
let communityPage = 1;
const communityPageSize = 10;

function renderHomeCohortOverlay() {
    const cohort = currentProfile.approvedCohort;

    if (!cohort) {
        return `
            <div class="ui-cohort-empty-layout" data-cohort-state="unassigned">
                <section class="ui-cohort-empty" aria-labelledby="home-cohort-empty-title">
                    <div>
                        <span class="ui-menu-eyebrow">나의 기수</span>
                        <h3 id="home-cohort-empty-title">참여 기수 없음</h3>
                        <p>승인된 기수 정보가 없습니다. 관리자에게 받은 가입 코드로 참가를 신청해 주세요.</p>
                    </div>
                    <span class="ui-menu-chip">대기</span>
                </section>
                <form class="overlay-cohort-join ui-menu-inline-form" data-home-cohort-form>
                    <label class="ui-field">
                        <span class="ui-field__label">가입 코드</span>
                        <input name="cohortCode" type="text" placeholder="관리자에게 받은 가입 코드" autocomplete="off" required />
                    </label>
                    <button class="ui-button ui-button--primary" type="submit">참가 신청</button>
                    <p class="home-cohort-join-message" data-home-cohort-message>유효한 코드를 입력하면 관리자 승인 대기 상태로 등록됩니다.</p>
                </form>
                <section class="ui-cohort-party-zone" aria-labelledby="home-cohort-team-title">
                    <header>
                        <div>
                            <h3 id="home-cohort-team-title">내 팀</h3>
                            <p>활성 기수별 팀을 확인하거나 새로 만들 수 있어요.</p>
                        </div>
                    </header>
                    <div data-home-party-app></div>
                </section>
            </div>`;
    }

    const cohortLabel = cohort.name?.match(/\d+기/)?.[0] || "기수";
    const statusLabel = cohort.cohortStatus === "ACTIVE" ? "운영 중" : "대기";

    return `
        <section class="ui-cohort-shell" data-cohort-state="approved">
            <span class="ui-menu-eyebrow">나의 기수</span>
            <header class="ui-cohort-summary">
                <div class="ui-cohort-summary__copy">
                    <h3>${escapeHtml(cohort.name)}</h3>
                    <p>${escapeHtml(`${cohort.startDate} — ${cohort.endDate}`)}</p>
                    <span class="ui-menu-chip">${statusLabel}</span>
                </div>
            </header>
            <section class="ui-cohort-party-zone" aria-labelledby="home-cohort-party-title">
                <header>
                    <div>
                        <h3 id="home-cohort-party-title">${escapeHtml(cohortLabel)} 내 팀</h3>
                        <p>같은 기수 멤버와 팀을 만들고 함께 공부할 수 있어요.</p>
                    </div>
                </header>
                <div data-home-party-app></div>
            </section>
            <section class="ui-cohort-affiliation-note" aria-label="기수 소속 안내">
                <strong>과정 소속 안내</strong>
                <p>과정 중에는 다른 기수로 변경할 수 없습니다. 중도 참여 포기가 필요하면 관리자에게 문의해 주세요.</p>
            </section>
        </section>`;
}

function getPersonalSnapshot() {
    return {
        accountId: "로그인된 계정",
        nickname: currentUserName || "미설정",
        characterName: selectedCharacterName || "오마고치",
        characterImage: selectedCharacterAnimatedImage,
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
let communityPinned = null;
let activeCommunityPost = null;
const communityAttachmentPreviewUrls = new Set();
// 상세를 불러오는 동안 목록으로 돌아가면 늦게 도착한 응답이 목록을 덮어쓴다.
let communityViewSequence = 0;
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
    api: api?.study,
    onRunningTimerDetected: promptResumeTimer,
    onStart: ({ restored }) => {
        characterController.setStudyState(true);
        characterController.showMessage(
            restored ? "이어서 공부해볼까요?" : "집중 모드 시작!"
        );
    },
    onPause: ({ elapsedSeconds }) => {
        characterController.setStudyState(false);
        studyRecordsController?.loadRecords?.();
        characterController.showMessage(
            elapsedSeconds && elapsedSeconds > 0
                ? "학습 기록을 저장했어요."
                : "오늘 학습 시간이 저장됐어요."
        );
    },
    onDiscard: () => {
        characterController.showMessage("이전 타이머 기록을 파기했습니다.");
    },
    onError: (error) => {
        showHomeToast(error?.message || "타이머 처리에 실패했습니다.");
    }
});

// 월간 요약과 선택 날짜 기록, 수정·삭제를 Study BFF 계약에 연결한다.
studyRecordsController = createStudyRecords({
    api: api?.study
});

const levelController = createLevel({
    initialLevel: currentCharacter.level,
    initialCurrentXp: currentCharacter.currentExp,
    initialRequiredXp: currentCharacter.requiredExp
});

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
    enabled: hasApprovedCohort(currentProfile),
    onCheckOutSuccess: () => showHomeToast("퇴실 처리됐어요. 타이머는 계속 사용할 수 있어요."),
    onCheckOutError: () => showHomeToast("퇴실 처리에 실패했어요. 잠시 후 다시 시도해 주세요."),
    confirmCheckOut,
    onChange: ({ streakCount: currentStreakCount } = {}) => {
        characterController.setAttendanceStreak(currentStreakCount);
    }
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

// React가 소유하는 AI 도우미 상태는 DOM을 직접 조작하지 않고 단방향 이벤트로 닫는다.
function closeHomeAiAssistant() {
    window.dispatchEvent(new CustomEvent("omagotchi:home-ai-close"));
}

musicToggle?.addEventListener("click", () => {
    const nextOpen = !homePage?.classList.contains("is-bgm-open");
    if (nextOpen) closeHomeAiAssistant();
    setAttendancePanelOpen(false);
    setBgmPanelOpen(nextOpen);
});

musicClose?.addEventListener("click", () => setBgmPanelOpen(false));

attendancePanelToggle?.addEventListener("click", () => {
    const nextOpen = !homePage?.classList.contains("is-attendance-panel-open");
    if (nextOpen) closeHomeAiAssistant();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(nextOpen);
});

attendancePanelClose?.addEventListener("click", () => setAttendancePanelOpen(false));
aiAssistantToggle?.addEventListener("click", () => {
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
    cohort: { title: "기수 · 팀", description: "기수 안에서 팀을 만들고 함께 성장하세요.", icon: "/images/app/cohort.png" },
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
                    <li><strong>학습 기록</strong>: 월간 달력에서 날짜별 학습 기록을 확인</li>
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
                    <li><strong>회의실</strong>: 점유자가 같은 기수 사용자를 참여자로 추가해 함께 이용</li>
                    <li><strong>도서관</strong>: 개인 또는 조용한 학습 공간</li>
                    <li>사용 중인 회의실은 이용 시간을 연장하거나 반납할 수 있습니다.</li>
                    <li>만실인 회의실은 공실 알림을 신청할 수 있습니다.</li>
                    <li>Telegram을 연결하면 신청한 회의실의 공실 알림을 받을 수 있습니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>5. 팀과 사용자 목록</summary>
            <div class="help-detail">
                <ul>
                    <li>기수 · 팀 메뉴에서 서버에 저장되는 팀을 만들고 확인합니다.</li>
                    <li>팀과 회의실 참여자는 서로 독립적으로 관리됩니다.</li>
                    <li>실시간 채팅 기능은 사용하지 않습니다. 홈 하단의 같은 자리는 AI 도우미 영역입니다.</li>
                </ul>
            </div>
        </details>

        <details>
            <summary>6. 메뉴 설명</summary>
            <div class="help-detail">
                <ul>
                    <li><strong>진행</strong>: 퀘스트, 업적, 랭킹, 타임라인, 통계 확인</li>
                    <li><strong>내 정보</strong>: 학습 시간, 출석, 캐릭터 정보 확인</li>
                    <li><strong>기수 · 팀</strong>: 소속 기수와 팀 생성·관리</li>
                    <li><strong>학습 기록</strong>: 월간 달력에서 저장한 기록을 확인·수정·삭제</li>
                    <li><strong>공간</strong>: 회의실과 도서관 이용</li>
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
                        <span class="help-dock-ai-icon" aria-hidden="true">AI</span>
                        <strong>AI 도우미</strong>
                        <span>질문을 입력하면 답변을 받아볼 수 있습니다. (현재는 날씨 조회 등 제한된 기능만 제공)</span>
                    </li>
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
            <button type="button" role="tab" aria-selected="false" data-overlay-tab="leaders"><span aria-hidden="true">▥</span>랭킹</button>
        </div>
        <section class="overlay-tab-panel is-active" role="tabpanel" data-overlay-panel="quests">
            <div class="quest-ai-slot" data-progress-ai-quest hidden></div>
            <div class="overlay-section-label"><strong>일일</strong><span></span><em>익일 4시에 초기화</em></div>
            <ul class="overlay-state-list" aria-label="퀘스트 목록" data-progress-quests>
                <li><div><strong>등록된 퀘스트가 없습니다.</strong><p>퀘스트가 제공되면 이 목록에 표시됩니다.</p></div><em>대기</em></li>
            </ul>
        </section>
        <section class="overlay-tab-panel" role="tabpanel" data-overlay-panel="leaders" hidden>
            <div class="ranking-filter-bar">
                <div class="ranking-period-tabs" role="tablist" aria-label="랭킹 기간">
                    <button class="is-active" type="button" role="tab" aria-selected="true" data-ranking-period="TODAY">오늘</button>
                    <button type="button" role="tab" aria-selected="false" data-ranking-period="WEEKLY">이번 주</button>
                    <button type="button" role="tab" aria-selected="false" data-ranking-period="MONTHLY">이번 달</button>
                </div>
                <label class="ranking-date-field" data-ranking-date-field>
                    <span>지난 날짜</span>
                    <input type="date" data-ranking-date aria-label="과거 일간 랭킹 날짜" />
                </label>
            </div>
            <p class="ranking-aggregation-note">주간·월간 랭킹은 완료된 집계일까지만 반영됩니다. 오늘 기록은 ‘오늘’ 랭킹에서 확인할 수 있습니다.</p>
            <div class="overlay-section-label"><strong>명예의 전당</strong><span></span><em data-ranking-meta>불러오는 중</em></div>
            <div class="rank-board" aria-label="학습 시간 랭킹" data-progress-ranking>
                <p class="rank-empty" data-empty-ranking>랭킹을 불러오는 중입니다.</p>
            </div>
            <div class="ranking-my-card" data-progress-my-ranking hidden></div>
        </section>
    `,
    personal: renderPersonalOverlay,
    cohort: renderHomeCohortOverlay,
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
                <div data-community-pinned>
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
                    <span><strong>계정 설정</strong><em>이름과 비밀번호를 관리합니다.</em></span>
                    <a class="overlay-settings-open" href="/settings/account">열기</a>
                </div>
                <button class="overlay-settings-logout" type="button" data-logout>로그아웃</button>
            </section>
        </div>
    `
};

/**
 * 홈 메뉴 배지 상태를 React(TopMenu)로 넘긴다.
 *
 * React 마운트보다 이 호출이 먼저일 수 있어 전역에도 남긴다. TopMenu는 마운트 시
 * 이 값을 한 번 읽으므로 초기 배지를 놓치지 않는다.
 */
function publishMenuAlerts(overlays) {
    globalThis.OmagotchiHomeMenuAlerts = overlays;
    window.dispatchEvent(new CustomEvent("omagotchi:home-menu-alert", {detail: {overlays}}));
}

/**
 * 배지는 "수령 대기 중인 보상"만 알린다.
 *
 * 퀘스트 발급을 조건으로 삼으면 사용자가 없앨 방법이 없어 상시 표시가 된다.
 * COMPLETED는 '보상 받기'를 누르면 CLAIMED가 되므로 배지가 스스로 꺼진다.
 */
function questAlertOverlays(quests) {
    const hasClaimable = Array.isArray(quests)
        && quests.some((quest) => quest.status === "COMPLETED");
    return hasClaimable ? ["progress"] : [];
}

/** 홈 진입 시 한 번 부른다. 배지는 부가 정보라 실패하면 조용히 끈다. */
async function refreshMenuAlerts() {
    try {
        publishMenuAlerts(questAlertOverlays(
            normalizeDailyQuests(await api.gamification.getDailyQuests())
        ));
    } catch {
        publishMenuAlerts([]);
    }
}

/** 목록 한 줄. AI 카드와 일일 목록이 같은 표기를 쓰도록 한 곳에 둔다. */
function questProgressText(quest) {
    return `${quest.progressCount} / ${quest.targetCount} · ${quest.rewardXp} XP`;
}

function questActionHtml(quest) {
    const statusLabel = questStatusLabel(quest);
    return quest.status === "COMPLETED"
        ? `<button type="button" data-home-claim="${escapeHtml(quest.id)}">${escapeHtml(statusLabel)}</button>`
        : `<em>${escapeHtml(statusLabel)}</em>`;
}

function questStatusLabel(quest) {
    if (quest.status === "CLAIMED") return "수령 완료";
    if (quest.status === "COMPLETED") return "보상 받기";
    return `${quest.progressCount}/${quest.targetCount}`;
}

async function loadProgressOverlay() {
    const questList = homeOverlayRoot?.querySelector("[data-progress-quests]");
    const rankingList = homeOverlayRoot?.querySelector("[data-progress-ranking]");
    const myRankingCard = homeOverlayRoot?.querySelector("[data-progress-my-ranking]");
    const rankingMeta = homeOverlayRoot?.querySelector("[data-ranking-meta]");
    const rankingPeriodButtons = homeOverlayRoot?.querySelectorAll("[data-ranking-period]") ?? [];
    const rankingDateInput = homeOverlayRoot?.querySelector("[data-ranking-date]");
    const rankingDateField = homeOverlayRoot?.querySelector("[data-ranking-date-field]");
    const aiSlot = homeOverlayRoot?.querySelector("[data-progress-ai-quest]");
    // 진행 패널은 탭으로 그려지고, 탭 구현이 비활성 패널을 언마운트하면 그쪽 노드는 없다.
    // 하나라도 없다고 전체를 포기하면 남은 영역까지 초기 문구로 굳어 조용한 미표시가 된다.
    // 그래서 전부 없을 때만 중단하고, 이후에는 영역별로 각자 판정한다.
    if (!questList && !rankingList && !aiSlot) return;

    // 랭킹 조회 기수는 서버가 Session 승인 기수에서 확보하므로 Browser가 지정하지 않는다.
    // 승인 기수가 없으면 서버가 업무 오류를 반환하므로, 빈 랭킹으로 표시하고 화면은 유지한다.
    const hasRankingCohort = Boolean(currentProfile.approvedCohort?.cohortId);
    const results = await loadProgressResources(api, hasRankingCohort);
    const dailyQuests = results.quests.status === "fulfilled"
        ? normalizeDailyQuests(results.quests.value)
        : null;
    if (dailyQuests === null) {
        // 실패 시 AI 슬롯을 열어 두면 이전 퀘스트가 남아 오해를 준다. 목록 하나로만 알린다.
        if (aiSlot) {
            aiSlot.hidden = true;
            aiSlot.innerHTML = "";
        }
        if (questList) questList.innerHTML = `<li><div><strong>퀘스트를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해 주세요.</p></div><em>오류</em></li>`;
    } else {
        // LLM 슬롯의 예측 기반 공부 시간 퀘스트는 서버 정렬과 무관하게 항상 맨 위 카드로 올린다.
        const aiQuests = dailyQuests.filter(isAiRecommendedQuest);
        const routineQuests = dailyQuests.filter((quest) => !isAiRecommendedQuest(quest));

        if (aiSlot) {
            aiSlot.hidden = aiQuests.length === 0;
            aiSlot.innerHTML = aiQuests.map((quest) => `
            <article class="quest-ai-card${quest.status === "CLAIMED" ? " is-claimed" : ""}">
                <span class="quest-ai-badge">AI 추천</span>
                <div class="quest-ai-body">
                    <strong>${escapeHtml(quest.title)}</strong>
                    <p>${questProgressText(quest)}</p>
                </div>
                <div class="quest-ai-action">${questActionHtml(quest)}</div>
            </article>
        `).join("");
        }

        // 이미 받아온 결과를 그대로 쓴다. 배지 때문에 요청을 더 보내지 않는다.
        // 배지는 DOM 유무와 무관한 정보라 슬롯이 없어도 갱신한다.
        publishMenuAlerts(questAlertOverlays(dailyQuests));

        if (questList) questList.innerHTML = routineQuests.length ? routineQuests.map((quest) => `
            <li>
                <div><strong>${escapeHtml(quest.title)}</strong><p>${questProgressText(quest)}</p></div>
                ${questActionHtml(quest)}
            </li>`).join("")
            : `<li><div><strong>등록된 퀘스트가 없습니다.</strong><p>오늘 제공된 퀘스트가 없습니다.</p></div><em>대기</em></li>`;
    }

    if (!rankingList) return;

    if (rankingDateInput) rankingDateInput.max = lastClosedRankingDate();

    function renderRankingResult(result, period, dailyDate = null) {
        if (myRankingCard) {
            myRankingCard.hidden = true;
            myRankingCard.innerHTML = "";
        }
        if (!hasRankingCohort) {
            if (rankingMeta) rankingMeta.textContent = "기수 미승인";
            rankingList.innerHTML = `<p class="rank-empty" data-empty-ranking>승인된 기수가 없습니다.</p>`;
            return;
        }
        if (result.status !== "fulfilled") {
            if (rankingMeta) rankingMeta.textContent = "조회 실패";
            rankingList.innerHTML = `<p class="rank-empty" data-empty-ranking>랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>`;
            return;
        }
        const ranking = normalizeStudyRanking(result.value, period);
        if (ranking === null) {
            if (rankingMeta) rankingMeta.textContent = "응답 오류";
            rankingList.innerHTML = `<p class="rank-empty" data-empty-ranking>랭킹 응답을 확인할 수 없습니다.</p>`;
            return;
        }

        if (rankingMeta) {
            rankingMeta.textContent = `${rankingPeriodLabel(period, dailyDate)} · ${rankingCoverageLabel(period, ranking.includedThroughDate)} · ${ranking.rankedMemberCount}명 참여`;
        }
        if (ranking.entries.length === 0) {
            rankingList.innerHTML = `<p class="rank-empty" data-empty-ranking>${rankingPeriodLabel(period, dailyDate)} 학습 기록이 아직 없습니다.</p>`;
            return;
        }
        rankingList.innerHTML = renderRankingBoard(ranking.entries);
        const mine = ranking.myRanking.ranked ? ranking.myRanking.ranking : null;
        if (mine !== null && myRankingCard) {
            myRankingCard.hidden = false;
            myRankingCard.innerHTML = `<strong>내 순위 ${mine.rank}위</strong><span>${escapeHtml(mine.displayName || "대표 캐릭터 미설정")}</span><em>${formatDuration(mine.studySeconds)}${mine.timerRunning ? " · 진행 중" : ""}</em>`;
        }
    }

    renderRankingResult(results.rankings, "TODAY");
    let rankingRequestSequence = 0;
    async function loadRankingPeriod(period, dailyDate = null) {
        const requestSequence = ++rankingRequestSequence;
        const label = rankingPeriodLabel(period, dailyDate);
        if (rankingMeta) rankingMeta.textContent = `${label} · 불러오는 중`;
        rankingList.innerHTML = `<p class="rank-empty" data-empty-ranking>랭킹을 불러오는 중입니다.</p>`;
        try {
            const value = await requestStudyRanking(api, period, new Date(), dailyDate);
            if (requestSequence !== rankingRequestSequence) return;
            renderRankingResult({status: "fulfilled", value}, period, dailyDate);
        } catch (error) {
            if (requestSequence !== rankingRequestSequence) return;
            renderRankingResult({status: "rejected", reason: error}, period, dailyDate);
        }
    }

    rankingPeriodButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const period = button.dataset.rankingPeriod;
            rankingPeriodButtons.forEach((candidate) => {
                const active = candidate === button;
                candidate.classList.toggle("is-active", active);
                candidate.setAttribute("aria-selected", String(active));
            });
            rankingDateField?.classList.remove("is-active");
            loadRankingPeriod(period);
        });
    });

    rankingDateInput?.addEventListener("change", () => {
        if (!rankingDateInput.value) return;
        rankingPeriodButtons.forEach((button) => {
            button.classList.remove("is-active");
            button.setAttribute("aria-selected", "false");
        });
        rankingDateField?.classList.add("is-active");
        loadRankingPeriod("DAILY", rankingDateInput.value);
    });

}

// 커뮤니티 검색, 필터, 페이지 이동 및 글쓰기 처리
// 작성자는 대표 캐릭터 닉네임이다. 아직 캐릭터를 고르지 않은 사용자는 서버가 null을 준다.
function communityAuthorLabel(post) {
    return escapeHtml(post?.authorNickname || "알 수 없음");
}

async function loadCommunity() {
    const result = await api.community.listPosts({
        page: communityPage - 1,
        size: communityPageSize,
        type: communityFilter === "all" ? undefined : communityFilter.toUpperCase(),
        search: communityKeyword.trim() || undefined
    });
    communityPosts = Array.isArray(result?.items) ? result.items : [];
    // 고정 공지는 목록에서 빠져 배너에만 나온다. 필터·검색·페이지와 무관하게 같은 글이다.
    communityPinned = result?.pinned || null;
    communityPageCount = Math.max(1, Number(result?.page?.totalPages) || 1);

    // 마지막 페이지의 마지막 글을 지우면 사라진 페이지를 조회하게 된다.
    // 되짚은 뒤에는 communityPage <= communityPageCount라 다시 들어오지 않는다.
    if (communityPage > communityPageCount) {
        communityPage = communityPageCount;
        return loadCommunity();
    }

    renderCommunity();
}

// 고정 공지는 목록에 없으므로 배너에서 열 수 있어야 한다.
function renderPinnedNotice() {
    const banner = homeOverlayRoot?.querySelector("[data-community-pinned]");
    if (!banner) {
        return;
    }

    if (!communityPinned) {
        banner.innerHTML = `
            <h3>등록된 고정 공지가 없습니다.</h3>
            <p>기수 관리자가 작성한 공지가 이 영역에 표시됩니다.</p>
        `;
        return;
    }

    banner.innerHTML = `
        <h3>
            <button class="overlay-community-pinned-open" type="button" data-community-post="${communityPinned.postId}">
                ${escapeHtml(communityPinned.title)}
            </button>
        </h3>
        <p>${communityAuthorLabel(communityPinned)} · ${escapeHtml(new Date(communityPinned.createdAt).toLocaleString("ko-KR"))}</p>
    `;
}

function renderCommunity() {
    const list = homeOverlayRoot?.querySelector("[data-community-list]");
    const pageLabel = homeOverlayRoot?.querySelector("[data-community-page-label]");
    const pagination = homeOverlayRoot?.querySelector(".overlay-community-pagination");
    const pageButtons = homeOverlayRoot?.querySelectorAll("[data-community-page]");

    if (!list || !pageLabel) {
        return;
    }

    renderPinnedNotice();

    const pageCount = communityPageCount;
    communityPage = Math.min(Math.max(communityPage, 1), pageCount);
    const pagePosts = communityPosts;

    const hasSearchCondition = communityFilter !== "all" || communityKeyword.trim();
    if (pagePosts.length === 0) {
        const emptyTitle = hasSearchCondition ? "검색 결과가 없습니다." : "아직 게시글이 없습니다.";
        const emptyDesc = hasSearchCondition ? "검색어나 게시판 구분을 다시 확인해 주세요." : "첫 번째 이야기를 남겨 보세요.";
        list.innerHTML = `
            <li class="overlay-community-empty">
                <strong>${emptyTitle}</strong>
                <p>${emptyDesc}</p>
            </li>
        `;
    } else {
        list.innerHTML = pagePosts.map((post) => `
            <li>
                <button class="overlay-community-open" type="button" data-community-post="${post.postId}" aria-label="${escapeHtml(post.title)} 상세 보기">
                <span class="overlay-community-type${post.type === "NOTICE" ? " is-notice" : ""}">
                    ${post.type === "NOTICE" ? "공지" : "자유"}
                </span>
                <div>
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${communityAuthorLabel(post)} · ${escapeHtml(new Date(post.createdAt).toLocaleString("ko-KR"))}</p>
                </div>
                <footer>
                    ${post.pinned ? "<span>고정</span>" : ""}
                    ${post.attachmentCount ? `<span>첨부 ${post.attachmentCount}</span>` : ""}
                </footer>
                </button>
            </li>
        `).join("");
    }

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

    // 상세에서 목록으로 돌아오면 템플릿이 빈 검색창으로 다시 그려진다.
    // 검색어는 모듈 상태에 남아 결과에 계속 반영되므로 입력값도 맞춰 준다.
    // 입력 중에는 두 값이 같아 건드리지 않는다.
    const searchInput = homeOverlayRoot.querySelector("[data-community-search]");
    if (searchInput && searchInput.value !== communityKeyword) {
        searchInput.value = communityKeyword;
    }
}

/**
 * 오버레이 본문은 React가 소유한다(HomeMenuLiveContent의 dangerouslySetInnerHTML).
 * body.innerHTML로 직접 덮으면 두 가지가 깨진다.
 *   1. .ui-menu-live-content 래퍼가 사라져 grid·gap·min-width 레이아웃을 잃는다.
 *   2. Store 스냅샷은 그대로라 화면과 어긋난다. 같은 content로 다시 open해도
 *      React가 __html이 같다고 보고 DOM을 건드리지 않아 목록으로 돌아오지 못한다.
 * 그래서 커뮤니티의 모든 화면 전환은 Store를 거친다.
 */
function renderCommunityOverlay(title, content) {
    if (!homeOverlayRoot) {
        return false;
    }

    const opened = window.OmagotchiHomeOverlay?.open({
        type: "community",
        meta: { ...overlayMeta.community, title },
        content
    });
    if (!opened) {
        return false;
    }

    releaseCommunityAttachmentPreviewUrls();

    homeOverlayRoot.classList.add("is-open");
    document.body.classList.add("has-home-overlay");

    // 본문이 스크롤 컨테이너다. 긴 작성 화면에서 아래로 내려간 위치가 그대로 남으면
    // 목록으로 돌아왔을 때 툴바가 화면 밖에 있어 사라진 것처럼 보인다.
    const body = homeOverlayRoot.querySelector(".home-overlay-body");
    if (body) {
        body.scrollTop = 0;
    }
    return true;
}

function releaseCommunityAttachmentPreviewUrls() {
    communityAttachmentPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    communityAttachmentPreviewUrls.clear();
}

async function loadCommunityAttachmentPreviews(postId, attachments, viewSequence) {
    const cards = Array.from(homeOverlayRoot?.querySelectorAll("[data-community-attachment-card]") || []);
    await Promise.all(attachments.map(async (attachment, index) => {
        const card = cards[index];
        if (!card) return;

        const image = card.querySelector("img");
        const status = card.querySelector(".overlay-community-attachment-status");
        if (!image || !status) return;
        try {
            const blob = await api.community.getAttachmentBlob(postId, attachment.attachmentId);
            if (viewSequence !== communityViewSequence || !card.isConnected) {
                return;
            }
            const previewUrl = URL.createObjectURL(blob);
            communityAttachmentPreviewUrls.add(previewUrl);
            image.src = previewUrl;
            image.hidden = false;
            status.hidden = true;
            card.classList.add("is-ready");
        } catch {
            if (viewSequence !== communityViewSequence || !card.isConnected) {
                return;
            }
            status.textContent = "미리보기를 불러오지 못했습니다.";
            card.classList.add("is-error");
        }
    }));
}

function updateSelectedCommunityAttachmentPreviews(input) {
    const field = input.closest(".overlay-community-form-field");
    const previewList = field?.querySelector("[data-community-selected-previews]");
    if (!previewList) return;

    releaseCommunityAttachmentPreviewUrls();
    const files = Array.from(input.files || []);
    if (!files.length) {
        previewList.replaceChildren();
        previewList.hidden = true;
        return;
    }

    const previewUrls = files.map((file) => {
        const url = URL.createObjectURL(file);
        communityAttachmentPreviewUrls.add(url);
        return url;
    });
    previewList.innerHTML = renderCommunitySelectedAttachmentPreviews(files, previewUrls);
    previewList.hidden = false;
}

function openCommunityComposer(post = null) {
    communityViewSequence += 1;
    activeCommunityPost = post;
    const attachmentInputId = `community-attachments-${post?.postId || "new"}`;
    const content = `
        <form class="overlay-community-compose" data-community-compose data-community-post-type="${post?.type || "FREE"}"${post ? ` data-community-post-id="${post.postId}"` : ""}>
            <section class="overlay-community-form-field">
                <span>게시판</span>
                <div class="overlay-community-board">${post?.type === "NOTICE" ? "공지 게시판" : "자유 게시판"}</div>
            </section>
            <label class="overlay-community-form-field">
                <span>제목</span>
                <input type="text" name="title" maxlength="100" value="${escapeHtml(post?.title || "")}" placeholder="게시글 제목을 입력하세요" required />
            </label>
            <label class="overlay-community-form-field">
                <span>내용</span>
                <textarea name="content" maxlength="10000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required>${escapeHtml(post?.content || "")}</textarea>
            </label>
            <section class="overlay-community-form-field">
                <span>이미지 첨부</span>
                <div class="overlay-community-file-picker">
                    <input id="${attachmentInputId}" class="overlay-community-file-input" type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple />
                    <label for="${attachmentInputId}" class="overlay-community-file-button">이미지 선택</label>
                    <span class="overlay-community-file-summary" data-community-file-summary>첨부할 이미지를 선택하세요.</span>
                </div>
                <ul class="overlay-community-selected-preview-list" data-community-selected-previews aria-label="선택한 이미지 미리보기" hidden></ul>
            </section>
            <footer>
                <button type="button" data-community-close>취소</button>
                <button type="submit">${post ? "수정하기" : "등록하기"}</button>
            </footer>
        </form>
    `;

    if (renderCommunityOverlay(post ? "게시글 수정" : "새 게시글", content)) {
        homeOverlayRoot.querySelector(".home-overlay-body input")?.focus();
    }
}

async function submitCommunityPost(form) {
    const cohortId = currentProfile.approvedCohort?.cohortId;
    const result = await saveCommunityPost({
        form,
        api: api.community,
        cohortId
    });

    if (!result) {
        return;
    }

    if (result.action === "updated") {
        const opened = await openCommunityDetail(form.dataset.communityPostId);
        if (opened) {
            showHomeToast(result.message);
        }
        return;
    }

    showHomeToast(result.message);
    openHomeOverlay("community");
}

async function openCommunityDetail(postId) {
    const viewSequence = ++communityViewSequence;
    renderCommunityOverlay("게시글", `<p class="overlay-community-loading">게시글을 불러오는 중입니다.</p>`);

    let post;
    try {
        post = await api.community.getPost(postId);
    } catch {
        // 사용자가 이미 다른 화면으로 이동했다면 늦은 오류 응답으로 현재 화면을 덮지 않는다.
        if (viewSequence !== communityViewSequence) {
            return false;
        }

        const message = "게시글을 불러오지 못했습니다.";
        renderCommunityOverlay("게시글", `<p class="overlay-community-error" role="alert">${message}</p>`);
        showHomeToast(message);
        return false;
    }
    // 불러오는 사이에 목록이나 다른 글로 옮겼으면 이 응답은 버린다.
    if (viewSequence !== communityViewSequence) {
        return false;
    }

    activeCommunityPost = post;
    const attachments = Array.isArray(post?.attachments) ? post.attachments : [];
    const content = `
        <article class="overlay-community-detail" data-community-detail="${post.postId}">
            <div class="overlay-community-form-field">
                <span>게시판</span>
                <div class="overlay-community-board">${post.type === "NOTICE" ? "공지 게시판" : "자유 게시판"}</div>
            </div>
            <div class="overlay-community-form-field">
                <span>제목</span>
                <div class="overlay-community-readonly">${escapeHtml(post.title)}</div>
                <p class="overlay-community-date">${communityAuthorLabel(post)} · ${escapeHtml(new Date(post.createdAt).toLocaleString("ko-KR"))}</p>
            </div>
            <div class="overlay-community-form-field">
                <span>내용</span>
                <div class="overlay-community-readonly overlay-community-detail-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
            </div>
            <section class="overlay-community-form-field" aria-label="첨부파일">
                <span>첨부파일</span>
                ${renderCommunityAttachmentPreviews(attachments, {
                    downloadUrlFor: (attachment) => api.community.downloadUrl(post.postId, attachment.attachmentId)
                })}
            </section>
            <footer>
                <button type="button" data-community-list>목록</button>
                ${post.canManage ? `
                <button type="button" data-community-edit>수정</button>
                <button type="button" data-community-delete>삭제</button>
                ` : ""}
            </footer>
        </article>
    `;

    renderCommunityOverlay("게시글", content);
    loadCommunityAttachmentPreviews(post.postId, attachments, viewSequence);
    return true;
}

// 홈 화면을 유지한 채 메뉴 내용을 모달 오버레이로 전환
function closeHomeOverlay() {
    if (!homeOverlayRoot) {
        return;
    }

    window.OmagotchiHomeOverlay?.close();
    activeCommunityPost = null;
    communityViewSequence += 1;
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

    closeHomeAiAssistant();
    setBgmPanelOpen(false);
    setAttendancePanelOpen(false);
    window.OmagotchiHomeOverlay?.open({ type, meta, content });
    homeOverlayRoot.classList.add("is-open");
    document.body.classList.add("has-home-overlay");

    if (type === "community") {
        activeCommunityPost = null;
        communityViewSequence += 1;
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
            { initialTab: location.hash.slice(1) || "meeting" }
        );
    }

    if (type === "cohort") {
        window.OmagotchiTeam?.mount(
            homeOverlayRoot.querySelector("[data-home-party-app]")
        );
    }
}

function logout(logoutButton) {
    const logoutForm = document.querySelector("[data-logout-form]");
    const detail = logoutButton?.querySelector("em");
    if (logoutButton) logoutButton.disabled = true;

    try {
        logoutForm.requestSubmit();
    } catch (error) {
        if (logoutButton) logoutButton.disabled = false;
        if (detail) detail.textContent = error.message || "로그아웃 요청에 실패했습니다.";
    }
}

// React 메뉴가 보내는 요청을 받아 현재 Home 안에서 오버레이를 연다.
// React가 home.js보다 먼저 렌더링되므로 초기 로딩 중 클릭은
// OmagotchiInitialOverlay에 보관되고 파일 하단에서 한 번 더 처리된다.
window.addEventListener("omagotchi:home-overlay-request", (event) => {
    const type = event.detail?.type;
    if (!type) return;

    window.OmagotchiInitialOverlay = null;
    openHomeOverlay(type);
});

function deleteCommunityPost(button) {
    const detail = button.closest("[data-community-detail]");
    if (!detail || !globalThis.confirm("이 게시글을 삭제하시겠습니까?")) return;

    button.disabled = true;
    api.community.deletePost(detail.dataset.communityDetail)
        .then(() => {
            openHomeOverlay("community");
            showHomeToast("게시글이 삭제되었습니다.");
        })
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
        currentCharacter = currentProfile.currentCharacter || {};
        levelController.update(currentCharacter);
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
    const claimButton = event.target.closest("[data-home-claim]");
    const logoutButton = event.target.closest("[data-logout]");
    const communityFilterButton = event.target.closest("[data-community-filter]");
    const communityPageButton = event.target.closest("[data-community-page]");
    const communityWriteButton = event.target.closest("[data-community-write]");
    const communityCloseButton = event.target.closest("[data-community-close]");
    const communityListButton = event.target.closest("[data-community-list]");
    const communityPostButton = event.target.closest("[data-community-post]");
    const communityEditButton = event.target.closest("[data-community-edit]");
    const communityDeleteButton = event.target.closest("[data-community-delete]");

    if (closeTarget && (event.target === closeTarget || closeTarget.matches("button, a"))) {
        closeHomeOverlay();
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
            .catch(() => showHomeToast("게시글을 불러오지 못했습니다."));
        return;
    }

    if (communityEditButton && activeCommunityPost) {
        openCommunityComposer(activeCommunityPost);
        return;
    }

    if (communityDeleteButton) {
        deleteCommunityPost(communityDeleteButton);
        return;
    }

    if (communityListButton) {
        openHomeOverlay("community");
        return;
    }

    if (communityCloseButton) {
        closeHomeOverlay();
        return;
    }

    if (claimButton) {
        claimDailyQuest(claimButton);
        return;
    }

    if (logoutButton) {
        if (document.querySelector("[data-timer-resume-dialog]")) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        logout(logoutButton);
    }
});

// 슬라이더와 검색창처럼 입력 즉시 반영되는 이벤트
homeOverlayRoot?.addEventListener("input", (event) => {
    if (studyRecordsController.handleInput(event)) {
        return;
    }

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

homeOverlayRoot?.addEventListener("change", (event) => {
    const attachmentInput = event.target.closest("input[name='attachments']");
    if (!attachmentInput) {
        return;
    }

    const summary = attachmentInput.closest(".overlay-community-file-picker")
        ?.querySelector("[data-community-file-summary]");
    if (!summary) {
        return;
    }

    const files = Array.from(attachmentInput.files || []);
    summary.textContent = files.length
        ? `${files.length}개 파일 선택됨 · ${files.map((file) => file.name).join(", ")}`
        : "첨부할 이미지를 선택하세요.";
    updateSelectedCommunityAttachmentPreviews(attachmentInput);
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
bgmPlayer.init();
void refreshMenuAlerts();

const requestedOverlay = new URLSearchParams(window.location.search).get("overlay");
if (requestedOverlay === "settings") {
    openHomeOverlay("settings");
    const homeUrl = new URL(window.location.href);
    homeUrl.searchParams.delete("overlay");
    window.history.replaceState(
        window.history.state,
        "",
        `${homeUrl.pathname}${homeUrl.search}${homeUrl.hash}`
    );
} else if (window.OmagotchiInitialOverlay) {
    openHomeOverlay(window.OmagotchiInitialOverlay);
}
