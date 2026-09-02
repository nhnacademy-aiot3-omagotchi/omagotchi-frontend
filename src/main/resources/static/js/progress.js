import {
    lastClosedRankingDate,
    normalizeStudyRanking,
    rankingCoverageLabel,
    rankingPeriodLabel,
    requestStudyRanking
} from "./home/rankingData.js?v=20260903-1";

// 독립 진행 화면도 홈 오버레이와 동일한 BFF 데이터를 사용한다.
const progressTabs = document.querySelectorAll("[data-progress-tab]");
const progressViews = document.querySelectorAll("[data-progress-view]");
const progressTitle = document.querySelector("[data-progress-title]");
const questList = document.querySelector("[data-progress-quests]");
const rankingList = document.querySelector("[data-progress-ranking]");
const myRankingCard = document.querySelector("[data-progress-my-ranking]");
const rankingMeta = document.querySelector("[data-ranking-meta]");
const rankingPeriodButtons = document.querySelectorAll("[data-ranking-period]");
const rankingDateInput = document.querySelector("[data-ranking-date]");
const rankingDateField = document.querySelector("[data-ranking-date-field]");
const stats = document.querySelector("[data-progress-stats]");
const claimIndicator = document.querySelector("[data-claim-indicator]");
const api = window.OmagotchiApi;

const progressTitles = {
    quests: "오늘의 퀘스트",
    achievements: "업적",
    leaders: "랭킹",
    timeline: "타임라인",
    stats: "통계"
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function setActiveProgressTab(tabName) {
    const nextTab = progressTitles[tabName] ? tabName : "quests";

    progressTabs.forEach((tab) => {
        const isActive = tab.dataset.progressTab === nextTab;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });

    progressViews.forEach((view) => {
        const isActive = view.dataset.progressView === nextTab;
        view.classList.toggle("is-active", isActive);
        view.hidden = !isActive;
    });

    if (progressTitle) progressTitle.textContent = progressTitles[nextTab];
    if (location.hash.slice(1) !== nextTab) history.replaceState(null, "", `#${nextTab}`);
}

function updateClaimIndicator() {
    if (!claimIndicator) return;
    claimIndicator.hidden = !questList?.querySelector(".quest-item.is-claimable");
}

function renderQuests(quests) {
    if (!questList) return;
    const dailyQuests = Array.isArray(quests) ? quests : [];
    questList.innerHTML = dailyQuests.length ? dailyQuests.map((quest) => {
        const progress = Math.max(0, Number(quest.progressCount) || 0);
        const target = Math.max(0, Number(quest.targetCount) || 0);
        const percentage = target ? Math.min(100, Math.round(progress / target * 100)) : 0;
        const claimable = quest.status === "COMPLETED";
        const claimed = quest.status === "CLAIMED";
        return `
            <article class="task-item quest-item${claimable ? " is-claimable" : ""}${claimed ? " is-claimed" : ""}">
                <div>
                    <h3>${escapeHtml(quest.title)}</h3>
                    <p>${escapeHtml(quest.description || "오늘의 퀘스트")}</p>
                </div>
                <span class="reward">+${Math.max(0, Number(quest.rewardXp) || 0)}xp</span>
                <div class="progress-line"><span style="width: ${percentage}%"></span></div>
                <div class="quest-progress">${progress} / ${target}</div>
                ${claimable
                    ? `<button class="claim-button" type="button" data-claim-reward="${escapeHtml(quest.id)}">보상 받기</button>`
                    : ""}
                ${claimed ? '<p class="claimed-label" style="display:block">수령 완료</p>' : ""}
            </article>`;
    }).join("") : `
        <article class="task-item quest-item">
            <div><h3>등록된 퀘스트가 없습니다.</h3><p>오늘 제공된 퀘스트가 없습니다.</p></div>
        </article>`;
    updateClaimIndicator();
}

function renderRanking(result, period = "TODAY", dailyDate = null) {
    if (!rankingList) return;
    if (myRankingCard) {
        myRankingCard.hidden = true;
        myRankingCard.innerHTML = "";
    }
    if (result?.status !== "fulfilled") {
        if (rankingMeta) rankingMeta.textContent = "조회 실패";
        rankingList.innerHTML = '<li data-empty-ranking><strong>!</strong><span>랭킹을 불러오지 못했습니다.</span><em>다시 시도</em></li>';
        return;
    }
    const ranking = normalizeStudyRanking(result.value, period);
    if (ranking === null || ranking.period !== period) {
        if (rankingMeta) rankingMeta.textContent = "응답 오류";
        rankingList.innerHTML = '<li data-empty-ranking><strong>!</strong><span>랭킹 응답을 확인할 수 없습니다.</span><em>잠시 후 재시도</em></li>';
        return;
    }
    if (rankingMeta) {
        rankingMeta.textContent = `${rankingPeriodLabel(period, dailyDate)} · ${rankingCoverageLabel(period, ranking.includedThroughDate)} · ${ranking.rankedMemberCount}명 참여`;
    }
    const mine = ranking.myRanking.ranked ? ranking.myRanking.ranking : null;
    const rows = ranking.entries.map((entry) => `
        <li>
            <strong>${entry.rank}</strong>
            <span>${escapeHtml(entry.displayName || `수강생 (${entry.rank}위)`)}</span>
            <em>${formatDuration(entry.studySeconds)}${entry.timerRunning ? " · 진행 중" : ""}</em>
        </li>`).join("");
    rankingList.innerHTML = rows
        ? rows
        : `<li data-empty-ranking><strong>-</strong><span>${rankingPeriodLabel(period, dailyDate)} 학습 기록이 아직 없습니다.</span><em>0명</em></li>`;
    if (mine !== null && myRankingCard) {
        myRankingCard.hidden = false;
        myRankingCard.innerHTML = `<strong>내 순위 ${mine.rank}위</strong><span>${escapeHtml(mine.displayName || "대표 캐릭터 미설정")}</span><em>${formatDuration(mine.studySeconds)}${mine.timerRunning ? " · 진행 중" : ""}</em>`;
    }
}

function renderStats(profile, home) {
    if (!stats) return;
    const profileAvailable = profile && typeof profile === "object";
    const levelValue = home?.growth?.level ?? profile?.currentCharacter?.level;
    const level = Number.isFinite(Number(levelValue)) ? `Lv ${Number(levelValue)}` : "—";
    stats.innerHTML = `
        <article class="stat-card"><h3>총 학습 시간</h3><strong>${profileAvailable ? formatDuration(profile.totalStudySeconds) : "—"}</strong><p>저장된 전체 학습 기록</p></article>
        <article class="stat-card"><h3>완료 세션</h3><strong>${profileAvailable ? `${Math.max(0, Number(profile.completedSessionCount) || 0)}회` : "—"}</strong><p>저장 완료된 학습 세션</p></article>
        <article class="stat-card"><h3>연속 출석</h3><strong>${profileAvailable ? `${Math.max(0, Number(profile.attendanceStreakDays) || 0)}일` : "—"}</strong><p>평일 출석 기록 기준</p></article>
        <article class="stat-card"><h3>캐릭터 레벨</h3><strong>${level}</strong><p>현재 성장 단계</p></article>`;
}

function renderProgressFailure() {
    if (questList) {
        questList.innerHTML = '<article class="task-item quest-item"><div><h3>퀘스트를 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p></div></article>';
    }
    if (stats) {
        stats.innerHTML = '<article class="stat-card"><h3>학습 통계</h3><strong>불러오기 실패</strong><p>잠시 후 다시 시도해 주세요.</p></article>';
    }
    updateClaimIndicator();
}

async function loadProgress() {
    if (
        typeof api?.gamification?.getHome !== "function"
        || typeof api?.gamification?.getDailyQuests !== "function"
        || typeof api?.profile?.get !== "function"
    ) {
        renderProgressFailure();
        return;
    }

    const [homeResult, questResult, profileResult] = await Promise.allSettled([
        api.gamification.getHome(),
        api.gamification.getDailyQuests(),
        api.profile.get()
    ]);

    if (questResult.status === "fulfilled") {
        renderQuests(questResult.value);
    } else if (questList) {
        questList.innerHTML = '<article class="task-item quest-item"><div><h3>퀘스트를 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p></div></article>';
        updateClaimIndicator();
    }

    renderStats(
        profileResult.status === "fulfilled" ? profileResult.value : null,
        homeResult.status === "fulfilled" ? homeResult.value : null
    );
}

progressTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveProgressTab(tab.dataset.progressTab));
});

let rankingRequestSequence = 0;
if (rankingDateInput) rankingDateInput.max = lastClosedRankingDate();

async function loadRankingPeriod(period, dailyDate = null) {
    const requestSequence = ++rankingRequestSequence;
    if (rankingMeta) rankingMeta.textContent = `${rankingPeriodLabel(period, dailyDate)} · 불러오는 중`;
    if (rankingList) {
        rankingList.innerHTML = '<li data-empty-ranking><strong>-</strong><span>랭킹을 불러오는 중입니다.</span><em>대기</em></li>';
    }
    try {
        const value = await requestStudyRanking(api, period, new Date(), dailyDate);
        if (requestSequence !== rankingRequestSequence) return;
        renderRanking({status: "fulfilled", value}, period, dailyDate);
    } catch (error) {
        if (requestSequence !== rankingRequestSequence) return;
        renderRanking({status: "rejected", reason: error}, period, dailyDate);
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

questList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-claim-reward]");
    if (!button) return;
    button.disabled = true;
    try {
        await api.gamification.claimQuest(button.dataset.claimReward);
        await loadProgress();
    } catch (error) {
        button.disabled = false;
        window.alert(error?.message || "퀘스트 보상을 받지 못했습니다.");
    }
});

setActiveProgressTab(location.hash.slice(1) || "quests");
updateClaimIndicator();
loadProgress().catch(() => {});
loadRankingPeriod("TODAY");
