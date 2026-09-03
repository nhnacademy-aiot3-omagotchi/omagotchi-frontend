import { useEffect, useRef } from "react";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { createStudyRecords } from "../../../resources/static/js/home/studyRecords.js";
import { HomeOverlay } from "./HomeOverlay.jsx";

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTimeValue(date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${localDateKey(date)}T${hour}:${minute}`;
}

function localTimeValue(date) {
  return localDateTimeValue(date).slice(11);
}

function storyRecord({ id, daysAgo, startHour, startMinute, startSecond = 0, endHour, endMinute, endSecond = 0 }) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - daysAgo);
  startTime.setHours(startHour, startMinute, startSecond, 0);
  const endTime = new Date(startTime);
  endTime.setHours(endHour, endMinute, endSecond, 0);
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

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
const midnightStoryRecords = [
  storyRecord({ id: "storybook-midnight-record", daysAgo: 1, startHour: 23, startMinute: 30, endHour: 0, endMinute: 30 })
];
const timelineStoryRecords = [
  storyRecord({ id: "storybook-timeline-record-1", daysAgo: 1, startHour: 9, startMinute: 0, endHour: 10, endMinute: 0, endSecond: 30 }),
  storyRecord({ id: "storybook-timeline-record-2", daysAgo: 1, startHour: 11, startMinute: 0, startSecond: 30, endHour: 12, endMinute: 0 })
];
const updateStoryRecord = fn(async (id) => ({ id, version: 1 }));
const createStoryRecord = fn(async () => ({ id: "storybook-created-record", version: 0 }));
const storyApi = { createRecord: createStoryRecord, updateRecord: updateStoryRecord };

function StudyRecordsOverlayStory({ records = storyRecords, api, selectedDateKey }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const target = hostRef.current?.querySelector("[data-story-study-records]");
    if (!target) return undefined;

    const controller = createStudyRecords({
      api: {
        ...api,
        getDailyRecords: async (date) => records.filter((record) => record.aggregationDate === date),
        getMonthlySummary: async (month) => {
          const monthlyRecords = records.filter((record) => record.aggregationDate.startsWith(month));
          const dailyTotals = Object.entries(monthlyRecords.reduce((totals, record) => ({
            ...totals,
            [record.aggregationDate]: (totals[record.aggregationDate] || 0) + record.studySeconds
          }), {})).map(([aggregationDate, studySeconds]) => ({aggregationDate, studySeconds}));
          return {
            aggregationMonth: month,
            totalStudySeconds: monthlyRecords.reduce((total, record) => total + record.studySeconds, 0),
            dailyTotals
          };
        },
        deleteRecord: async () => undefined
      }
    });
    const handleClick = (event) => controller.handleClick(event);
    const handleInput = (event) => controller.handleInput(event);
    const handleSubmit = (event) => controller.handleSubmit(event);

    target.addEventListener("click", handleClick);
    target.addEventListener("input", handleInput);
    target.addEventListener("submit", handleSubmit);
    controller.mount(target);
    target.querySelector(`[data-study-calendar-day="${selectedDateKey}"]`)?.click();

    return () => {
      target.removeEventListener("click", handleClick);
      target.removeEventListener("input", handleInput);
      target.removeEventListener("submit", handleSubmit);
      target.replaceChildren();
    };
  }, [api, records, selectedDateKey]);

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
    (Story) => (
      <div className="home-page" style={{ minHeight: "100vh", background: "#087046" }}>
        {/* pages/app/home.html 의 <div class="home-overlay-root" data-home-overlay-root> 를 재현한다.
            --overlay-ink / --overlay-muted / --overlay-paper / --overlay-paper-soft 가
            home-overlay-theme.css 에서 이 래퍼에만 정의돼 있어, 빠뜨리면 변수가 미정의가 되어
            스토리북에서만 글자색이 달라지고 일부 배경·테두리가 통째로 사라진다.
            .home-overlay-root 는 기본이 display:none 이므로 is-open 이 반드시 필요하다. */}
        <div className="home-overlay-root is-open" data-home-overlay-root aria-live="polite">
          <Story />
        </div>
      </div>
    )
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
/** AI 추천 퀘스트가 아직 없을 때. 슬롯이 접혀 일일 목록이 맨 위로 올라온다. */
export const ProgressWithoutAiQuest = {
  args: {
    type: "progress",
    meta: { icon: "/images/app/quest.png", title: "성장 현황", description: "현재 캐릭터의 성장 기록입니다." },
    content: `
      <section data-overlay-panel="quests">
        <div class="quest-ai-slot" hidden></div>
        <div class="overlay-section-label"><strong>일일</strong><span></span><em>익일 4시에 초기화</em></div>
        <ul class="overlay-state-list" aria-label="퀘스트 목록">
          <li><div><strong>등록된 퀘스트가 없습니다.</strong><p>오늘 제공된 퀘스트가 없습니다.</p></div><em>대기</em></li>
        </ul>
      </section>
      <section data-overlay-panel="leaders">
        <div class="overlay-section-label"><strong>명예의 전당</strong><span></span><em>전체 학습 시간</em></div>
        <div class="rank-board" aria-label="학습 시간 랭킹">
          <p class="rank-empty" data-empty-ranking>랭킹 데이터가 없습니다.</p>
        </div>
      </section>
    `
  }
};

export const Progress = {
  args: {
    type: "progress",
    meta: { icon: "/images/app/quest.png", title: "성장 현황", description: "현재 캐릭터의 성장 기록입니다." },
    content: `
      <section data-overlay-panel="quests">
        <div class="quest-ai-slot">
          <article class="quest-ai-card">
            <span class="quest-ai-badge">AI 추천</span>
            <div class="quest-ai-body">
              <strong>오늘 3시간 30분 공부하기</strong>
              <p>0 / 1 · 40 XP</p>
            </div>
            <div class="quest-ai-action"><em>0/1</em></div>
          </article>
        </div>
        <div class="overlay-section-label"><strong>일일</strong><span></span><em>익일 4시에 초기화</em></div>
        <ul class="overlay-state-list" aria-label="퀘스트 목록">
          <li><div><strong>출석하기</strong><p>1 / 1 · 20 XP</p></div><button type="button">보상 받기</button></li>
          <li><div><strong>학습 완료하기</strong><p>0 / 1 · 30 XP</p></div><em>0/1</em></li>
          <li><div><strong>캐릭터 확인</strong><p>1 / 1 · 10 XP</p></div><em>수령 완료</em></li>
        </ul>
      </section>
      <section data-overlay-panel="leaders">
        <div class="overlay-section-label"><strong>명예의 전당</strong><span></span><em>전체 학습 시간</em></div>
        <div class="rank-board" aria-label="학습 시간 랭킹">
          <p class="rank-empty" data-empty-ranking>랭킹 데이터가 없습니다.</p>
        </div>
      </section>
    `
  }
};
export const StudyRecords = {
  render: () => <StudyRecordsOverlayStory api={storyApi} />,
  play: async ({ canvasElement }) => {
    updateStoryRecord.mockClear();
    const canvas = within(canvasElement);
    expect(await canvas.findByText("09:10")).toBeInTheDocument();
    expect(canvas.getByText("10:30")).toBeInTheDocument();
    expect(canvas.getByText("1시간 20분")).toBeInTheDocument();
    expect(canvas.getByText("월간 학습")).toBeInTheDocument();
    expect(canvas.getByText("선택한 날짜")).toBeInTheDocument();
    expect(canvas.getAllByText("공부 시간")).not.toHaveLength(0);
    expect(canvas.getAllByText("학습 시간대")).not.toHaveLength(0);
    expect(canvas.queryByText("구간 1")).not.toBeInTheDocument();
    expect(canvasElement.querySelector(".study-record-sequence")).toBeNull();
    expect(canvasElement.querySelectorAll(".study-timeline-marker--record")).not.toHaveLength(0);
    expect(canvasElement.querySelector(".study-records-summary")).toBeNull();
    expect(canvas.queryByRole("tab")).not.toBeInTheDocument();
    expect(canvas.queryByText("연간")).not.toBeInTheDocument();
    const calendarOverview = canvasElement.querySelector(".study-calendar-overview");
    expect(calendarOverview?.firstElementChild).toHaveClass("study-section-total");
    expect(calendarOverview?.lastElementChild).toHaveClass("study-period-navigation");
    expect(canvas.getAllByRole("button", { name: "수정" })).not.toHaveLength(0);
    expect(canvas.getAllByRole("button", { name: "삭제" })).not.toHaveLength(0);
    await userEvent.click(canvas.getAllByRole("button", { name: "수정" })[0]);
    expect(canvas.getByLabelText(/시작 시간/)).toHaveAttribute("type", "text");
    expect(canvas.getByLabelText(/종료 시간/)).toHaveAttribute("type", "text");
    expect(canvas.getByLabelText(/시작 시간/)).toHaveAttribute("inputmode", "numeric");
    expect(canvas.getByLabelText(/시작 시간/)).toHaveValue("09:10");
    expect(canvas.getByLabelText(/종료 시간/)).toHaveValue("10:30");
    fireEvent.input(canvas.getByLabelText(/시작 시간/), { target: { value: "0910" } });
    expect(canvas.getByLabelText(/시작 시간/)).toHaveValue("09:10");
    expect(canvas.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "취소" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    expect(updateStoryRecord).toHaveBeenCalledWith("storybook-record-1", {
      startDateTime: localDateTimeValue(new Date(storyRecords[0].startTime)),
      endDateTime: localDateTimeValue(new Date(storyRecords[0].endTime)),
      expectedVersion: 0
    });
    expect(canvasElement.querySelector(".study-record-tags")).toBeNull();
  },
  parameters: {
    docs: {
      description: {
        story: "Home에서 사용하는 실제 createStudyRecords 렌더러를 마운트합니다. 조회·수정 요청은 Storybook 전용 API fixture로 계약을 검증합니다."
      }
    }
  }
};
export const MidnightStudyRecord = {
  render: () => (
    <StudyRecordsOverlayStory
      records={midnightStoryRecords}
      api={storyApi}
      selectedDateKey={midnightStoryRecords[0].aggregationDate}
    />
  ),
  play: async ({ canvasElement }) => {
    updateStoryRecord.mockClear();
    const canvas = within(canvasElement);
    expect(await canvas.findByText("23:30")).toBeInTheDocument();
    expect(canvas.getByText("00:30")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "수정" }));
    expect(canvas.getByLabelText(/시작 시간/)).toHaveValue("23:30");
    expect(canvas.getByLabelText(/종료 시간/)).toHaveValue("00:30");
    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    expect(updateStoryRecord).toHaveBeenCalledWith("storybook-midnight-record", {
      startDateTime: localDateTimeValue(new Date(midnightStoryRecords[0].startTime)),
      endDateTime: localDateTimeValue(new Date(midnightStoryRecords[0].endTime)),
      expectedVersion: 0
    });
  }
};
export const StudyRecordTimelineInsertion = {
  render: () => (
    <StudyRecordsOverlayStory
      records={timelineStoryRecords}
      api={storyApi}
      selectedDateKey={timelineStoryRecords[0].aggregationDate}
    />
  ),
  play: async ({ canvasElement }) => {
    createStoryRecord.mockClear();
    const canvas = within(canvasElement);
    const insertButtons = await canvas.findAllByRole("button", { name: /사이에 학습 기록 추가/ });

    expect(insertButtons).toHaveLength(3);
    expect(insertButtons[2]).toHaveAccessibleName(/익일 04:00 사이에 학습 기록 추가/);
    await userEvent.click(insertButtons[1]);

    const startInput = canvas.getByLabelText(/시작 시간/);
    const endInput = canvas.getByLabelText(/종료 시간/);
    const gapStart = new Date(Math.ceil(
      new Date(timelineStoryRecords[0].endTime).getTime() / (60 * 1000)
    ) * 60 * 1000);
    const gapEnd = new Date(Math.floor(
      new Date(timelineStoryRecords[1].startTime).getTime() / (60 * 1000)
    ) * 60 * 1000);
    const adjustedStart = new Date(gapEnd.getTime() - 60 * 1000);
    const outsideEnd = new Date(gapEnd.getTime() + 60 * 60 * 1000);

    expect(startInput).toHaveAttribute("type", "text");
    expect(endInput).toHaveAttribute("type", "text");
    fireEvent.input(startInput, { target: { value: localTimeValue(outsideEnd) } });
    fireEvent.input(endInput, { target: { value: localTimeValue(outsideEnd) } });

    expect(startInput).toHaveValue(localTimeValue(adjustedStart));
    expect(endInput).toHaveValue(localTimeValue(gapEnd));
    expect(canvas.getByText("입력 가능한 시간 범위로 조정했습니다.")).toBeInTheDocument();
    expect(canvasElement.querySelector("[data-study-record-draft-duration]")).toHaveTextContent("1분");

    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createStoryRecord).toHaveBeenCalledWith({
      startDateTime: localDateTimeValue(adjustedStart),
      endDateTime: localDateTimeValue(gapEnd)
    }));
  },
  parameters: {
    docs: {
      description: {
        story: "선택한 학습일을 세로 타임라인으로 표현하고 최상단, 기록 사이, 최하단에서 기록을 추가합니다. 화면에서는 시간만 입력하고 자정 이후 값은 다음 날짜의 LocalDateTime으로 변환하며, 입력값은 가능한 구간으로 보정됩니다."
      }
    }
  }
};
export const EmptyStudyRecords = {
  render: () => <StudyRecordsOverlayStory records={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("선택한 날짜에 기록이 없습니다.")).toBeInTheDocument();
    expect(canvas.queryByText(/홈에서 타이머를 시작하고/)).not.toBeInTheDocument();
  }
};
export const Settings = {
  args: {
    type: "settings",
    meta: { icon: "/images/app/set.png", title: "설정", description: "홈 화면의 표시 방식을 조정합니다." },
    content: `<section><h3>화면 설정</h3><label><input type="checkbox" checked disabled> 배경 음악 사용</label></section>`
  }
};
