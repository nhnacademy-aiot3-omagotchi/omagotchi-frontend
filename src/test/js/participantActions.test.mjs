import test from "node:test";
import assert from "node:assert/strict";
import {
  addParticipantAndRefresh,
  removeParticipantAndRefresh,
  searchParticipantCandidates
} from "../../main/resources/static/js/space/participantActions.js";

test("candidate search returns normalized results and supports no-result", async () => {
  const api = {
    async searchOccupancyParticipantCandidates(_spaceId, query) {
      return query === "없음" ? [] : [
        {userId: "user-1", displayName: "사용자", email: "user@example.com", status: "AVAILABLE"}
      ];
    }
  };

  assert.equal((await searchParticipantCandidates(api, "1", "사용자")).length, 1);
  assert.deepEqual(await searchParticipantCandidates(api, "1", "없음"), []);
});

test("participant addition refreshes server state after success", async () => {
  const calls = [];
  const api = {async addOccupancyParticipant(spaceId, userId) { calls.push([spaceId, userId]); }};

  await addParticipantAndRefresh(api, "1", "user-1", async () => calls.push("refresh"));

  assert.deepEqual(calls, [["1", "user-1"], "refresh"]);
});

test("participant removal refreshes server state after success", async () => {
  const calls = [];
  const api = {async removeOccupancyParticipant(spaceId, userId) { calls.push([spaceId, userId]); }};

  await removeParticipantAndRefresh(api, "1", "user-1", async () => calls.push("refresh"));

  assert.deepEqual(calls, [["1", "user-1"], "refresh"]);
});

test("API failure is propagated and does not refresh", async () => {
  let refreshed = false;
  const api = {async addOccupancyParticipant() { throw new Error("409 conflict"); }};

  await assert.rejects(
    addParticipantAndRefresh(api, "1", "user-1", async () => { refreshed = true; }),
    /409 conflict/
  );
  assert.equal(refreshed, false);
});
