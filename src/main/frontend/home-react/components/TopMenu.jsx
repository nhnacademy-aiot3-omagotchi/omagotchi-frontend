import React from "react";

export const HOME_MENU_ITEMS = [
  { href: "/help", overlay: "help", label: "도움말", icon: "/images/app/help.png" },
  { href: "/progress#quests", overlay: "progress", label: "진행", icon: "/images/app/quest.png", alert: true },
  { href: "/personal", overlay: "personal", label: "내 정보", icon: "/images/app/userList.png" },
  { href: "/cohort", overlay: "cohort", label: "기수", icon: "/images/app/cohort.png" },
  { href: "/write", overlay: "write", label: "학습 기록", icon: "/images/app/studyrecord.png" },
  { href: "/space#lab", overlay: "space", label: "공간", icon: "/images/app/door.png" },
  { href: "/home#community", overlay: "community", label: "커뮤", icon: "/images/app/commu.png" },
  { href: "/settings", overlay: "settings", label: "설정", icon: "/images/app/set.png" }
];

export function TopMenu({ title = "Omagotchi", items = HOME_MENU_ITEMS }) {
  return (
    <>
      <h1 id="home-title">{title}</h1>
      <nav className="home-menu" aria-label="주요 메뉴">
        {items.map((item) => (
          <a
            key={item.overlay}
            className={item.alert ? "has-menu-alert" : undefined}
            href={item.href}
            aria-label={item.label}
            data-home-overlay={item.overlay}
          >
            <span>
              <img src={item.icon} alt="" width="32" />
            </span>
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}
