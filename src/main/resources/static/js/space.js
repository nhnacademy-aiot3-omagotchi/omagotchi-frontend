// 홈 오버레이와 같은 공간 컴포넌트를 독립 공간 페이지에도 연결합니다.
// spaceRoom.js는 모듈 평가 시점에 window.OmagotchiProfile을 읽으므로,
// 정적 import로는 프로필을 미리 채울 수 없다. 프로필을 확보한 뒤 동적으로 불러온다.
import { renderServiceIntegrationPending } from "./serviceIntegrationState.js";

const SPACE_ROOM_MODULE = "./spaceRoom.js?v=20260903-1";

function getRoot() {
    return document.querySelector("[data-space-room-app]");
}

function showNotice(title, description) {
    const root = getRoot();
    if (!root) {
        return;
    }
    root.insertAdjacentHTML(
        "afterbegin",
        renderServiceIntegrationPending({ title, description })
    );
}

async function loadProfile() {
    const getProfile = globalThis.OmagotchiApi?.profile?.get;
    if (typeof getProfile !== "function") {
        // api.js가 로드되지 않으면 공간 데이터를 한 건도 불러올 수 없다.
        showNotice(
            "공간 정보를 불러오지 못했습니다.",
            "페이지를 새로고침해 주세요. 계속 반복되면 관리자에게 알려 주세요."
        );
        return {};
    }

    try {
        return (await getProfile()) || {};
    } catch (error) {
        if (error?.status === 401) {
            globalThis.location.replace("/login?notice=session-expired");
            return null;
        }
        // 프로필 조회 실패가 공간 목록까지 막지 않는다. 기수·입실 상태만 비운 채로 진행한다.
        showNotice(
            "내 정보를 불러오지 못했습니다.",
            "공간 목록은 계속 볼 수 있지만 입실 상태가 정확하지 않을 수 있습니다."
        );
        return {};
    }
}

async function bootstrapSpace() {
    const profile = await loadProfile();
    if (profile === null) {
        return;
    }

    globalThis.OmagotchiProfile = profile;

    try {
        await import(SPACE_ROOM_MODULE);
    } catch {
        showNotice(
            "공간 화면을 불러오지 못했습니다.",
            "페이지를 새로고침해 주세요."
        );
        return;
    }

    globalThis.OmagotchiSpaceRoom?.mount(getRoot(), {
        initialTab: location.hash.slice(1) || "meeting"
    });
}

await bootstrapSpace();
