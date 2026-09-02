import assert from "node:assert/strict";
import test from "node:test";

async function withSpaceRoom(callback, savedState = null, profile = {}, api = null) {
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;

    globalThis.window = {
        addEventListener() {},
        setInterval() {
            return 1;
        },
        OmagotchiProfile: profile,
        OmagotchiCharacterAssets: null,
        OmagotchiApi: api
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
        querySelector() {
            return null;
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

test("lab tab appears before meeting and lists only the current cohort labs", async () => {
    const api = {
        attendance: {
            async getToday() {
                return { checkedInAt: "2026-09-01T09:00:00Z", checkedOutAt: null };
            }
        },
        spaces: {
            async list() {
                return [
                    { spaceId: 101, name: "3기 실습실 A", type: "LAB", capacity: 30, operationalStatus: "ACTIVE", cohortId: 3 },
                    { spaceId: 102, name: "3기 실습실 B", type: "LAB", capacity: 20, operationalStatus: "INACTIVE", inactiveReason: "정비 중", cohortId: 3 },
                    { spaceId: 201, name: "4기 실습실", type: "LAB", capacity: 25, operationalStatus: "ACTIVE", cohortId: 4 },
                    { spaceId: 301, name: "공용 회의실", type: "MEETING", capacity: 8, operationalStatus: "ACTIVE", status: "AVAILABLE" }
                ];
            },
            async getMyVacancyAlerts() {
                return [];
            }
        }
    };

    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        spaceRoom.mount(root);
        await new Promise(setImmediate);

        const labTabIndex = root.innerHTML.indexOf(">실습실</button>");
        const meetingTabIndex = root.innerHTML.indexOf(">회의실</button>");
        assert.ok(labTabIndex >= 0 && labTabIndex < meetingTabIndex);
        assert.match(root.innerHTML, /3기 실습실 A/);
        assert.match(root.innerHTML, /3기 실습실 B/);
        assert.match(root.innerHTML, /2곳 배정/);
        assert.match(root.innerHTML, /운영 중지/);
        assert.match(root.innerHTML, /선택 가능/);
        assert.match(root.innerHTML, /선택 불가/);
        assert.doesNotMatch(root.innerHTML, /입실 중/);
        assert.doesNotMatch(root.innerHTML, /4기 실습실/);
        assert.match(root.innerHTML, /현재 내 위치/);
        assert.match(root.innerHTML, /실습실을 선택해 주세요/);
    }, { activeTab: "lab" }, {
        approvedCohort: { cohortId: 3, name: "3기" }
    }, api);
});

test("library uses the shared current location and keeps its action under operational status", async () => {
    const api = {
        attendance: {
            async getToday() {
                return { checkedInAt: "2026-09-01T09:00:00Z", checkedOutAt: null };
            }
        },
        spaces: {
            async list() {
                return [];
            },
            async getMyVacancyAlerts() {
                return [];
            }
        }
    };

    await withSpaceRoom(async (spaceRoom) => {
        const root = createRoot();
        spaceRoom.mount(root);
        await new Promise(setImmediate);

        assert.match(root.innerHTML, /운영 상태/);
        assert.match(root.innerHTML, /정상 운영/);
        assert.match(root.innerHTML, /data-space-library-toggle>[\s\S]*도서관 입장/);
        assert.doesNotMatch(root.innerHTML, /현재 이용/);
        assert.doesNotMatch(root.innerHTML, /내 상태/);

        await root.click({
            matches() {
                return false;
            },
            closest(selector) {
                return selector === "[data-space-library-toggle]" ? { dataset: {} } : null;
            }
        });

        assert.match(root.innerHTML, /data-location-state="library"/);
        assert.match(root.innerHTML, /현재 내 위치/);
        assert.match(root.innerHTML, /도서관 이용 중/);
        assert.match(root.innerHTML, /도서관 나가기/);
    }, { activeTab: "library" }, {
        approvedCohort: { cohortId: 3, name: "3기" }
    }, api);
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
