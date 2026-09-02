import { escapeHtml, formatDuration } from "./utils.js";
import { streakWingSrc } from "./characterWing.js";

/* 랭킹 시상대 마크업.
 *
 * 상위 3명은 시상대 카드, 4위부터는 목록으로 그린다.
 * 서버 응답의 displayName·캐릭터·스트릭은 모두 비어 있을 수 있으므로 값마다 대체를 둔다.
 * 항목 하나가 계약을 어겼다고 버리면 랭킹에서 사람이 통째로 사라지므로 그렇게 하지 않는다.
 */
const RANK_MEDALS = ["gold", "silver", "bronze"];
// 시상대는 2위·1위·3위 순서로 세운다. 1위가 가운데에 와야 한다.
const PODIUM_ORDER = [1, 0, 2];
const FALLBACK_RANK_CHARACTER = "/images/characters/study/study.png";

/**
 * 캐릭터 이미지 경로 조립기.
 *
 * characterAssets.js 는 전역으로 올라오고 로드 순서가 보장되지 않으므로
 * 모듈 로드 시점이 아니라 호출 시점에 읽는다. 없으면 기본 캐릭터로 대체한다.
 */
function characterAssets() {
    return typeof window === "undefined" ? null : window.OmagotchiCharacterAssets;
}

/**
 * 대표 캐릭터 이미지.
 *
 * characterType은 이미지 폴더명, colorId는 그 안의 파일을 고른다.
 * 대표 캐릭터가 없는 사용자는 둘 다 null로 내려오므로 기본 캐릭터를 쓴다.
 */
export function rankingCharacterImage(entry) {
    const characterType = typeof entry?.characterType === "string" && entry.characterType.trim()
        ? entry.characterType.trim()
        : "";
    if (!characterType) return FALLBACK_RANK_CHARACTER;

    const colorId = typeof entry.colorId === "string" && entry.colorId.trim()
        ? entry.colorId.trim()
        : "original";
    return characterAssets()?.getPng?.(characterType, colorId) || FALLBACK_RANK_CHARACTER;
}

/** 랭킹 한 줄을 그릴 수 있는 형태로 정리한다. 계약 위반 값은 버리지 않고 대체한다. */
export function normalizeRankingEntry(entry, index = 0) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

    const rawRank = Number(entry.rank);
    const rank = Number.isFinite(rawRank) && rawRank > 0 ? Math.floor(rawRank) : index + 1;
    const studySeconds = Math.max(0, Math.floor(Number(entry.studySeconds) || 0));
    const name = typeof entry.displayName === "string" && entry.displayName.trim()
        ? entry.displayName.trim()
        : `수강생 (${rank}위)`;

    return {
        rank,
        name,
        studyTime: formatDuration(studySeconds),
        characterImage: rankingCharacterImage(entry),
        wingImage: streakWingSrc(entry.attendanceStreakDays)
    };
}

/** 캐릭터와 날개를 겹쳐 놓는다. 날개는 없을 수 있다. */
function rankAvatarHtml(entry) {
    const wing = entry.wingImage
        ? `<img class="rank-avatar-wing" src="${escapeHtml(entry.wingImage)}" alt="" aria-hidden="true" />`
        : "";
    return `<span class="rank-avatar">${wing}`
        + `<img class="rank-avatar-character" src="${escapeHtml(entry.characterImage)}" alt="" /></span>`;
}

function rankPodiumCardHtml(entry, medalIndex) {
    const medal = RANK_MEDALS[medalIndex] || "gold";
    return `
        <article class="rank-podium-card is-${medal}" data-rank="${escapeHtml(entry.rank)}">
            ${rankAvatarHtml(entry)}
            <span class="rank-podium-medal">${escapeHtml(entry.rank)}</span>
            <strong class="rank-podium-name">${escapeHtml(entry.name)}</strong>
            <em class="rank-podium-time">${escapeHtml(entry.studyTime)}</em>
        </article>`;
}

function rankRowHtml(entry) {
    return `
        <li class="rank-row">
            <span class="rank-row-number">${escapeHtml(entry.rank)}</span>
            ${rankAvatarHtml(entry)}
            <strong class="rank-row-name">${escapeHtml(entry.name)}</strong>
            <em class="rank-row-time">${escapeHtml(entry.studyTime)}</em>
        </li>`;
}

/** 시상대 + 목록 전체. 인원이 1~2명뿐이어도 배치가 무너지지 않아야 한다. */
export function renderRankingBoard(rawEntries) {
    const entries = (Array.isArray(rawEntries) ? rawEntries : [])
        .map(normalizeRankingEntry)
        .filter((entry) => entry !== null);

    if (!entries.length) {
        return `<p class="rank-empty" data-empty-ranking>랭킹 데이터가 없습니다.</p>`;
    }

    const top = entries.slice(0, 3);
    // 자리가 비어도 순서를 지켜야 1위가 가운데에 남는다. 없는 자리는 빈 칸으로 채운다.
    const podium = PODIUM_ORDER.map((index) => (
        top[index]
            ? rankPodiumCardHtml(top[index], index)
            : `<div class="rank-podium-slot" aria-hidden="true"></div>`
    )).join("");

    const rest = entries.slice(3);
    const restHtml = rest.length
        ? `<ol class="rank-rest" aria-label="4위 이하 순위">${rest.map(rankRowHtml).join("")}</ol>`
        : "";

    return `<div class="rank-podium" data-rank-podium>${podium}</div>${restHtml}`;
}
