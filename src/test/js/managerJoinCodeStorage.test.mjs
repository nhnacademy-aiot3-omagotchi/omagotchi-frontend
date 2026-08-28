import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
    new URL("../../main/resources/static/js/manager/dashboard/panels/codesPanel.js", import.meta.url),
    "utf8"
);

function createSessionStorage() {
    return {
        getItem(key) {
            return Object.hasOwn(this, key) ? this[key] : null;
        },
        setItem(key, value) {
            this[key] = String(value);
        },
        removeItem(key) {
            delete this[key];
        }
    };
}

function loadStorage(sessionStorage = createSessionStorage()) {
    const window = {
        OmagotchiDashboardPanels: { register() {} }
    };
    vm.runInNewContext(source, {
        Date,
        JSON,
        Number,
        Object,
        sessionStorage,
        window
    });
    return { sessionStorage, storage: window.OmagotchiManagerJoinCodeStorage };
}

test("발급한 원문은 동일 탭 새로고침 뒤 서버 메타데이터와 일치할 때 복원된다", () => {
    const { sessionStorage, storage } = loadStorage();
    const issued = {
        code: "JOIN-CODE-1234",
        status: "ACTIVE",
        issuedAt: "2026-08-28T14:00:00+09:00",
        expiresAt: "2099-09-27T23:59:59+09:00"
    };
    storage.save(7, issued);

    const reloaded = loadStorage(sessionStorage).storage;
    const restored = reloaded.restore(7, {
        status: "ACTIVE",
        issuedAt: "2026-08-28T05:00:00Z",
        expiresAt: "2099-09-27T14:59:59Z"
    });

    assert.equal(restored, issued.code);
});

test("서버의 최신 발급 메타데이터와 다르면 이전 원문을 복원하지 않는다", () => {
    const { storage } = loadStorage();
    storage.save(7, {
        code: "STALE-CODE",
        status: "ACTIVE",
        issuedAt: "2026-08-28T14:00:00+09:00",
        expiresAt: "2099-09-27T23:59:59+09:00"
    });

    assert.equal(storage.restore(7, {
        status: "ACTIVE",
        issuedAt: "2026-08-28T14:01:00+09:00",
        expiresAt: "2099-09-27T23:59:59+09:00"
    }), null);
});

test("폐기된 코드와 로그아웃한 세션에서는 원문을 복원하지 않는다", () => {
    const { sessionStorage, storage } = loadStorage();
    const issued = {
        code: "REVOKED-CODE",
        status: "ACTIVE",
        issuedAt: "2026-08-28T14:00:00+09:00",
        expiresAt: "2099-09-27T23:59:59+09:00"
    };
    storage.save(7, issued);
    assert.equal(storage.restore(7, { ...issued, status: "REVOKED" }), null);

    storage.save(7, issued);
    storage.clear();
    assert.equal(sessionStorage.getItem("omagotchiManagerJoinCode:7"), null);
});
