import assert from "node:assert/strict";
import test from "node:test";

async function withSpaceRoom(callback) {
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
            return null;
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
    return {
        addEventListener() {},
        dataset: {},
        innerHTML: "",
        isConnected: true
    };
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
