import { TelegramLink } from "./TelegramLink.jsx";
import "./TelegramLink.css";

const meta = {
  title: "TelegramLink",
  component: TelegramLink,
  parameters: { layout: "fullscreen" }
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

/** 목업 1 — 아직 발급하지 않았다. 빈 칸이 곧 링크가 들어갈 자리다. */
export const NotLinked = {
  name: "미연동 · 발급 전",
  args: { link: null, token: null }
};

/** 발급 직후. 딥링크를 눌러 텔레그램으로 넘어가는 지점이다. */
export const TokenIssued = {
  name: "미연동 · 링크 발급됨",
  args: { link: null, token: issuedToken }
};

export const Issuing = {
  name: "미연동 · 발급 중",
  args: { link: null, token: null, issuing: true }
};

/** 목업 3 — TTL(기본 10분)이 지났다. 토큰은 일회용이라 재발급 외에 길이 없다. */
export const TokenExpired = {
  name: "미연동 · 링크 만료",
  args: { link: null, token: expiredToken }
};

/**
 * 목업 2 — 서버가 200을 준 경우다.
 *
 * 해제된 연동은 서버가 404를 주므로 여기까지 오지 않는다. 화면이 disconnectedAt 을
 * 다시 해석하지 않는 이유다.
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

// Storybook 9+ 는 viewport 를 globals 로 받는다. parameters.viewport.defaultViewport 는 무시된다.
export const Mobile = {
  name: "모바일",
  args: { link: null, token: issuedToken },
  globals: { viewport: { value: "mobile1", isRotated: false } }
};

/** 대시보드 패널 안에 얹힌 모습. 여백과 배경을 패널이 갖는다. */
export const Embedded = {
  name: "대시보드 임베드",
  args: { link: null, token: issuedToken, embedded: true }
};
