import assert from "node:assert/strict";
import test from "node:test";

async function withSpaceRoom(callback, savedState = null) {
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;

    globalThis.window = {
        addEventListener() {},
        setInterval() {
            return 1;
        },
        OmagotchiProfile: {},
        OmagotchiCharacterAssets: null
    };
    globalThis.sessionStorage = {
        getItem() {
            return savedState == null ? null : JSON.stringify(savedState);
        },
        setItem() {}
    };

    try {
        await import(`../../main/resources/static/js/spaceRoom.js?test=${Date.now()}`);
        await callback(globalThis.window.OmagotchiSpaceRoom);
    } finally {
        globalThis.window = originalWindow;
        globalThis.sessionStorage = originalSessionStorage;
    }
}

function createRoot() {
    const listeners = {};
    return {
        addEventListener(type, listener) {
            listeners[type] = listener;
        },
        async click(target) {
            await listeners.click?.({ target });
        },
        dataset: {},
        innerHTML: "",
        isConnected: true
    };
}

function roomCards(html) {
    return [...html.matchAll(/<article class="ui-space-room-card[^]*?<\/article>/g)]
        .map(([card]) => card);
}

test("spaceRoom initializes and exposes updateData", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        assert.ok(spaceRoom);
        assert.equal(typeof spaceRoom.updateData, "function");
    });
});

test("updateData renders external rooms instead of stale loading or error state", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = {
            spaces: {
                async list() {
                    throw new Error("기존 공간 조회 실패");
                },
                async getMyVacancyAlerts() {
                    return [];
                }
            }
        };
        spaceRoom.mount(root);
        await new Promise(setImmediate);

        assert.match(root.innerHTML, /회의실 정보를 불러오지 못했습니다/);

        spaceRoom.updateData({
            rooms: [{ id: "room-1", name: "회의실 1", capacity: 8 }]
        });

        assert.match(root.innerHTML, /회의실 1/);
        assert.doesNotMatch(root.innerHTML, /회의실 정보를 불러오는 중입니다/);
        assert.doesNotMatch(root.innerHTML, /회의실 정보를 불러오지 못했습니다/);
    });
});

test("occupier sees sensor information instead of the duplicate participant summary", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = {
            spaces: {
                async list() {
                    return [];
                },
                async getMyVacancyAlerts() {
                    return [];
                }
            }
        };
        spaceRoom.mount(root);
        await new Promise(setImmediate);

        spaceRoom.updateData({
            rooms: [{
                id: "room-1",
                name: "회의실 1",
                capacity: 8,
                occupancy: {
                    sameCohort: true,
                    ownedByRequester: true,
                    participatingByRequester: true,
                    participantCount: 1,
                    participants: [{ displayName: "점유자", isOccupier: true }]
                }
            }]
        });

        assert.match(root.innerHTML, /space-room-detail-sensors/);
        assert.match(root.innerHTML, /CO₂|온도|습도/);
        assert.doesNotMatch(root.innerHTML, /점유자 · 점유자/);
        assert.match(root.innerHTML, /data-space-extend="room-1"/);
        assert.match(root.innerHTML, /data-space-release="room-1"/);
    }, { selectedRoomId: "room-1" });
});

test("occupier manages every participant without the duplicate participant summary", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = { spaces: { async list() { return new Promise(() => {}); }, async getMyVacancyAlerts() { return []; } } };
        spaceRoom.mount(root);
        spaceRoom.updateData({ rooms: [{
            id: "room-1", name: "회의실 1", capacity: 8,
            sensor: { co2: 500, temperature: 24, humidity: 40 },
            occupancy: {
                sameCohort: true, ownedByRequester: true, participatingByRequester: true, participantCount: 2,
                participants: [
                    { displayName: "점유자", isOccupier: true },
                    { displayName: "참여자", isOccupier: false }
                ]
            }
        }] });

        assert.match(root.innerHTML, /점유자 \(나\)/);
        assert.match(root.innerHTML, /<span>참여자<\/span>/);
    }, { selectedRoomId: "room-1" });
});

test("participant keeps seeing the current participant list", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = { spaces: { async list() { return []; }, async getMyVacancyAlerts() { return []; } } };
        spaceRoom.mount(root);
        await new Promise(setImmediate);
        spaceRoom.updateData({ rooms: [{
            id: "room-1", name: "회의실 1", capacity: 8,
            sensor: { co2: 500, temperature: 24, humidity: 40 },
            occupancy: {
                sameCohort: true, ownedByRequester: false, participatingByRequester: true, participantCount: 1,
                participants: [{ displayName: "점유자", isOccupier: true }]
            }
        }] });

        assert.match(root.innerHTML, /점유자 · 점유자/);
        assert.match(root.innerHTML, /500ppm|24℃|40%/);
    }, { selectedRoomId: "room-1" });
});

test("same-cohort non-participant sees only the participant count", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = { spaces: { async list() { return new Promise(() => {}); }, async getMyVacancyAlerts() { return []; } } };
        spaceRoom.mount(root);
        spaceRoom.updateData({ rooms: [{
            id: "room-1", name: "회의실 1", capacity: 8,
            occupancy: {
                sameCohort: true, ownedByRequester: false, participatingByRequester: false, participantCount: 1,
                participants: [{ displayName: "비공개 점유자", isOccupier: true }]
            }
        }] });

        assert.match(root.innerHTML, /현재 참여자/);
        assert.match(root.innerHTML, /1 \/ 8명/);
        assert.doesNotMatch(root.innerHTML, /같은 기수의 참여 인원만 표시합니다/);
        assert.doesNotMatch(root.innerHTML, /비공개 점유자/);
    }, { selectedRoomId: "room-1" });
});

test("available meeting shows the shared sensor information", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = {
            spaces: {
                async list() { return new Promise(() => {}); },
                async getMyVacancyAlerts() { return []; }
            }
        };
        spaceRoom.mount(root);

        spaceRoom.updateData({
            rooms: [{
                id: "room-1",
                name: "회의실 1",
                capacity: 8,
                sensor: { co2: 500, temperature: 24, humidity: 40 }
            }]
        });

        assert.doesNotMatch(root.innerHTML, /MY PARTY/);
        assert.match(root.innerHTML, /space-room-detail-sensors/);
        assert.match(root.innerHTML, /CO₂|500ppm|24℃|40%/);
        assert.match(root.innerHTML, /회의실 1/);
        assert.match(root.innerHTML, /8인실/);
        assert.match(root.innerHTML, /회의실 사용/);
    }, { selectedRoomId: "room-1" });
});

test("meeting list renders only rooms and changes the selected detail", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = {
            spaces: {
                async list() { return new Promise(() => {}); },
                async getMyVacancyAlerts() { return []; }
            }
        };
        spaceRoom.mount(root);
        spaceRoom.updateData({
            rooms: [
                { id: "room-a", name: "회의실A", capacity: 8 },
                { id: "room-b", name: "회의실B", capacity: 6 },
                { id: "room-c", name: "회의실C", capacity: 4 }
            ]
        });

        assert.match(root.innerHTML, /회의실 목록/);
        assert.doesNotMatch(root.innerHTML, /공간 목록|공간 추가 예정|관리자 준비 중/);
        assert.equal((root.innerHTML.match(/role="listitem"/g) || []).length, 3);
        assert.match(root.innerHTML, /회의실A/);
        assert.match(root.innerHTML, /회의실B/);
        assert.match(root.innerHTML, /회의실C/);
        assert.match(root.innerHTML, /class="ui-space-room-card is-available is-selected"/);
        assert.equal(roomCards(root.innerHTML).length, 3);
        roomCards(root.innerHTML).forEach((card) => {
            assert.doesNotMatch(card, /data-space-occupy|data-space-alert|회의실 사용|>입장</);
        });
        assert.match(root.innerHTML, /data-space-occupy="room-a">\s*회의실 사용/);

        await root.click({
            matches() { return false; },
            closest(selector) {
                return selector === "[data-space-select-room]"
                    ? { dataset: { spaceSelectRoom: "room-b" } }
                    : null;
            }
        });

        assert.match(root.innerHTML, /class="ui-space-room-card is-available is-selected"[^>]*data-space-select-room="room-b"/);
        assert.match(root.innerHTML, /<h3>회의실B<\/h3>/);
        assert.match(root.innerHTML, /data-space-occupy="room-b">\s*회의실 사용/);
    }, { selectedRoomId: "room-a" });
});

test("meeting list shows a non-interactive empty state when no rooms exist", async () => {
    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        globalThis.window.OmagotchiApi = {
            spaces: {
                async list() { return new Promise(() => {}); },
                async getMyVacancyAlerts() { return []; }
            }
        };
        spaceRoom.mount(root);
        spaceRoom.updateData({ rooms: [] });

        assert.match(root.innerHTML, /회의실 목록/);
        assert.match(root.innerHTML, /등록된 회의실이 없습니다/);
        assert.doesNotMatch(root.innerHTML, /공간 추가 예정|role="listitem"/);
    });
});
