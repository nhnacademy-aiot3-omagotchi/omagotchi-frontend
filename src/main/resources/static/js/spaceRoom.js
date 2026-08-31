import { renderServiceIntegrationPending } from "./serviceIntegrationState.js";

(() => {
    const roots = new Set();
    let activeTab = "meeting";

    function renderMeeting() {
        return `
            <section class="ui-space-meeting" aria-labelledby="space-meeting-title">
                <header>
                    <div>
                        <span class="ui-menu-eyebrow">MEETING ROOMS</span>
                        <h3 id="space-meeting-title">회의실</h3>
                    </div>
                </header>
                ${renderServiceIntegrationPending({
                    title: "서비스 연동 대기",
                    description: "회의실 API가 연결되면 실제 공간 현황과 이용 기능을 제공합니다."
                })}
            </section>`;
    }

    function renderLibrary() {
        return `
            <section class="space-room-library" aria-labelledby="space-library-title">
                <header class="space-room-section-head">
                    <div>
                        <span class="space-room-kicker">SHARED STUDY SPACE</span>
                        <h3 id="space-library-title">도서관</h3>
                    </div>
                </header>
                ${renderServiceIntegrationPending({
                    title: "서비스 연동 대기",
                    description: "도서관 API가 연결되면 실제 이용 현황과 입·퇴장 기능을 제공합니다."
                })}
            </section>`;
    }

    function render(root) {
        root.innerHTML = `
            <div class="space-room-app-inner">
                <nav class="space-room-tabs" aria-label="공간 종류">
                    <button
                        class="${activeTab === "meeting" ? "is-active" : ""}"
                        type="button"
                        role="tab"
                        data-space-tab="meeting"
                        aria-selected="${activeTab === "meeting"}"
                    >회의실</button>
                    <button
                        class="${activeTab === "library" ? "is-active" : ""}"
                        type="button"
                        role="tab"
                        data-space-tab="library"
                        aria-selected="${activeTab === "library"}"
                    >도서관</button>
                </nav>
                <div class="space-room-content">
                    ${activeTab === "meeting" ? renderMeeting() : renderLibrary()}
                </div>
            </div>`;
    }

    function renderAll() {
        roots.forEach((root) => {
            if (root.isConnected) render(root);
            else roots.delete(root);
        });
    }

    function mount(root, options = {}) {
        if (!root) return;
        roots.add(root);
        if (["meeting", "library"].includes(options.initialTab)) {
            activeTab = options.initialTab;
        }
        if (!root.dataset.spaceRoomMounted) {
            root.addEventListener("click", (event) => {
                const tab = event.target.closest("[data-space-tab]");
                if (!tab) return;
                activeTab = tab.dataset.spaceTab;
                renderAll();
            });
            root.dataset.spaceRoomMounted = "true";
        }
        render(root);
    }

    function mountParty(root) {
        if (!root) return;
        root.innerHTML = renderServiceIntegrationPending({
            title: "서비스 연동 대기",
            description: "파티 API가 연결되면 실제 파티 생성과 구성원 관리 기능을 제공합니다."
        });
    }

    window.OmagotchiSpaceRoom = Object.freeze({mount, mountParty});
})();
