// 홈 오버레이와 같은 공간 컴포넌트를 독립 공간 페이지에도 연결합니다.
import "./spaceRoom.js?v=20260831-1";

window.OmagotchiSpaceRoom?.mount(
    document.querySelector("[data-space-room-app]"),
    { initialTab: location.hash.slice(1) || "meeting" }
);
