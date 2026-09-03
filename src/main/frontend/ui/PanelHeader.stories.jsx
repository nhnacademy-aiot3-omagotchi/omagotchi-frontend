import React from "react";
import { expect, within } from "storybook/test";
import { PanelHeader } from "./PanelHeader.jsx";

/*
 * 홈의 모든 패널 머리말을 한 규칙으로 맞춘 결과를 눈으로 확인하는 스토리다.
 *
 * [이 파일이 지켜야 하는 것]
 * 예전 이 스토리는 <PanelHeader {...item} /> 만 렌더했다. className 도, 부모 래퍼도 없었다.
 * 그래서 panel-header.css 만 적용된 "이상적인 모습"이 나왔고, 실제 화면과 전혀 달랐다.
 * 실제로는 .home-overlay / .bgm-player / .home-ai-panel 안에서, 각 패널의 옛 CSS 와
 * 캐스케이드로 싸운 결과가 그려졌다. 스토리가 통과해도 운영은 깨져 있었다.
 *
 * 그래서 지금은 실제 사용처와 "같은 클래스, 같은 부모"로 렌더한다.
 *   HomeOverlay.jsx     -> .home-overlay.home-overlay--{type}.ui-menu-live-panel
 *   AiAssistantPanel.jsx-> .home-ai-panel
 *   BgmPlayer.jsx       -> .bgm-player
 *   home.html(출석)      -> .home-page.is-attendance-panel-open .attendance-detail.ui-attendance
 *
 * 위치(fixed/absolute)만 인라인 스타일로 풀어 갤러리에 나란히 보이게 한다.
 * 인라인 스타일은 래퍼 자신에게만 걸리므로 머리말 캐스케이드는 실제와 동일하게 유지된다.
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

const closeButton = <button className="home-overlay-close" type="button" aria-label="닫기">×</button>;

/** 래퍼의 위치 고정만 푼다. 크기·배경·padding 은 실제 CSS 그대로 둔다. */
const UNPIN = { position: "static", inset: "auto", width: "100%", maxWidth: "100%", maxHeight: "none", height: "auto" };

function Label({ children }) {
  return <p style={{ margin: "0 0 6px", font: "600 12px/1 system-ui", color: "#6b7280" }}>{children}</p>;
}

/** 실제 HomeOverlay.jsx 와 같은 마크업. */
function OverlayCase({ type, ...meta }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{`.home-overlay--${type}`}</Label>
      <article className={`home-overlay home-overlay--${type} ui-menu-live-panel`} style={UNPIN}>
        <PanelHeader {...meta} className="home-overlay-header ui-menu-live-header" closeButton={closeButton} />
        <div className="home-overlay-body ui-menu-live-body"><p>패널 본문 자리</p></div>
      </article>
    </div>
  );
}

/*
 * panel-header.css 가 정한 "규격". 스토리가 눈으로만 통과하는 걸 막으려고
 * computed style 로 직접 잰다. 실제로 이 값들이 옛 규칙에 덮여 깨져 있었다:
 *   - 오버레이 grid 가 2열이라 닫기 버튼이 다음 줄로 밀려났다
 *   - .home-overlay > header(요소 선택자) 가 min-height 52px 과 그라디언트를 덮어씌웠다
 *   - .quick-panel-header 가 BGM 글자를 흰색으로 되돌렸다
 */
const SPEC = {
  display: "grid",
  position: "sticky",
  backgroundColor: "rgb(110, 200, 148)", // #6ec894
  backgroundImage: "none",               // 그라디언트가 덮으면 실패
  color: "rgb(12, 48, 34)"               // #0c3022
};

function assertSpec(header) {
  const style = getComputedStyle(header);
  expect(style.display).toBe(SPEC.display);
  expect(style.position).toBe(SPEC.position);
  expect(style.backgroundColor).toBe(SPEC.backgroundColor);
  expect(style.backgroundImage).toBe(SPEC.backgroundImage);
  expect(style.color).toBe(SPEC.color);

  // 아이콘 | 제목 | 버튼 3열. 2열이 되면 버튼이 다음 줄로 떨어진다.
  expect(style.gridTemplateColumns.split(" ")).toHaveLength(3);

  const heading = header.querySelector(".ui-panel-header-heading h2");
  if (heading) expect(getComputedStyle(heading).color).toBe(SPEC.color);
}

/** 버튼이 머리말 첫 줄 오른쪽 끝에 붙어 있는지. 밀려나면 여기서 잡힌다. */
function assertActionsPinned(header) {
  const actions = header.querySelector(".ui-panel-header-actions");
  expect(actions).not.toBeNull();
  const box = header.getBoundingClientRect();
  const spot = actions.getBoundingClientRect();
  expect(spot.top - box.top).toBeLessThan(box.height / 2);
  expect(box.right - spot.right).toBeLessThan(40);
}

export default {
  title: "UI/PanelHeader",
  component: PanelHeader,
  parameters: { layout: "padded" }
};

/** 오버레이 8종. 실제 .home-overlay 안에서 규격을 지키는지 본다. */
export const Overlays = {
  render: () => <div style={{ maxWidth: 860 }}>{OVERLAYS.map((item) => <OverlayCase key={item.type} {...item} />)}</div>,
  play: async ({ canvasElement }) => {
    const headers = [...canvasElement.querySelectorAll(".ui-panel-header")];
    expect(headers).toHaveLength(8);
    expect(canvasElement.querySelectorAll(".ui-panel-header-icon img")).toHaveLength(8);
    expect(canvasElement.querySelectorAll(".ui-panel-header-heading p")).toHaveLength(8);

    for (const header of headers) {
      assertSpec(header);
      assertActionsPinned(header);
    }

    // ? 버튼은 AI 도우미 전용이다. 오버레이에는 닫기만 있어야 한다.
    const buttons = canvasElement.querySelectorAll(".ui-panel-header-actions button");
    expect(buttons).toHaveLength(8);
    for (const button of buttons) expect(button.textContent).toBe("×");
  }
};

/** BGM 과 출석 현황. 액션 독에서 열리지만 머리말 규칙은 오버레이와 같다. */
export const QuickPanels = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 18 }}>
        <Label>.bgm-player (BgmPlayer.jsx)</Label>
        <aside className="bgm-player" aria-label="배경 음악" style={UNPIN}>
          <PanelHeader
            icon="/images/app/music.png"
            title="배경 음악"
            description="공부에 어울리는 음악을 재생하세요."
            className="quick-panel-header bgm-panel-header"
            closeButton={<button className="quick-panel-close" type="button" aria-label="BGM 닫기">×</button>}
          />
          <div className="bgm-player-copy"><span>현재 재생</span><strong>패널 본문 자리</strong></div>
        </aside>
      </div>

      {/* 출석은 Thymeleaf 라 컴포넌트를 못 쓴다. home.html 의 클래스 계약을 그대로 옮긴다.
          .attendance-detail 은 is-attendance-panel-open 이 있어야 display:grid 가 된다. */}
      <div className="home-page is-attendance-panel-open">
        <Label>.attendance-detail (home.html)</Label>
        <section className="attendance-detail ui-attendance" style={UNPIN}>
          <header className="ui-panel-header attendance-detail-header">
            <span className="ui-panel-header-icon" aria-hidden="true"><img src="/images/app/calendar.png" alt="" /></span>
            <div className="ui-panel-header-heading">
              <h2>출석 현황</h2>
              <p>오늘의 출석과 이번 달 학습 흐름을 확인하세요.</p>
            </div>
            <div className="ui-panel-header-actions">
              <button className="quick-panel-close ui-attendance__close" type="button" aria-label="출석부 닫기">×</button>
            </div>
          </header>
          <p>패널 본문 자리</p>
        </section>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const headers = [...canvasElement.querySelectorAll(".ui-panel-header")];
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      assertSpec(header);
      assertActionsPinned(header);
    }
    // 여기에도 ? 버튼은 없다.
    expect(canvasElement.querySelectorAll(".ui-panel-header-actions button")).toHaveLength(2);
  }
};

/** AI 도우미만 사용법(?) 버튼을 하나 더 갖는다. */
export const AiAssistant = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <Label>.home-ai-panel (?) 버튼은 여기에만</Label>
      <section className="home-ai-panel" style={{ ...UNPIN, height: "auto" }}>
        <PanelHeader
          icon="/images/app/commu.png"
          title="AI 도우미"
          description="학습을 돕는 오마고치 AI"
          className="home-ai-panel-heading"
          actions={<button className="home-ai-panel-help" type="button" aria-label="AI 도우미 사용법">?</button>}
          closeButton={<button className="home-ai-panel-close" type="button" aria-label="AI 도우미 닫기">×</button>}
        />
        <div style={{ padding: 18, font: "13px/1.6 system-ui" }}>패널 본문 자리</div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("AI 도우미 사용법")).toBeInTheDocument();

    const header = canvasElement.querySelector(".ui-panel-header");
    assertSpec(header);
    assertActionsPinned(header);

    // 순서: 보조 버튼이 먼저, 닫기가 마지막이어야 한다.
    const buttons = [...canvasElement.querySelectorAll(".ui-panel-header-actions button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["?", "×"]);
  }
};

/** 선택 요소가 빠졌을 때. 빈 아이콘 상자나 빈 줄이 남으면 안 된다. */
export const Optional = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <OverlayCase type="settings" icon="/images/app/set.png" title="설명이 없는 패널" />
      <div style={{ marginBottom: 18 }}>
        <Label>아이콘 없음</Label>
        <article className="home-overlay home-overlay--help ui-menu-live-panel" style={UNPIN}>
          <PanelHeader
            title="아이콘이 없는 패널"
            description="아이콘 상자가 빈 채로 남으면 안 됩니다."
            className="home-overlay-header ui-menu-live-header"
            closeButton={closeButton}
          />
        </article>
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>버튼 없음</Label>
        <article className="home-overlay home-overlay--space ui-menu-live-panel" style={UNPIN}>
          <PanelHeader
            icon="/images/app/help.png"
            title="닫기가 없는 패널"
            description="버튼 칸이 자리를 먹지 않아야 합니다."
            className="home-overlay-header ui-menu-live-header"
          />
        </article>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const headers = canvasElement.querySelectorAll(".ui-panel-header");
    expect(headers[0].querySelector("p")).toBeNull();
    expect(headers[1].querySelector(".ui-panel-header-icon img")).toBeNull();
    expect(headers[2].querySelector(".ui-panel-header-actions")).toBeNull();

    // 아이콘 상자는 비면 아예 그리지 않는다. 흰 사각형이 남으면 실패.
    expect(getComputedStyle(headers[1].querySelector(".ui-panel-header-icon")).display).toBe("none");
    // 버튼이 없어도 3열 규격은 유지되고, 빈 열은 자리를 먹지 않는다.
    const columns = getComputedStyle(headers[2]).gridTemplateColumns.split(" ");
    expect(columns).toHaveLength(3);
    expect(columns[2]).toBe("0px");
  }
};

/** 긴 제목·설명이 버튼을 밀어내지 않아야 한다. */
export const Overflow = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <OverlayCase
        type="write"
        icon="/images/app/studyrecord.png"
        title="아주아주 긴 제목이 들어간 패널입니다"
        description="설명도 아주 길어서 한 줄에 담기지 않고 넘칠 수 있는 경우를 확인합니다."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector(".ui-panel-header");
    // 긴 문구가 버튼을 밀어내면 여기서 잡힌다. 예전 2열 그리드의 증상이 정확히 이것이었다.
    assertActionsPinned(header);
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1);
  }
};
