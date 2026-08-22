import { useEffect, useRef } from "react";
import { expect, within } from "storybook/test";
import { createStudyRecords } from "../../../resources/static/js/home/studyRecords.js";
import { HomeOverlay } from "./HomeOverlay.jsx";

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storyRecord({ id, daysAgo, startHour, startMinute, endHour, endMinute }) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - daysAgo);
  startTime.setHours(startHour, startMinute, 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(endHour, endMinute, 0, 0);

  return {
    id,
    aggregationDate: localDateKey(startTime),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    studySeconds: Math.floor((endTime.getTime() - startTime.getTime()) / 1000),
    version: 0,
    createdAt: endTime.toISOString(),
    updatedAt: endTime.toISOString()
  };
}

// Learning Service의 StudyRecordResponse 형태를 따른 Story 전용 fixture다.
// 운영 Home에는 API 대역이나 고정 기록을 전달하지 않는다.
const storyRecords = [
  storyRecord({ id: "storybook-record-1", daysAgo: 0, startHour: 9, startMinute: 10, endHour: 10, endMinute: 30 }),
  storyRecord({ id: "storybook-record-2", daysAgo: 0, startHour: 11, startMinute: 5, endHour: 12, endMinute: 10 }),
  storyRecord({ id: "storybook-record-3", daysAgo: 2, startHour: 14, startMinute: 30, endHour: 16, endMinute: 45 }),
  storyRecord({ id: "storybook-record-4", daysAgo: 5, startHour: 10, startMinute: 20, endHour: 11, endMinute: 50 })
];

function StudyRecordsOverlayStory({ initialView = "monthly", records = storyRecords }) {
  const hostRef = useRef(null);
  const storageKeyRef = useRef(null);

  if (!storageKeyRef.current) {
    storageKeyRef.current = `storybook:home-study-records:${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  }

  useEffect(() => {
    const target = hostRef.current?.querySelector("[data-story-study-records]");
    if (!target) return undefined;

    const storageKey = storageKeyRef.current;
    const previous = localStorage.getItem(storageKey);
    localStorage.setItem(storageKey, JSON.stringify(records));

    const controller = createStudyRecords({
      storageKey,
      getElapsedSeconds: () => 0
    });
    const handleClick = (event) => controller.handleClick(event);

    target.addEventListener("click", handleClick);
    controller.mount(target);
    target.querySelector(`[data-study-record-view="${initialView}"]`)?.click();

    return () => {
      target.removeEventListener("click", handleClick);
      target.replaceChildren();
      if (previous === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previous);
    };
  }, [initialView, records]);

  return (
    <div ref={hostRef}>
      <HomeOverlay
        type="write"
        meta={{
          icon: "/images/app/studyrecord.png",
          title: "학습 기록",
          description: "집중한 시간을 돌아보고 학습 흐름을 정리하세요."
        }}
        content={'<div data-story-study-records></div>'}
        onClose={() => {}}
      />
    </div>
  );
}

const meta = {
  title: "Home/HomeOverlay",
  component: HomeOverlay,
  decorators: [
    (Story) => <div className="home-page" style={{ minHeight: "100vh", background: "#087046" }}><Story /></div>
  ],
  args: {
    type: "help",
    meta: {
      icon: "/images/app/help.png",
      title: "도움말",
      description: "홈 화면의 주요 기능을 확인합니다."
    },
    content: `
      <div class="help-accordion">
        <details open>
          <summary>1. 학습 타이머</summary>
          <div class="help-detail"><ul><li><strong>시작</strong>: 학습 시간 측정 시작</li><li><strong>정지</strong>: 측정한 구간을 학습 기록으로 저장</li></ul></div>
        </details>
        <details>
          <summary>2. 용어 설명</summary>
          <div class="help-detail">
            <dl class="help-key-list">
              <div><dt>학습 세션</dt><dd>타이머를 시작한 뒤 정지할 때까지 측정한 한 번의 학습 구간</dd></div>
              <div><dt>완료 세션</dt><dd>타이머를 정지해 학습 기록으로 저장된 세션</dd></div>
              <div><dt>연속 출석</dt><dd>평일 기준으로 입실 기록을 이어간 일수</dd></div>
            </dl>
          </div>
        </details>
      </div>
    `
  },
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Help = {};
export const Progress = {
  args: {
    type: "progress",
    meta: { icon: "/images/app/quest.png", title: "성장 현황", description: "현재 캐릭터의 성장 기록입니다." },
    content: `
      <section data-overlay-panel="quests">
        <div class="overlay-section-label"><strong>일일</strong><span></span><em>익일 4시에 초기화</em></div>
        <ul class="overlay-state-list" aria-label="퀘스트 목록">
          <li><div><strong>등록된 퀘스트가 없습니다.</strong><p>퀘스트가 제공되면 이 목록에 표시됩니다.</p></div><em>대기</em></li>
        </ul>
      </section>
      <section data-overlay-panel="achievements">
        <div class="overlay-section-label"><strong>업적</strong><span></span><em>달성 기록</em></div>
        <div class="overlay-empty-state" role="status"><strong>업적 기능은 아직 준비되지 않았습니다.</strong><p>기능이 준비되면 달성 기록을 확인할 수 있습니다.</p></div>
      </section>
      <section data-overlay-panel="leaders">
        <div class="overlay-section-label"><strong>명예의 전당</strong><span></span><em>전체 학습 시간</em></div>
        <ol class="overlay-list overlay-leader-list" aria-label="학습 시간 랭킹">
          <li data-empty-ranking><strong>-</strong><span>랭킹 데이터가 없습니다.</span><em>기록 없음</em></li>
        </ol>
      </section>
      <section data-overlay-panel="timeline">
        <div class="overlay-section-label"><strong>타임라인</strong><span></span><em>최근 활동</em></div>
        <ul class="overlay-state-list overlay-timeline-list" aria-label="최근 활동">
          <li><div><strong>활동 기록이 없습니다.</strong><p>출석과 학습 기록이 생기면 시간순으로 표시됩니다.</p></div><em>최근 활동</em></li>
        </ul>
      </section>
      <section data-overlay-panel="stats">
        <div class="overlay-section-label"><strong>학습 통계</strong><span></span><em>나의 기록</em></div>
        <dl class="overlay-metric-list">
          <div><dt>오늘 집중</dt><dd>0분</dd></div>
          <div><dt>세션</dt><dd>0회</dd></div>
          <div><dt>연속 출석</dt><dd>0일</dd></div>
          <div><dt>이번 주</dt><dd>0분</dd></div>
        </dl>
      </section>
    `
  }
};
export const StudyRecords = {
  render: () => <StudyRecordsOverlayStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("9시 10분")).toBeInTheDocument();
    expect(canvas.getByText("10시 30분")).toBeInTheDocument();
    expect(canvas.getByText("01:20:00")).toBeInTheDocument();
    expect(canvasElement.querySelector(".study-record-tags")).toBeNull();
  },
  parameters: {
    docs: {
      description: {
        story: "Home에서 사용하는 실제 createStudyRecords 렌더러를 마운트합니다. fixture는 Storybook localStorage에만 격리되며 mock API를 사용하지 않습니다."
      }
    }
  }
};
export const Settings = {
  args: {
    type: "settings",
    meta: { icon: "/images/app/set.png", title: "설정", description: "홈 화면의 표시 방식을 조정합니다." },
    content: `<section><h3>화면 설정</h3><label><input type="checkbox" checked disabled> 배경 음악 사용</label></section>`
  }
};
