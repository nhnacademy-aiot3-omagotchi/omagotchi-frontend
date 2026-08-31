import { normalizeParticipantCandidates } from "./participants.js";

export async function searchParticipantCandidates(api, spaceId, query) {
    const result = await api.searchOccupancyParticipantCandidates(spaceId, query);
    return normalizeParticipantCandidates(result);
}

export async function addParticipantAndRefresh(api, spaceId, targetUserId, refresh) {
    await api.addOccupancyParticipant(spaceId, targetUserId);
    await refresh();
}

export async function removeParticipantAndRefresh(api, spaceId, targetUserId, refresh) {
    await api.removeOccupancyParticipant(spaceId, targetUserId);
    await refresh();
}
