import test from "node:test";
import assert from "node:assert/strict";
import {
  canAddParticipant,
  isSelectableCandidate,
  normalizeParticipantCandidates,
  normalizeParticipants
} from "../../main/resources/static/js/space/participants.js";

test("normalizes current participant details from the server", () => {
  assert.deepEqual(normalizeParticipants([
    {userId: "occupier", displayName: "점유자", occupier: true},
    {userId: "member", displayName: "참여자", occupier: false}
  ]), [
    {userId: "occupier", displayName: "점유자", isOccupier: true},
    {userId: "member", displayName: "참여자", isOccupier: false}
  ]);
});

test("only AVAILABLE candidates can be selected", () => {
  const candidates = normalizeParticipantCandidates([
    {userId: "available", displayName: "가능", email: "a@example.com", status: "AVAILABLE"},
    {userId: "current", displayName: "참여중", email: "b@example.com", status: "ALREADY_PARTICIPATING"},
    {userId: "other", displayName: "다른회의", email: "c@example.com", status: "PARTICIPATING_ELSEWHERE"}
  ]);

  assert.equal(isSelectableCandidate(candidates[0]), true);
  assert.equal(isSelectableCandidate(candidates[1]), false);
  assert.equal(isSelectableCandidate(candidates[2]), false);
});

test("only an occupier with remaining capacity can add a participant", () => {
  assert.equal(canAddParticipant({ownedByRequester: true, participantCount: 1, capacity: 8}), true);
  assert.equal(canAddParticipant({ownedByRequester: false, participantCount: 1, capacity: 8}), false);
  assert.equal(canAddParticipant({ownedByRequester: true, participantCount: 8, capacity: 8}), false);
});

test("invalid server collections become safe empty arrays", () => {
  assert.deepEqual(normalizeParticipants(null), []);
  assert.deepEqual(normalizeParticipantCandidates(undefined), []);
});
