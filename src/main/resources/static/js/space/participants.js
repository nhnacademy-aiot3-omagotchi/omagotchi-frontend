export const PARTICIPANT_CANDIDATE_STATUS = Object.freeze({
    AVAILABLE: Object.freeze({ label: "재실 중", selectable: true }),
    ALREADY_PARTICIPATING: Object.freeze({ label: "이미 참여 중입니다.", selectable: false }),
    PARTICIPATING_ELSEWHERE: Object.freeze({ label: "다른 회의에 참여 중입니다.", selectable: false }),
    UNAVAILABLE: Object.freeze({ label: "현재 추가할 수 없습니다.", selectable: false })
});

export function normalizeParticipants(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
        userId: String(item.userId),
        displayName: item.displayName || "사용자",
        isOccupier: Boolean(item.occupier)
    }));
}

export function normalizeParticipantCandidates(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
        userId: String(item.userId),
        displayName: item.displayName || "사용자",
        email: item.email || "",
        status: PARTICIPANT_CANDIDATE_STATUS[item.status]
            ? item.status
            : "UNAVAILABLE"
    }));
}

export function canAddParticipant({ ownedByRequester, participantCount, capacity }) {
    return Boolean(ownedByRequester) && participantCount < capacity;
}

export function isSelectableCandidate(candidate) {
    return Boolean(candidate)
        && Boolean(PARTICIPANT_CANDIDATE_STATUS[candidate.status]?.selectable);
}
