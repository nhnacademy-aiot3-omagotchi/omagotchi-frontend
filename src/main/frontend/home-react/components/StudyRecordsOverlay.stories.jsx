import { useEffect, useRef } from "react";
import { expect, userEvent, within } from "storybook/test";
import { createStudyRecords } from "../../../resources/static/js/home/studyRecords.js";
import { HomeOverlay } from "./HomeOverlay.jsx";

const studyRecordsMeta = {
  icon: "/images/app/studyrecord.png",
  title: "학습 기록",
  description: "집중한 시간을 돌아보고 학습 흐름을 정리하세요."
};

function localDateTimeValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

function localTimeValue(date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function createStoryRecord({
  id,
  daysAgo = 0,
  startHour = 9,
  startMinute = 0,
  startSecond = 0,
  endHour = 10,
  endMinute = 0,
  endSecond = 0
}) {
  const base = new Date();
  base.setDate(base.getDate() - daysAgo);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), startHour, startMinute, startSecond);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), endHour, endMinute, endSecond);
  const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");

  return {
    id,
    version: 0,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    recordedAt: end.toISOString(),
    studySeconds: durationSeconds,
    durationSeconds,
    aggregationDate: `${year}-${month}-${day}`
  };
}

const sampleRecords = [
  createStoryRecord({ id: "rec-1", daysAgo: 1, startHour: 9, startMinute: 10, endHour: 10, endMinute: 30 }),
  createStoryRecord({ id: "rec-2", daysAgo: 1, startHour: 13, startMinute: 0, endHour: 15, endMinute: 0 }),
  createStoryRecord({ id: "rec-3", daysAgo: 2, startHour: 14, startMinute: 30, endHour: 16, endMinute: 45 }),
  createStoryRecord({ id: "rec-4", daysAgo: 3, startHour: 10, startMinute: 20, endHour: 11, endMinute: 50 })
];

function StudyRecordsViewer({
  records = sampleRecords,
  loadErrorMessage = null,
  actionErrorOnSave = false,
  selectedDateKey
}) {
  const hostRef = useRef(null);

  useEffect(() => {
    const target = hostRef.current?.querySelector("[data-study-records-target]");
    if (!target) return undefined;

    const controller = createStudyRecords({
      api: {
        getDailyRecords: async (date) => {
          if (loadErrorMessage) throw new Error(loadErrorMessage);
          return records.filter((r) => r.aggregationDate === date);
        },
        getMonthlySummary: async (month) => {
          if (loadErrorMessage) throw new Error(loadErrorMessage);
          const monthly = records.filter((r) => r.aggregationDate.startsWith(month));
          const dailyTotals = Object.entries(
            monthly.reduce((acc, r) => ({
              ...acc,
              [r.aggregationDate]: (acc[r.aggregationDate] || 0) + r.studySeconds
            }), {})
          ).map(([aggregationDate, studySeconds]) => ({ aggregationDate, studySeconds }));

          return {
            aggregationMonth: month,
            totalStudySeconds: monthly.reduce((sum, r) => sum + r.studySeconds, 0),
            dailyTotals
          };
        },
        createRecord: async () => {
          if (actionErrorOnSave) throw new Error("학습 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return { id: "rec-new", version: 0 };
        },
        updateRecord: async (id) => {
          if (actionErrorOnSave) throw new Error("학습 기록을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return { id, version: 1 };
        },
        deleteRecord: async () => undefined
      }
    });

    const handleClick = (e) => controller.handleClick(e);
    const handleInput = (e) => controller.handleInput(e);
    const handleSubmit = (e) => controller.handleSubmit(e);

    target.addEventListener("click", handleClick);
    target.addEventListener("input", handleInput);
    target.addEventListener("submit", handleSubmit);

    controller.mount(target);

    if (selectedDateKey) {
      target.querySelector(`[data-study-calendar-day="${selectedDateKey}"]`)?.click();
    }

    return () => {
      target.removeEventListener("click", handleClick);
      target.removeEventListener("input", handleInput);
      target.removeEventListener("submit", handleSubmit);
      target.replaceChildren();
    };
  }, [records, loadErrorMessage, actionErrorOnSave, selectedDateKey]);

  return (
    <div ref={hostRef}>
      <HomeOverlay
        type="write"
        meta={studyRecordsMeta}
        content={'<div data-study-records-target></div>'}
        onClose={() => {}}
      />
    </div>
  );
}

const meta = {
  title: "Home/StudyRecordsOverlay",
  component: HomeOverlay,
  parameters: {
    layout: "fullscreen"
  },
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "100vh", background: "#087046" }}>
        <div className="home-overlay-root is-open">
          <Story />
        </div>
      </div>
    )
  ]
};

export default meta;

/** 기본 스토리: 정상 학습 기록 목록, 헤더 텍스트/x버튼 색상 통일 및 고정 확인 */
export const Default = {
  name: "기본 학습 기록 (헤더·버튼 색상 및 스크롤 고정)",
  render: () => <StudyRecordsViewer records={sampleRecords} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 상단 텍스트 및 x 버튼 확인
    const header = canvasElement.querySelector(".ui-menu-live-header");
    expect(header).toBeInTheDocument();

    const title = canvas.getByText("학습 기록");
    const description = canvas.getByText("집중한 시간을 돌아보고 학습 흐름을 정리하세요.");
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();

    const closeButton = canvasElement.querySelector(".home-overlay-close");
    expect(closeButton).toBeInTheDocument();

    // 상단 텍스트 및 x 버튼 색상이 #0c3022 인지 확인 (컴퓨티드 스타일)
    const headerTitleStyle = window.getComputedStyle(title);
    const closeButtonStyle = window.getComputedStyle(closeButton);
    // RGB 값 12, 48, 34 = #0c3022
    expect(headerTitleStyle.color).toBe("rgb(12, 48, 34)");
    expect(closeButtonStyle.color).toBe("rgb(12, 48, 34)");

    // 2. 모달 컨테이너가 flex/overflow-hidden이고 본문이 스크롤 가능한지 확인 (x버튼 스크롤 방지)
    const overlay = canvasElement.querySelector(".home-overlay");
    expect(overlay).toHaveStyle({ overflow: "hidden", display: "flex" });

    // 3. 기록 내용 확인
    expect(await canvas.findByText("09:10")).toBeInTheDocument();
    expect(canvas.getByText("10:30")).toBeInTheDocument();
    expect(canvas.getByText("1시간 20분")).toBeInTheDocument();
  }
};

/** 에러 텍스트 표시 스토리: 에러 텍스트 색상이 흰색이 아닌 빨간색(danger)으로 표시되는지 검증 */
export const LoadError = {
  name: "조회 오류 (에러 텍스트 색상 검증)",
  render: () => <StudyRecordsViewer records={[]} loadErrorMessage="학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const errorElement = await canvas.findByText("학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass("study-record-load-error");

    // 에러 텍스트 색상이 흰색이 아니라 위험 색상(#c73f52 = rgb(199, 63, 82))인지 확인!
    const errorStyle = window.getComputedStyle(errorElement);
    expect(errorStyle.color).not.toBe("rgb(255, 255, 255)");
    expect(errorStyle.color).not.toBe("rgba(255, 255, 255, 0.82)");
    expect(errorStyle.color).toBe("rgb(199, 63, 82)");
  }
};

/** 작업 오류 스토리: 저장 시 에러 메시지가 빨간색으로 표시되는지 검증 */
export const ActionError = {
  name: "저장 오류 (에러 메시지 표시)",
  render: () => <StudyRecordsViewer records={sampleRecords} actionErrorOnSave={true} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("09:10")).toBeInTheDocument();

    const editButtons = canvas.getAllByRole("button", { name: "수정" });
    await userEvent.click(editButtons[0]);

    const saveButton = canvas.getByRole("button", { name: "저장" });
    await userEvent.click(saveButton);

    const alertElement = await canvas.findByText("학습 기록을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveClass("study-record-action-error");

    // 글자색이 빨간색인지 확인
    const alertStyle = window.getComputedStyle(alertElement);
    expect(alertStyle.color).toBe("rgb(199, 63, 82)");
  }
};

/** 빈 데이터 상태 */
export const EmptyRecords = {
  name: "기록 없음",
  render: () => <StudyRecordsViewer records={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("선택한 날짜에 기록이 없습니다.")).toBeInTheDocument();
  }
};
