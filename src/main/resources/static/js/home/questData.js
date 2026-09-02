const QUEST_STATUSES = new Set(["IN_PROGRESS", "COMPLETED", "CLAIMED", "EXPIRED"]);
// 서버 QuestType 과 같은 값이다. AI 추천 퀘스트를 화면에서 따로 다루려면 이 값이 필요하다.
const QUEST_TYPES = new Set(["ROUTINE", "LLM"]);
export const AI_QUEST_TYPE = "LLM";

function isNonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function normalizeDailyQuest(quest) {
    if (!quest || typeof quest !== "object" || Array.isArray(quest)) return null;
    if (!Number.isSafeInteger(quest.id) || quest.id < 1) return null;
    if (typeof quest.title !== "string" || !quest.title.trim()) return null;
    if (!Number.isSafeInteger(quest.targetCount) || quest.targetCount < 1) return null;
    if (!isNonNegativeSafeInteger(quest.progressCount)
        || quest.progressCount > quest.targetCount) return null;
    if (!isNonNegativeSafeInteger(quest.rewardXp)) return null;
    if (!QUEST_STATUSES.has(quest.status)) return null;
    if (!QUEST_TYPES.has(quest.type)) return null;

    return {
        id: String(quest.id),
        type: quest.type,
        title: quest.title,
        targetCount: quest.targetCount,
        progressCount: quest.progressCount,
        rewardXp: quest.rewardXp,
        status: quest.status
    };
}

export function normalizeDailyQuests(payload) {
    if (!Array.isArray(payload)) return null;
    const quests = payload.map(normalizeDailyQuest);
    return quests.some((quest) => quest === null) ? null : quests;
}

function invoke(request) {
    return Promise.resolve().then(request);
}

export async function loadProgressResources(api, hasApprovedCohort) {
    const rankingRequest = hasApprovedCohort
        ? invoke(() => api.ranking.getToday())
        : Promise.resolve(null);
    const [home, quests, rankings] = await Promise.allSettled([
        invoke(() => api.gamification.getHome()),
        invoke(() => api.gamification.getDailyQuests()),
        rankingRequest
    ]);
    return {home, quests, rankings};
}
