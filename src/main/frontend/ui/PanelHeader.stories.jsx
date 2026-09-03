import React from "react";
import { expect, within } from "storybook/test";
import { PanelHeader } from "./PanelHeader.jsx";

/*
 * 홈의 모든 패널 머리말을 한 규칙으로 맞춘 결과를 눈으로 확인하는 스토리다.
 *
 * 합치기 전 상태:
 *   - 오버레이 8종이 CSS `:not(--help):not(--space)` 로 갈려 6종은 아이콘이 감춰지고
 *     설명이 스크린리더 전용이었다 (타입별 분기 23개)
 *   - AI 도우미(home-ai-panel-heading), BGM·출석(quick-panel-header)은 아예 다른 클래스였다
 */

// 실제 overlayMeta(home.js) 값을 그대로 옮겨 스토리와 화면이 어긋나지 않게 한다.
const OVERLAYS = [
  { type: "help", icon: "/images/app/help.png", title: "도움말", description: "오마고치 이용 방법을 확인하세요." },
  { type: "progress", icon: "/images/app/quest.png", title: "진행", description: "퀘스트와 성장 기록을 한눈에 확인하세요." },
  { type: "personal", icon: "/images/app/userList.png", title: "내 정보", description: "나의 학습과 캐릭터 성장 현황입니다." },
  { type: "cohort", icon: "/images/app/cohort.png", title: "기수 · 팀", description: "기수 안에서 팀을 만들고 함께 성장하세요." },
  { type: "write", icon: "/images/app/studyrecord.png", title: "학습 기록", description: "집중한 시간을 돌아보고 학습 흐름을 정리하세요." },
  { type: "space", icon: "/images/app/door.png", title: "공간", description: "함께 공부할 공간을 선택하고 입장하세요." },
  { type: "community", icon: "/images/app/commu.png", title: "커뮤", description: "공지와 이야기를 확인하고 동료들과 소통하세요." },
  { type: "settings", icon: "/images/app/set.png", title: "설정", description: "계정과 서비스 이용 환경을 관리하세요." }
];

const QUICK_PANELS = [
  { type: "bgm", icon: "/images/app/music.png", title: "배경 음악", description: "공부에 어울리는 음악을 재생하세요." },
  { type: "attendance", icon: "/images/app/calendar.png", title: "출석 현황", description: "이번 달 출석과 연속 기록입니다." }
];

const closeButton = <button type="button" aria-label="닫기">×</button>;

function Frame({ children, label }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: "0 0 6px", font: "600 12px/1 system-ui", color: "#6b7280" }}>{label}</p>
      <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid rgba(12,48,34,.18)", background: "#f4fbf7" }}>
        {children}
        <div style={{ padding: 18, font: "13px/1.6 system-ui", color: "#3d5147" }}>패널 본문 자리</div>
      </div>
    </div>
  );
}

export default {
  title: "UI/PanelHeader",
  component: PanelHeader,
  parameters: { layout: "padded" }
};

/** 오버레이 8종. 아이콘과 설명이 전부 같은 규칙으로 보여야 한다. */
export const Overlays = {
  render: () => (
    <div style={{ maxWidth: 760 }}>
      {OVERLAYS.map((item) => (
        <Frame key={item.type} label={`home-overlay--${item.type}`}>
          <PanelHeader {...item} closeButton={closeButton} />
        </Frame>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // 8종 모두 아이콘과 설명이 살아 있어야 한다. 예전에는 6종이 감춰져 있었다.
    expect(canvasElement.querySelectorAll(".panel-header").length).toBe(8);
    expect(canvasElement.querySelectorAll(".panel-header-icon img").length).toBe(8);
    expect(canvasElement.querySelectorAll(".panel-header-heading p").length).toBe(8);

    // ? 버튼은 AI 도우미 전용이다. 오버레이에는 닫기만 있어야 한다.
    const buttons = canvasElement.querySelectorAll(".panel-header-actions button");
    expect(buttons.length).toBe(8);
    for (const button of buttons) expect(button.textContent).toBe("×");
  }
};

/** BGM과 출석 현황. 액션 독에서 열리지만 머리말 규칙은 오버레이와 같다. */
export const QuickPanels = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      {QUICK_PANELS.map((item) => (
        <Frame key={item.type} label={item.type}>
          <PanelHeader {...item} closeButton={closeButton} />
        </Frame>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll(".panel-header").length).toBe(2);
    // 여기에도 ? 버튼은 없다.
    expect(canvasElement.querySelectorAll(".panel-header-actions button").length).toBe(2);
  }
};

/** AI 도우미만 사용법(?) 버튼을 하나 더 갖는다. */
export const AiAssistant = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <Frame label="home-ai-panel (?) 버튼은 여기에만">
        <PanelHeader
          icon="/images/app/commu.png"
          title="AI 도우미"
          description="학습을 돕는 오마고치 AI"
          actions={<button type="button" aria-label="AI 도우미 사용법">?</button>}
          closeButton={closeButton}
        />
      </Frame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("AI 도우미 사용법")).toBeInTheDocument();
    // 순서: 보조 버튼이 먼저, 닫기가 마지막이어야 한다.
    const buttons = [...canvasElement.querySelectorAll(".panel-header-actions button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["?", "×"]);
  }
};

/** 선택 요소가 빠졌을 때. 빈 아이콘 상자나 빈 줄이 남으면 안 된다. */
export const Optional = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <Frame label="설명 없음">
        <PanelHeader icon="/images/app/set.png" title="설명이 없는 패널" closeButton={closeButton} />
      </Frame>
      <Frame label="아이콘 없음">
        <PanelHeader title="아이콘이 없는 패널" description="아이콘 상자가 빈 채로 남으면 안 됩니다." closeButton={closeButton} />
      </Frame>
      <Frame label="버튼 없음">
        <PanelHeader icon="/images/app/help.png" title="닫기가 없는 패널" description="버튼 칸이 자리를 먹지 않아야 합니다." />
      </Frame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const headers = canvasElement.querySelectorAll(".panel-header");
    expect(headers[0].querySelector("p")).toBeNull();
    expect(headers[1].querySelector(".panel-header-icon img")).toBeNull();
    expect(headers[2].querySelector(".panel-header-actions")).toBeNull();
  }
};

/** 긴 제목·설명이 버튼을 밀어내지 않아야 한다. */
export const Overflow = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Frame label="좁은 폭 + 긴 문구">
        <PanelHeader
          icon="/images/app/studyrecord.png"
          title="아주아주 긴 제목이 들어간 패널입니다"
          description="설명도 아주 길어서 한 줄에 담기지 않고 넘칠 수 있는 경우를 확인합니다."
          closeButton={closeButton}
        />
      </Frame>
    </div>
  )
};
