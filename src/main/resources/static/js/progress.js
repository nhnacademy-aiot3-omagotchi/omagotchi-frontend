// 진행 화면의 탭, 콘텐츠, 보상 수령 상태 요소
const progressTabs = document.querySelectorAll("[data-progress-tab]");
const progressViews = document.querySelectorAll("[data-progress-view]");
const progressTitle = document.querySelector("[data-progress-title]");
const claimButtons = document.querySelectorAll("[data-claim-reward]");
const claimIndicator = document.querySelector("[data-claim-indicator]");

const progressTitles = {
    quests: "오늘의 퀘스트",
    achievements: "업적",
    leaders: "랭킹",
    timeline: "타임라인",
    stats: "통계"
};

// URL 해시와 선택 탭을 맞추고 해당 콘텐츠만 표시
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

    if (progressTitle) {
        progressTitle.textContent = progressTitles[nextTab];
    }

    if (location.hash.slice(1) !== nextTab) {
        history.replaceState(null, "", `#${nextTab}`);
    }
}

// 받을 수 있는 퀘스트가 있을 때 메뉴 알림 표시
function updateClaimIndicator() {
    const hasClaimableQuest = Boolean(document.querySelector(".quest-item.is-claimable:not(.is-claimed)"));

    if (claimIndicator) {
        claimIndicator.hidden = !hasClaimableQuest;
    }
}

// 진행 탭 전환
progressTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        setActiveProgressTab(tab.dataset.progressTab);
    });
});

// 퀘스트 보상 수령 상태를 브라우저에 저장
claimButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const quest = button.closest(".quest-item");

        if (!quest) {
            return;
        }

        quest.classList.add("is-claimed");
        quest.classList.remove("is-claimable");
        localStorage.setItem(`omagotchiQuestClaimed:${quest.dataset.questId}`, "true");
        updateClaimIndicator();
    });
});

// 새로고침 후에도 이미 받은 퀘스트 상태 복원
document.querySelectorAll(".quest-item[data-quest-id]").forEach((quest) => {
    if (localStorage.getItem(`omagotchiQuestClaimed:${quest.dataset.questId}`) === "true") {
        quest.classList.add("is-claimed");
        quest.classList.remove("is-claimable");
    }
});

// URL 해시를 기준으로 진행 화면 초기화
setActiveProgressTab(location.hash.slice(1) || "quests");
updateClaimIndicator();
