import React from "react";
import { TelegramLink } from "./TelegramLink.jsx";
import "./TelegramLink.css";

/*
 * 이 컴포넌트는 telegram-main.jsx 한 곳에서만, 항상 embedded 로 쓰인다.
 * 그래서 모든 스토리를 임베드로 둔다 — 비임베드는 배포되지 않는 모습이라
 * 폭·여백·배경이 실제 화면과 어긋나 보인다.
 */

const summaryCard = {
  display: "grid",
  gap: 7,
  padding: 18,
  border: "1px solid #d7e4dc",
  borderRadius: 8,
  background: "#fff"
};

/*
 * 대시보드 패널(dashboard-panel--telegram-react)은 padding·border·배경을 0으로 두고
 * 바탕(--canvas) 위에 그대로 얹힌다. 위에 얹은 요약 카드 줄은 실제 .summary-grid 를
 * 흉내 낸 fixture 로, 텔레그램 카드가 같은 폭으로 끝나는지 보기 위한 것이다. 값은 의미 없다.
 */
// 실제 .summary-grid 는 980px 이하에서 2칸으로 접힌다. inline style 로는 표현할 수 없어
// fixture 전용 class 로 같은 분기를 준다.
const summaryGridCss = `
.sb-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}
@media (max-width: 980px) {
  .sb-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;

const dashboardCanvas = (Story) => (
  <div style={{ padding: 24, background: "#eef6f1" }}>
    <style>{summaryGridCss}</style>
    <div className="sb-summary-grid">
      {["활성 구성원", "승인 대기", "오늘 출석", "실습실 CO₂"].map((label) => (
        <article key={label} style={summaryCard}>
          <span style={{ color: "#66736c", fontSize: 11, fontWeight: 800 }}>{label}</span>
          <strong style={{ fontSize: 26 }}>--</strong>
        </article>
      ))}
    </div>
    <Story />
  </div>
);

const meta = {
  title: "TelegramLink",
  component: TelegramLink,
  parameters: { layout: "fullscreen" },
  args: { embedded: true },
  decorators: [dashboardCanvas]
};

export default meta;

// --- 아래 목업은 Learning Service 응답 모양 그대로다. 컴포넌트는 표본 데이터를 갖지 않는다. ---

const NOW = Date.now();

// POST /api/v1/telegram/link-token → TelegramLinkTokenResponse
// linkUrl 의 토큰은 32바이트 hex(64자)다. ?start= 상한이 정확히 64자라 이 길이가 정본이다.
const issuedToken = {
  linkUrl: "https://t.me/omagotchi_bot?start=3f1c8a92d47b05e6a1c93f80b7e254dd6c0af31928b7d54e6a0c19f37b2d84ce",
  expiresAt: new Date(NOW + 10 * 60 * 1000).toISOString()
};

const expiredToken = {
  ...issuedToken,
  expiresAt: new Date(NOW - 5 * 60 * 1000).toISOString()
};

// GET /api/v1/telegram/link → TelegramUserLinkResponse
const activeLink = {
  userId: "3f8b7c26-9d41-4a02-9b17-2c5e8a44d013",
  telegramUserId: 812345678,
  telegramChatId: 812345678,
  notificationEnabled: true,
  linkedAt: "2026-08-20T14:32:11+09:00",
  disconnectedAt: null
};

/** 아직 발급하지 않았다. 빈 칸이 곧 링크가 들어갈 자리다. */
export const NotLinked = {
  name: "발급 전",
  args: { link: null, token: null }
};

/** 발급 직후. 딥링크를 눌러 텔레그램으로 넘어가는 지점이다. */
export const TokenIssued = {
  name: "링크 발급됨",
  args: { link: null, token: issuedToken }
};

export const Issuing = {
  name: "발급 중",
  args: { link: null, token: null, issuing: true }
};

/** TTL(기본 10분)이 지났다. 토큰은 일회용이라 재발급 외에 길이 없다. */
export const TokenExpired = {
  name: "링크 만료",
  args: { link: null, token: expiredToken }
};

/**
 * 서버가 연동 정보를 준 경우다.
 *
 * 미연동은 BFF 가 204 로 바꿔 주므로 link 가 null 로 들어온다. 여기까지 오지 않으니
 * 화면이 disconnectedAt 을 다시 해석하지 않는다.
 */
export const AlreadyLinked = {
  name: "연동 완료",
  args: { link: activeLink, token: null }
};

/** 연동은 살아 있지만 봇에서 /stop 을 보낸 상태. 연동 자체는 그대로다. */
export const LinkedNotificationOff = {
  name: "연동 완료 · 알림 꺼짐",
  args: { link: { ...activeLink, notificationEnabled: false }, token: null }
};

export const Loading = {
  name: "불러오는 중",
  args: { loading: true }
};

export const LoadError = {
  name: "조회 실패",
  args: { error: "Learning Service 응답이 없습니다. (503)", onRetry: () => {} }
};

/** 발급만 실패한 경우. 연동 상태는 이미 알고 있으므로 재시도 버튼을 따로 두지 않는다. */
export const IssueError = {
  name: "발급 실패",
  args: { link: null, token: null, error: "연동 링크를 발급하지 못했습니다." }
};

// max-width:720px 분기(카드 여백 축소, 발급 후 버튼 세로 배치)를 본다.
// Storybook 9+ 는 viewport 를 globals 로 받는다. parameters.viewport.defaultViewport 는 무시된다.
export const Mobile = {
  name: "모바일",
  args: { link: null, token: issuedToken },
  globals: { viewport: { value: "mobile1", isRotated: false } }
};
