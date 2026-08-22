import React from "react";

export const HOME_MENU_ITEMS = [
  { overlay: "help", label: "도움말", icon: "/images/app/help.png" },
  { overlay: "progress", label: "진행", icon: "/images/app/quest.png", alert: true },
  { overlay: "personal", label: "내 정보", icon: "/images/app/userList.png" },
  { overlay: "cohort", label: "기수", icon: "/images/app/cohort.png" },
  { overlay: "write", label: "학습 기록", icon: "/images/app/studyrecord.png" },
  { overlay: "space", label: "공간", icon: "/images/app/door.png" },
  { overlay: "community", label: "커뮤", icon: "/images/app/commu.png" },
  { overlay: "settings", label: "설정", icon: "/images/app/set.png" }
];

function requestHomeOverlay(overlay) {
  // home.js가 아직 로드 중이어도 요청을 잃지 않도록 초기 오버레이를 함께 기록한다.
  globalThis.OmagotchiInitialOverlay = overlay;
  globalThis.dispatchEvent(new CustomEvent("omagotchi:home-overlay-request", {
    detail: { type: overlay }
  }));
}

export function TopMenu({ title = "Omagotchi", items = HOME_MENU_ITEMS }) {
  return (
    <>
      <h1 id="home-title">{title}</h1>
      <nav className="home-menu" aria-label="주요 메뉴">
        {items.map((item) => (
          <button
            key={item.overlay}
            type="button"
            className={item.alert ? "has-menu-alert" : undefined}
            aria-label={item.label}
            data-home-overlay={item.overlay}
            onClick={() => requestHomeOverlay(item.overlay)}
          >
            <span>
              <img src={item.icon} alt="" width="32" />
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
