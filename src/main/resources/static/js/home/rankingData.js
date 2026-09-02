const PERIODS = new Set(["TODAY", "DAILY", "WEEKLY", "MONTHLY"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KST_AGGREGATION_OFFSET_MS = 4 * 60 * 60 * 1000;

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function normalizeOptionalText(value) {
    if (value === null || value === undefined) return null;
    return typeof value === "string" ? value : undefined;
}

function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    if (!isPositiveInteger(entry.rank) || !isPositiveInteger(entry.studySeconds)) return null;
    if (entry.displayName !== null && typeof entry.displayName !== "string") return null;
    if (entry.timerRunning !== null
        && entry.timerRunning !== undefined
        && typeof entry.timerRunning !== "boolean") return null;
    const characterType = normalizeOptionalText(entry.characterType);
    const colorId = normalizeOptionalText(entry.colorId);
    if (characterType === undefined || colorId === undefined) return null;
    const attendanceStreakDays = entry.attendanceStreakDays ?? 0;
    if (!isNonNegativeInteger(attendanceStreakDays)) return null;
    return {
        rank: entry.rank,
        displayName: entry.displayName,
        studySeconds: entry.studySeconds,
        timerRunning: entry.timerRunning === true,
        characterType,
        colorId,
        attendanceStreakDays
    };
}

export function normalizeStudyRanking(payload, expectedPeriod = payload?.period) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    if (!PERIODS.has(expectedPeriod)) return null;
    if (payload.period !== null
        && payload.period !== undefined
        && payload.period !== expectedPeriod) return null;
    if (!isNonNegativeInteger(payload.rankedMemberCount)
        || !isNonNegativeInteger(payload.returnedEntryCount)
        || !Array.isArray(payload.entries)
        || payload.returnedEntryCount !== payload.entries.length
        || payload.rankedMemberCount < payload.entries.length) return null;

    const entries = payload.entries.map(normalizeEntry);
    if (entries.some((entry) => entry === null)) return null;
    for (let index = 1; index < entries.length; index += 1) {
        if (entries[index].rank < entries[index - 1].rank
            || entries[index].studySeconds > entries[index - 1].studySeconds) return null;
    }

    const mine = payload.myRanking;
    if (!mine || typeof mine !== "object" || typeof mine.ranked !== "boolean") return null;
    const myEntry = mine.ranking === null ? null : normalizeEntry(mine.ranking);
    if ((mine.ranked && myEntry === null) || (!mine.ranked && mine.ranking !== null)) return null;

    return {
        period: expectedPeriod,
        aggregationDate: payload.aggregationDate ?? null,
        calculatedAt: payload.calculatedAt ?? null,
        startDate: payload.startDate ?? null,
        includedThroughDate: payload.includedThroughDate ?? null,
        rankedMemberCount: payload.rankedMemberCount,
        entries,
        myRanking: {ranked: mine.ranked, ranking: myEntry}
    };
}

function addDays(isoDate, amount) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}

function isValidIsoDate(value) {
    if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Learning과 동일한 KST 04:00 기준의 현재 집계일. */
export function currentRankingAggregationDate(now = new Date()) {
    const shifted = new Date(now.getTime() - KST_AGGREGATION_OFFSET_MS);
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(shifted);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

/** 일간 랭킹 API가 받을 수 있는 마지막 확정 집계일. */
export function lastClosedRankingDate(now = new Date()) {
    return addDays(currentRankingAggregationDate(now), -1);
}

function currentWeekStart(now) {
    const date = new Date(`${currentRankingAggregationDate(now)}T00:00:00Z`);
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return date.toISOString().slice(0, 10);
}

function currentMonth(now) {
    return currentRankingAggregationDate(now).slice(0, 7);
}

export function requestStudyRanking(api, period, now = new Date(), dailyDate = null) {
    switch (period) {
        case "TODAY":
            return api.ranking.getToday();
        case "DAILY":
            if (!isValidIsoDate(dailyDate) || dailyDate > lastClosedRankingDate(now)) {
                return Promise.reject(new TypeError("확정된 과거 집계일을 선택해 주세요."));
            }
            return api.ranking.getDaily(dailyDate);
        case "WEEKLY":
            return api.ranking.getWeekly(currentWeekStart(now));
        case "MONTHLY":
            return api.ranking.getMonthly(currentMonth(now));
        default:
            return Promise.reject(new TypeError(`지원하지 않는 랭킹 기간입니다: ${period}`));
    }
}

export function rankingPeriodLabel(period, dailyDate = null) {
    if (period === "DAILY" && isValidIsoDate(dailyDate)) {
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date(`${dailyDate}T00:00:00Z`));
    }
    if (period === "WEEKLY") return "이번 주";
    if (period === "MONTHLY") return "이번 달";
    return "오늘";
}

export function rankingCoverageLabel(period, includedThroughDate = null) {
    if (period === "TODAY") return "실시간";
    if (period === "DAILY") return "확정 집계";
    if (!isValidIsoDate(includedThroughDate)) return "집계 대기";

    const dateLabel = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "UTC",
        month: "long",
        day: "numeric"
    }).format(new Date(`${includedThroughDate}T00:00:00Z`));
    return `${dateLabel}까지 집계`;
}
