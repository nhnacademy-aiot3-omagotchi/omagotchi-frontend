const QUEST_STATUSES = new Set(["IN_PROGRESS", "COMPLETED", "CLAIMED", "EXPIRED"]);
// 서버 QuestType 과 같은 값이다. AI 추천 퀘스트를 화면에서 따로 다루려면 이 값이 필요하다.
const QUEST_TYPES = new Set(["ROUTINE", "LLM"]);
// LLM 슬롯이 예측 기반 공부 시간 퀘스트 자리다. 이 타입만 AI 추천 카드로 올린다.
export const AI_QUEST_TYPE = "LLM";

export function isAiRecommendedQuest(quest) {
    return quest.type === AI_QUEST_TYPE;
}

function isNonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function normalizeDailyQuest(quest) {
    if (!quest || typeof quest !== "object" || Array.isArray(quest)) return null;
    if (!Number.isSafeInteger(quest.id) || quest.id < 1) return null;
    if (typeof quest.title !== "string" || !quest.title.trim()) return null;
    // code로 AI 슬롯 여부를 가르므로 없으면 렌더링하지 않는다. 슬롯 분기가 조용히 틀어지는 걸 막는다.
    if (typeof quest.code !== "string" || !quest.code.trim()) return null;
    if (!Number.isSafeInteger(quest.targetCount) || quest.targetCount < 1) return null;
    if (!isNonNegativeSafeInteger(quest.progressCount)
        || quest.progressCount > quest.targetCount) return null;
    if (!isNonNegativeSafeInteger(quest.rewardXp)) return null;
    if (!QUEST_STATUSES.has(quest.status)) return null;
    if (!QUEST_TYPES.has(quest.type)) return null;

    return {
        id: String(quest.id),
        type: quest.type,
        code: quest.code,
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
