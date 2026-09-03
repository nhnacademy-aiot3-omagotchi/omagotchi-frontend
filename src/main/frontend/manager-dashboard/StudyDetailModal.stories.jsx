import React, { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import "../../resources/static/css/managerDashboard.css";
import { StudyDetailModal } from "./StudyDetailModal.jsx";

const mock7DaysOverview = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 68400, // 19시간
  averageDailyStudySeconds: 9771, // 약 2시간 42분 (N=7일 기준)
  activeStudyDays: 5,
  recordCount: 12,
  dailyTotals: [
    { aggregationDate: "2026-08-27", studySeconds: 10800 }, // 3.0h
    { aggregationDate: "2026-08-28", studySeconds: 14400 }, // 4.0h
    { aggregationDate: "2026-08-29", studySeconds: 0 },     // 0h (기록 없음)
    { aggregationDate: "2026-08-30", studySeconds: 7200 },  // 2.0h
    { aggregationDate: "2026-08-31", studySeconds: 18000 }, // 5.0h
    { aggregationDate: "2026-09-01", studySeconds: 0 },     // 0h
    { aggregationDate: "2026-09-02", studySeconds: 18000 }  // 5.0h (오늘)
  ]
};

const mock30DaysOverview = {
  window: "30d",
  from: "2026-08-04",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 288000, // 80시간
  averageDailyStudySeconds: 9600, // 2시간 40분
  activeStudyDays: 20,
  recordCount: 52,
  dailyTotals: Array.from({ length: 30 }, (_, index) => {
    const d = new Date(2026, 7, 4 + index);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    return {
      aggregationDate: `${yyyy}-${mm}-${dd}`,
      studySeconds: isWeekend ? 0 : 10800 + (index % 4) * 3600
    };
  })
};

const mockEmptyOverview = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 0,
  averageDailyStudySeconds: 0,
  activeStudyDays: 0,
  recordCount: 0,
  dailyTotals: [
    { aggregationDate: "2026-08-27", studySeconds: 0 },
    { aggregationDate: "2026-08-28", studySeconds: 0 },
    { aggregationDate: "2026-08-29", studySeconds: 0 },
    { aggregationDate: "2026-08-30", studySeconds: 0 },
    { aggregationDate: "2026-08-31", studySeconds: 0 },
    { aggregationDate: "2026-09-01", studySeconds: 0 },
    { aggregationDate: "2026-09-02", studySeconds: 0 }
  ]
};

// 2026-09-02 (오늘) 세션 3건
const mockTodayRecords = [
  {
    id: "rec-101",
    startTime: "2026-09-02T00:10:00Z", // KST 09:10
    endTime: "2026-09-02T02:30:00Z",   // KST 11:30
    studySeconds: 8400, // 2시간 20분
    updatedAt: "2026-09-02T02:30:00Z"
  },
  {
    id: "rec-102",
    startTime: "2026-09-02T04:00:00Z", // KST 13:00
    endTime: "2026-09-02T06:00:00Z",   // KST 15:00
    studySeconds: 7200, // 2시간
    updatedAt: "2026-09-02T06:00:00Z"
  },
  {
    id: "rec-103",
    startTime: "2026-09-02T07:30:00Z", // KST 16:30
    endTime: "2026-09-02T08:10:00Z",   // KST 17:10
    studySeconds: 2400, // 40분
    updatedAt: "2026-09-02T08:10:00Z"
  }
];

// 2026-08-31 세션 2건
const mockPastRecords = [
  {
    id: "rec-201",
    startTime: "2026-08-31T01:00:00Z", // KST 10:00
    endTime: "2026-08-31T04:00:00Z",   // KST 13:00
    studySeconds: 10800, // 3시간
    updatedAt: "2026-08-31T04:00:00Z"
  },
  {
    id: "rec-202",
    startTime: "2026-08-31T05:00:00Z", // KST 14:00
    endTime: "2026-08-31T07:00:00Z",   // KST 16:00
    studySeconds: 7200, // 2시간
    updatedAt: "2026-08-31T07:00:00Z"
  }
];

const meta = {
  title: "ManagerDashboard/StudyStats/StudyDetailModal",
  component: StudyDetailModal,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "관리자 대시보드 공부 통계 패널에서 특정 수강생의 '상세 보기'를 눌렀을 때 나타나는 수강생 개인 공부 기록 팝업 다이얼로그입니다. 최근 7일/30일간의 학습량 추이(Bar Chart), 4종 요약 KPI 카드, KST 04:00 기준 24시간 타임라인 바, 그리고 일자별 실제 공부 세션 목록을 제공합니다."
      }
    }
  }
};

export default meta;

/** 기본 스토리: 최근 7일 개인 공부 통계 및 선택 날짜(오늘) 세션 목록 */
export const Default = {
  name: "기본 7일 통계 및 세션 목록",
  args: {
    isOpen: true,
    memberName: "이열공",
    memberEmail: "student1@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mock7DaysOverview,
    records: mockTodayRecords,
    loadingOverview: false,
    loadingRecords: false,
    error: null,
    onClose: fn(),
    onPeriodChange: fn(),
    onSelectDate: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 헤더 영역 확인
    expect(canvas.getByText("개인 공부 통계")).toBeInTheDocument();
    expect(canvas.getByText("이열공")).toBeInTheDocument();
    expect(canvas.getByText("student1@omagotchi.site")).toBeInTheDocument();

    // 기간 토글 및 안내 확인
    expect(canvas.getByRole("button", { name: "최근 7일" })).toHaveClass("is-active");
    expect(canvas.getByText("최근 7일의 학습 기록입니다.")).toBeInTheDocument();

    // 4종 KPI 카드 수치 확인
    expect(canvas.getByText("기간 총 학습")).toBeInTheDocument();
    expect(canvas.getByText("19시간")).toBeInTheDocument();
    expect(canvas.getByText("학습일 평균")).toBeInTheDocument();
    expect(canvas.getByText("2시간 42분")).toBeInTheDocument();
    expect(canvas.getByText("학습한 날")).toBeInTheDocument();
    expect(canvas.getByText("5일")).toBeInTheDocument();
    expect(canvas.getByText("공부 세션")).toBeInTheDocument();
    expect(canvas.getByText("12회")).toBeInTheDocument();

    // 추이 차트 타이틀 확인
    expect(canvas.getByText("개인 학습량 추이")).toBeInTheDocument();

    // 타임라인 섹션 확인
    expect(canvas.getByText("선택 날짜 타임라인")).toBeInTheDocument();
    expect(canvas.getByText("오전 4시부터 다음 날 오전 4시까지를 하루로 표시합니다.")).toBeInTheDocument();

    // 타임라인 바 3건 확인
    const timelineBars = canvasElement.querySelectorAll(".study-timeline-bar");
    expect(timelineBars.length).toBe(3);

    // 세션 카드 3건 및 시간 구간 확인
    expect(canvas.getByText("3개 세션")).toBeInTheDocument();
    expect(canvas.getByText("09:10 ~ 11:30")).toBeInTheDocument();
    expect(canvas.getByText("2시간 20분")).toBeInTheDocument();
    expect(canvas.getByText("13:00 ~ 15:00")).toBeInTheDocument();
    expect(canvas.getByText("16:30 ~ 17:10")).toBeInTheDocument();
    expect(canvas.getByText("40분")).toBeInTheDocument();
  }
};

/** 최근 30일 조회 스토리 */
export const ThirtyDays = {
  name: "최근 30일 개인 통계 조회",
  args: {
    isOpen: true,
    memberName: "최코딩",
    memberEmail: "student3@omagotchi.site",
    periodDays: 30,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mock30DaysOverview,
    records: mockTodayRecords,
    onClose: fn(),
    onPeriodChange: fn(),
    onSelectDate: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 30일 탭 활성화 및 문구 확인
    expect(canvas.getByRole("button", { name: "최근 30일" })).toHaveClass("is-active");
    expect(canvas.getByText("최근 30일의 학습 기록입니다.")).toBeInTheDocument();

    // 30일 KPI 수치 확인
    expect(canvas.getByText("80시간")).toBeInTheDocument();
    expect(canvas.getByText("2시간 40분")).toBeInTheDocument();
    expect(canvas.getByText("20일")).toBeInTheDocument();
    expect(canvas.getByText("52회")).toBeInTheDocument();
  }
};

/** 공부 기록 없음 스토리: 기간 및 선택 일자에 기록이 전혀 없는 상태 */
export const EmptyRecords = {
  name: "공부 기록 없음 (Empty State)",
  args: {
    isOpen: true,
    memberName: "강지각",
    memberEmail: "student5@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mockEmptyOverview,
    records: [],
    onClose: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // KPI 카드 0 확인
    expect(canvas.getByText("0분")).toBeInTheDocument();
    expect(canvas.getByText("0일")).toBeInTheDocument();
    expect(canvas.getByText("0회")).toBeInTheDocument();

    // 차트 빈 상태 안내 확인
    expect(canvas.getByText("표시할 학습 기록이 없습니다.")).toBeInTheDocument();

    // 타임라인 빈 상태 확인
    expect(canvas.getByText("이 날짜에는 공부 기록이 없습니다.")).toBeInTheDocument();

    // 세션 목록 빈 상태 확인
    expect(canvas.getByText("0개 세션")).toBeInTheDocument();
    expect(canvas.getByText("선택한 날짜에는 공부 기록이 없습니다.")).toBeInTheDocument();
  }
};

/** 타임라인 바 클릭 및 세션 하이라이트 인터랙션 스토리 */
export const InteractiveTimeline = {
  name: "타임라인 바 클릭 시 세션 카드 포커스",
  args: {
    isOpen: true,
    memberName: "이열공",
    memberEmail: "student1@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mock7DaysOverview,
    records: mockTodayRecords,
    onClose: fn()
  },
  play: async ({ canvasElement }) => {
    const timelineBars = canvasElement.querySelectorAll(".study-timeline-bar");
    expect(timelineBars.length).toBe(3);

    // 두 번째 세션(13:00 ~ 15:00, rec-102) 타임라인 바 클릭
    await userEvent.click(timelineBars[1]);

    // 해당 타임라인 바 is-active 클래스 확인
    expect(timelineBars[1]).toHaveClass("is-active");

    // 해당 세션 카드(rec-102) is-active 클래스 확인
    const activeCard = canvasElement.querySelector('.study-detail-record[data-detail-record-id="rec-102"]');
    expect(activeCard).not.toBeNull();
    expect(activeCard).toHaveClass("is-active");
  }
};

/** 기간 탭 및 날짜 이동 컨트롤 인터랙션 스토리 */
export const InteractiveNavigation = {
  name: "기간 토글 및 날짜 이동 인터랙션",
  args: {
    isOpen: true,
    memberName: "이열공",
    memberEmail: "student1@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mock7DaysOverview,
    records: mockTodayRecords,
    onClose: fn(),
    onPeriodChange: fn(),
    onSelectDate: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 1. "최근 30일" 버튼 클릭 -> onPeriodChange 호출 검증
    const btn30Days = canvas.getByRole("button", { name: "최근 30일" });
    await userEvent.click(btn30Days);
    expect(args.onPeriodChange).toHaveBeenCalledWith(30);

    // 2. "‹" (이전 날짜) 버튼 클릭 -> onSelectDate("2026-09-01") 호출 검증
    const prevDateBtn = canvas.getByLabelText("이전 날짜");
    await userEvent.click(prevDateBtn);
    expect(args.onSelectDate).toHaveBeenCalledWith("2026-09-01");

    // 3. "오늘" 버튼 클릭 -> onSelectDate("2026-09-02") 호출 검증
    const todayBtn = canvas.getByRole("button", { name: "오늘" });
    await userEvent.click(todayBtn);
    expect(args.onSelectDate).toHaveBeenCalledWith("2026-09-02");
  }
};

/** 데이터 로딩 상태 스토리 */
export const Loading = {
  name: "통계 및 기록 로딩 상태",
  args: {
    isOpen: true,
    memberName: "박성실",
    memberEmail: "student2@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    loadingOverview: true,
    loadingRecords: true,
    overview: null,
    records: [],
    onClose: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("개인 공부 통계를 불러오는 중입니다.")).toBeInTheDocument();
    expect(canvas.getByText("날짜별 기록을 불러오는 중입니다.")).toBeInTheDocument();
  }
};

/** 통계 조회 실패 오류 상태 스토리 */
export const ErrorState = {
  name: "조회 실패 오류 상태",
  args: {
    isOpen: true,
    memberName: "박성실",
    memberEmail: "student2@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    error: "네트워크 통신 오류로 개인 통계를 불러오지 못했습니다.",
    overview: null,
    records: [],
    onClose: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("네트워크 통신 오류로 개인 통계를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(canvas.getByText("표시할 학습 기록이 없습니다.")).toBeInTheDocument();
  }
};

/** 키보드 접근성(ESC) 및 모달 닫기 버튼 상호작용 스토리 */
export const KeyboardAndClose = {
  name: "닫기 버튼 및 ESC 키보드 접근성",
  args: {
    isOpen: true,
    memberName: "이열공",
    memberEmail: "student1@omagotchi.site",
    periodDays: 7,
    selectedDate: "2026-09-02",
    today: "2026-09-02",
    overview: mock7DaysOverview,
    records: mockTodayRecords,
    onClose: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 1. 헤더 "×" 닫기 버튼 클릭
    const closeBtn = canvas.getByLabelText("상세 보기 닫기");
    await userEvent.click(closeBtn);
    expect(args.onClose).toHaveBeenCalledTimes(1);

    // 2. 푸터 "닫기" 버튼 클릭
    const footerCloseBtn = canvas.getByRole("button", { name: "닫기" });
    await userEvent.click(footerCloseBtn);
    expect(args.onClose).toHaveBeenCalledTimes(2);

    // 3. ESC 키 입력
    await userEvent.keyboard("{Escape}");
    expect(args.onClose).toHaveBeenCalledTimes(3);
  }
};

function FullInteractiveModalWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState(7);
  const [selectedDate, setSelectedDate] = useState("2026-09-02");

  const overview = period === 30 ? mock30DaysOverview : mock7DaysOverview;
  const records = selectedDate === "2026-09-02"
    ? mockTodayRecords
    : selectedDate === "2026-08-31"
    ? mockPastRecords
    : [];

  return (
    <div style={{ padding: 24 }}>
      <button
        type="button"
        className="secondary-button"
        onClick={() => setIsOpen(true)}
      >
        이열공 수강생 기록 상세 보기 열기
      </button>

      <StudyDetailModal
        isOpen={isOpen}
        memberName="이열공"
        memberEmail="student1@omagotchi.site"
        periodDays={period}
        onPeriodChange={setPeriod}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        today="2026-09-02"
        overview={overview}
        records={records}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/** 실제 상태 변경 및 열기/닫기가 모두 연결된 완전한 인터랙티브 스토리 */
export const FullInteractiveExperience = {
  name: "완전한 상태 연동 인터랙티브 체험",
  render: () => <FullInteractiveModalWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 모달 열기 버튼 클릭
    const openBtn = canvas.getByRole("button", { name: "이열공 수강생 기록 상세 보기 열기" });
    await userEvent.click(openBtn);

    // 모달 헤더 노출 확인
    expect(canvas.getByText("이열공 님의 공부 기록")).toBeInTheDocument();

    // 2. 이전 날짜 버튼 클릭 -> 2026-09-01로 이동 -> 기록 없음 확인
    const prevBtn = canvas.getByLabelText("이전 날짜");
    await userEvent.click(prevBtn);
    expect(canvas.getByText("선택한 날짜에는 공부 기록이 없습니다.")).toBeInTheDocument();

    // 3. 다시 이전 날짜 버튼 클릭 -> 2026-08-31로 이동 -> 2개 세션 노출 확인
    await userEvent.click(prevBtn);
    expect(canvas.getByText("2개 세션")).toBeInTheDocument();
    expect(canvas.getByText("10:00 ~ 13:00")).toBeInTheDocument();

    // 4. "오늘" 버튼 클릭 -> 2026-09-02로 복귀 -> 3개 세션 확인
    const todayBtn = canvas.getByRole("button", { name: "오늘" });
    await userEvent.click(todayBtn);
    expect(canvas.getByText("3개 세션")).toBeInTheDocument();

    // 5. 모달 닫기
    const closeBtn = canvas.getByLabelText("상세 보기 닫기");
    await userEvent.click(closeBtn);
    expect(canvas.queryByText("이열공 님의 공부 기록")).not.toBeInTheDocument();
  }
};
