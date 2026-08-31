import assert from "node:assert/strict";
import test from "node:test";

test("spaceRoom initializes and exposes updateData", async () => {
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;

    globalThis.window = {
        addEventListener() {},
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

        assert.ok(globalThis.window.OmagotchiSpaceRoom);
        assert.equal(typeof globalThis.window.OmagotchiSpaceRoom.updateData, "function");
    } finally {
        globalThis.window = originalWindow;
        globalThis.sessionStorage = originalSessionStorage;
    }
});
