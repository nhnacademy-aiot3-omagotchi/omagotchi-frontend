import React from "react";
import { expect, userEvent, within } from "storybook/test";
import "../../resources/static/css/managerDashboard.css";
import { StudyStatsWorkspace } from "./StudyStatsWorkspace.jsx";

const mockMemberProfiles = [
  { cohortMembershipId: 2, nickname: "이열공", email: "student1@omagotchi.site" },
  { cohortMembershipId: 3, nickname: "박성실", email: "student2@omagotchi.site" },
  { cohortMembershipId: 4, nickname: "최코딩", email: "student3@omagotchi.site" },
  { cohortMembershipId: 5, nickname: "정새싹", email: "student4@omagotchi.site" },
  { cohortMembershipId: 6, nickname: "강지각", email: "student5@omagotchi.site" }
];

const mockTodayStats = {
  aggregationDate: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 58500, // 16시간 15분
  activeStudentCount: 5,
  participantCount: 4,
  noRecordStudentCount: 1,
  runningTimerCount: 1,
  averageParticipantStudySeconds: 14625,
  durationBuckets: [
    { code: "NO_RECORD", memberCount: 1 },
    { code: "UNDER_ONE_HOUR", memberCount: 0 },
    { code: "ONE_TO_TWO_HOURS", memberCount: 1 },
    { code: "TWO_TO_FOUR_HOURS", memberCount: 1 },
    { code: "FOUR_HOURS_OR_MORE", memberCount: 2 }
  ]
};

const mock7DaysTrend = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 234000,
  averageDailyStudySeconds: 33428,
  dailyTotals: [
    { aggregationDate: "2026-08-27", studySeconds: 25200 }, // 7.0h
    { aggregationDate: "2026-08-28", studySeconds: 36000 }, // 10.0h
    { aggregationDate: "2026-08-29", studySeconds: 14400 }, // 4.0h
    { aggregationDate: "2026-08-30", studySeconds: 18000 }, // 5.0h
    { aggregationDate: "2026-08-31", studySeconds: 39600 }, // 11.0h
    { aggregationDate: "2026-09-01", studySeconds: 43200 }, // 12.0h
    { aggregationDate: "2026-09-02", studySeconds: 58500 }  // 16.25h
  ]
};

const mock7DaysPartialTrend = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 94500, // 26시간 15분 (36000 + 58500)
  averageDailyStudySeconds: 13500, // 94500 / 7 (3시간 45분, N=7일 기준 균등 분할)
  dailyTotals: [
    { aggregationDate: "2026-08-27", studySeconds: 0 },
    { aggregationDate: "2026-08-28", studySeconds: 36000 }, // 10.0h
    { aggregationDate: "2026-08-29", studySeconds: 0 },
    { aggregationDate: "2026-08-30", studySeconds: 0 },
    { aggregationDate: "2026-08-31", studySeconds: 0 },
    { aggregationDate: "2026-09-01", studySeconds: 0 },
    { aggregationDate: "2026-09-02", studySeconds: 58500 }  // 16.25h
  ]
};

const mock30DaysTrend = {
  window: "30d",
  from: "2026-08-04",
  to: "2026-09-02",
  calculatedAt: "2026-09-02T10:00:00Z",
  totalStudySeconds: 850000,
  averageDailyStudySeconds: 28333,
  dailyTotals: Array.from({ length: 30 }, (_, index) => {
    const d = new Date(2026, 7, 4 + index); // 8월 4일부터
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    return {
      aggregationDate: `${yyyy}-${mm}-${dd}`,
      studySeconds: isWeekend ? 7200 + (index % 3) * 3600 : 25000 + (index % 5) * 5000
    };
  })
};

const mockMembersStats = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  items: [
    {
      cohortMembershipId: 4,
      userId: "00000000-0000-0000-0000-000000000005",
      nickname: "최코딩",
      todayStudySeconds: 23400, // 6.5h
      periodStudySeconds: 75600, // 21h
      activeStudyDays: 5,
      lastStudiedAt: "2026-09-02T09:30:00Z",
      isRunning: true
    },
    {
      cohortMembershipId: 2,
      userId: "00000000-0000-0000-0000-000000000003",
      nickname: "이열공",
      todayStudySeconds: 18000, // 5h
      periodStudySeconds: 68400, // 19h
      activeStudyDays: 5,
      lastStudiedAt: "2026-09-02T08:50:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 3,
      userId: "00000000-0000-0000-0000-000000000004",
      nickname: "박성실",
      todayStudySeconds: 14400, // 4h
      periodStudySeconds: 54000, // 15h
      activeStudyDays: 4,
      lastStudiedAt: "2026-09-02T08:45:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 5,
      userId: "00000000-0000-0000-0000-000000000006",
      nickname: "정새싹",
      todayStudySeconds: 7200, // 2h
      periodStudySeconds: 28800, // 8h
      activeStudyDays: 3,
      lastStudiedAt: "2026-09-02T07:20:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 6,
      userId: "00000000-0000-0000-0000-000000000007",
      nickname: "강지각",
      todayStudySeconds: 0,
      periodStudySeconds: 7200, // 2h
      activeStudyDays: 1,
      lastStudiedAt: "2026-08-30T10:00:00Z",
      isRunning: false
    }
  ]
};

const mockMembersPartialStats = {
  window: "7d",
  from: "2026-08-27",
  to: "2026-09-02",
  items: [
    {
      cohortMembershipId: 4,
      userId: "00000000-0000-0000-0000-000000000005",
      nickname: "최코딩",
      todayStudySeconds: 23400, // 6.5h
      periodStudySeconds: 37800, // 10.5h (08-28 4h + 09-02 6.5h)
      activeStudyDays: 2,
      lastStudiedAt: "2026-09-02T09:30:00Z",
      isRunning: true
    },
    {
      cohortMembershipId: 2,
      userId: "00000000-0000-0000-0000-000000000003",
      nickname: "이열공",
      todayStudySeconds: 18000, // 5h
      periodStudySeconds: 32400, // 9h (08-28 4h + 09-02 5h)
      activeStudyDays: 2,
      lastStudiedAt: "2026-09-02T08:50:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 3,
      userId: "00000000-0000-0000-0000-000000000004",
      nickname: "박성실",
      todayStudySeconds: 14400, // 4h
      periodStudySeconds: 14400, // 4h (09-02 4h)
      activeStudyDays: 1,
      lastStudiedAt: "2026-09-02T08:45:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 5,
      userId: "00000000-0000-0000-0000-000000000006",
      nickname: "정새싹",
      todayStudySeconds: 2700, // 45m
      periodStudySeconds: 9900, // 2시간 45분 (08-28 2h + 09-02 45m)
      activeStudyDays: 2,
      lastStudiedAt: "2026-09-02T07:20:00Z",
      isRunning: false
    },
    {
      cohortMembershipId: 6,
      userId: "00000000-0000-0000-0000-000000000007",
      nickname: "강지각",
      todayStudySeconds: 0,
      periodStudySeconds: 0,
      activeStudyDays: 0,
      lastStudiedAt: null,
      isRunning: false
    }
  ]
};

const meta = {
  title: "ManagerDashboard/StudyStats",
  component: StudyStatsWorkspace,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "관리자 대시보드의 '공부 통계' 패널입니다. 기수 학습량 추이(Line), Top 5(Bar), 오늘 시간 분포(Doughnut) 차트와 수강생 공부 기록 목록을 제공합니다."
      }
    }
  }
};

export default meta;

/** 기본 스토리: 최근 7일 기수 학습량 추이 및 통계 */
export const Default = {
  name: "최근 7일 기수 학습량 추이",
  args: {
    todayStats: mockTodayStats,
    trendStats: mock7DaysTrend,
    membersStats: mockMembersStats,
    memberProfiles: mockMemberProfiles,
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 제목 및 안내 문구 확인
    expect(canvas.getByText("공부 통계")).toBeInTheDocument();
    expect(canvas.getByText("수강생 공부 기록")).toBeInTheDocument();
    expect(canvas.getByText("최근 7일 기수 학습량 추이")).toBeInTheDocument();
    expect(canvas.getByText("최근 7일 학습량 Top 5")).toBeInTheDocument();
    expect(canvas.getByText("오늘 학습 시간 분포")).toBeInTheDocument();

    // KPI 카드 확인
    expect(canvas.getByText("오늘 기수 총 학습")).toBeInTheDocument();
    expect(canvas.getByText("오늘 참여")).toBeInTheDocument();
    expect(canvas.getByText("4 / 5명 (80%)")).toBeInTheDocument();
    expect(canvas.getByText("공부 중인 학생")).toBeInTheDocument();
    expect(canvas.getByText("1명")).toBeInTheDocument();

    // 테이블 수강생 확인
    expect(canvas.getByText("최코딩")).toBeInTheDocument();
    expect(canvas.getByText("이열공")).toBeInTheDocument();
    expect(canvas.getByText("박성실")).toBeInTheDocument();
  }
};

/** 최근 7일 기수 학습량 추이 (일부 누락) 스토리:
 * 7일 중 2일에 대한 정보만 들어오는 경우의 표기 방식입니다.
 * learning-service의 로직(CohortStatisticsService.fillDailyTotals)을 참조하여:
 * 1. DB에 기록이 없는 5일은 0초(studySeconds: 0)로 채워져 요청 window(7일) 전체 날짜가 오름차순 반환됩니다.
 * 2. 일평균 학습 시간(averageDailyStudySeconds)은 실제 기록일 수(2)가 아닌 전체 window(7일)로 나눈 값(totalStudySeconds / 7)으로 계산됩니다.
 * 3. 추이 차트(Line Chart)는 X축에 7개 일자(08/27 ~ 09/02)가 모두 표시되며, 누락된 5일은 0시간으로 표기되어 바닥선에 위치합니다.
 */
export const PartialData = {
  name: "최근 7일 기수 학습량 추이 (일부 누락)",
  parameters: {
    docs: {
      description: {
        story:
          "최근 7일 중 2일(08/28, 09/02)에 대한 정보만 들어오고 나머지 5일은 누락된 경우입니다. `learning-service`의 집계 정책에 따라 데이터가 누락된 5일은 `0초`로 채워진 7일 전체가 반환되며, 차트 X축에도 7개 일자 모두 표시되고 누락된 날은 0시간으로 표기됩니다."
      }
    }
  },
  args: {
    todayStats: mockTodayStats,
    trendStats: mock7DaysPartialTrend,
    membersStats: mockMembersPartialStats,
    memberProfiles: mockMemberProfiles,
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 제목 및 안내 문구 확인
    expect(canvas.getByText("공부 통계")).toBeInTheDocument();
    expect(canvas.getByText("수강생 공부 기록")).toBeInTheDocument();
    expect(canvas.getByText("최근 7일 기수 학습량 추이")).toBeInTheDocument();
    expect(canvas.getByText("최근 7일 학습량 Top 5")).toBeInTheDocument();
    expect(canvas.getByText("오늘 학습 시간 분포")).toBeInTheDocument();

    // KPI 카드 확인
    expect(canvas.getByText("오늘 기수 총 학습")).toBeInTheDocument();
    expect(canvas.getByText("오늘 참여")).toBeInTheDocument();
    expect(canvas.getByText("4 / 5명 (80%)")).toBeInTheDocument();
    expect(canvas.getByText("공부 중인 학생")).toBeInTheDocument();
    expect(canvas.getByText("1명")).toBeInTheDocument();

    // 테이블 수강생 확인
    expect(canvas.getByText("최코딩")).toBeInTheDocument();
    expect(canvas.getByText("이열공")).toBeInTheDocument();
    expect(canvas.getByText("박성실")).toBeInTheDocument();
  }
};

/** 최근 30일 조회 스토리 */
export const ThirtyDays = {
  name: "최근 30일 기수 학습량 추이",
  args: {
    todayStats: mockTodayStats,
    trendStats: mock30DaysTrend,
    membersStats: {
      ...mockMembersStats,
      window: "30d"
    },
    memberProfiles: mockMemberProfiles,
    period: 30
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("최근 30일 기수 학습량 추이")).toBeInTheDocument();
    expect(canvas.getByText("최근 30일 학습량 Top 5")).toBeInTheDocument();
  }
};

/** 기록 없음 스토리: 수강생은 있으나 학습 기록이 없는 상태 */
export const EmptyData = {
  name: "기록 없음",
  args: {
    todayStats: {
      aggregationDate: "2026-09-02",
      totalStudySeconds: 0,
      activeStudentCount: 3,
      participantCount: 0,
      noRecordStudentCount: 3,
      runningTimerCount: 0,
      averageParticipantStudySeconds: 0,
      durationBuckets: [
        { code: "NO_RECORD", memberCount: 3 },
        { code: "UNDER_ONE_HOUR", memberCount: 0 },
        { code: "ONE_TO_TWO_HOURS", memberCount: 0 },
        { code: "TWO_TO_FOUR_HOURS", memberCount: 0 },
        { code: "FOUR_HOURS_OR_MORE", memberCount: 0 }
      ]
    },
    trendStats: {
      window: "7d",
      from: "2026-08-27",
      to: "2026-09-02",
      totalStudySeconds: 0,
      averageDailyStudySeconds: 0,
      dailyTotals: [
        { aggregationDate: "2026-08-27", studySeconds: 0 },
        { aggregationDate: "2026-08-28", studySeconds: 0 },
        { aggregationDate: "2026-08-29", studySeconds: 0 },
        { aggregationDate: "2026-08-30", studySeconds: 0 },
        { aggregationDate: "2026-08-31", studySeconds: 0 },
        { aggregationDate: "2026-09-01", studySeconds: 0 },
        { aggregationDate: "2026-09-02", studySeconds: 0 }
      ]
    },
    membersStats: {
      window: "7d",
      items: [
        { cohortMembershipId: 2, userId: "u-2", todayStudySeconds: 0, periodStudySeconds: 0, activeStudyDays: 0, lastStudiedAt: null },
        { cohortMembershipId: 3, userId: "u-3", todayStudySeconds: 0, periodStudySeconds: 0, activeStudyDays: 0, lastStudiedAt: null },
        { cohortMembershipId: 4, userId: "u-4", todayStudySeconds: 0, periodStudySeconds: 0, activeStudyDays: 0, lastStudiedAt: null }
      ]
    },
    memberProfiles: [
      { cohortMembershipId: 2, nickname: "이열공", email: "student1@omagotchi.site" },
      { cohortMembershipId: 3, nickname: "박성실", email: "student2@omagotchi.site" },
      { cohortMembershipId: 4, nickname: "최코딩", email: "student3@omagotchi.site" }
    ],
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("0 / 3명 (0%)")).toBeInTheDocument();
    expect(canvas.getByText("공부 중인 학생")).toBeInTheDocument();
    expect(canvas.getByText("0명")).toBeInTheDocument();
  }
};

/** 수강생 없음 스토리 */
export const NoMembers = {
  name: "수강생 없음",
  args: {
    todayStats: {
      totalStudySeconds: 0,
      activeStudentCount: 0,
      participantCount: 0,
      noRecordStudentCount: 0,
      runningTimerCount: 0,
      averageParticipantStudySeconds: 0,
      durationBuckets: []
    },
    trendStats: {
      window: "7d",
      dailyTotals: []
    },
    membersStats: {
      items: []
    },
    memberProfiles: [],
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("조회된 수강생이 없습니다.")).toBeInTheDocument();
  }
};

/** 로딩 상태 스토리 */
export const Loading = {
  name: "로딩 중",
  args: {
    loading: true,
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("공부 통계를 불러오는 중입니다.")).toBeInTheDocument();
  }
};

/** 검색창 입력 및 하단 학생 목록 필터링 연동 스토리 */
export const SearchFilter = {
  name: "검색창 입력 및 학생 목록 필터링",
  args: {
    todayStats: mockTodayStats,
    trendStats: mock7DaysTrend,
    membersStats: mockMembersStats,
    memberProfiles: mockMemberProfiles,
    period: 7
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText("이름 또는 이메일");
    await userEvent.type(searchInput, "최코딩");

    expect(canvas.getByText("최코딩")).toBeInTheDocument();
    expect(canvas.queryByText("이열공")).not.toBeInTheDocument();
    expect(canvas.queryByText("박성실")).not.toBeInTheDocument();
  }
};
