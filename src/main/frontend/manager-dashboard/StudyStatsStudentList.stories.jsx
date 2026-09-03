import React from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StudyStatsStudentList } from "./StudyStatsStudentList.jsx";

const mockMembers = [
  {
    cohortMembershipId: 4,
    userId: "00000000-0000-0000-0000-000000000005",
    name: "최코딩",
    email: "student3@omagotchi.site",
    todayStudySeconds: 23400, // 6시간 30분
    periodStudySeconds: 75600, // 21시간
    activeStudyDays: 5,
    lastStudiedAt: "2026-09-02T09:30:00Z",
    isRunning: true
  },
  {
    cohortMembershipId: 2,
    userId: "00000000-0000-0000-0000-000000000003",
    name: "이열공",
    email: "student1@omagotchi.site",
    todayStudySeconds: 18000, // 5시간
    periodStudySeconds: 68400, // 19시간
    activeStudyDays: 5,
    lastStudiedAt: "2026-09-02T08:50:00Z",
    isRunning: false
  },
  {
    cohortMembershipId: 3,
    userId: "00000000-0000-0000-0000-000000000004",
    name: "박성실",
    email: "student2@omagotchi.site",
    todayStudySeconds: 14400, // 4시간
    periodStudySeconds: 54000, // 15시간
    activeStudyDays: 4,
    lastStudiedAt: "2026-09-02T08:45:00Z",
    isRunning: false
  },
  {
    cohortMembershipId: 5,
    userId: "00000000-0000-0000-0000-000000000006",
    name: "정새싹",
    email: "student4@omagotchi.site",
    todayStudySeconds: 7200, // 2시간
    periodStudySeconds: 28800, // 8시간
    activeStudyDays: 3,
    lastStudiedAt: "2026-09-02T07:20:00Z",
    isRunning: true
  },
  {
    cohortMembershipId: 6,
    userId: "00000000-0000-0000-0000-000000000007",
    name: "강지각",
    email: "student5@omagotchi.site",
    todayStudySeconds: 0,
    periodStudySeconds: 7200, // 2시간
    activeStudyDays: 1,
    lastStudiedAt: "2026-08-30T10:00:00Z",
    isRunning: false
  }
];

const mockManyMembers = Array.from({ length: 12 }, (_, index) => ({
  cohortMembershipId: 10 + index,
  userId: `user-${10 + index}`,
  name: `수강생${String(index + 1).padStart(2, "0")}`,
  email: `student${index + 1}@omagotchi.site`,
  todayStudySeconds: (12 - index) * 1800,
  periodStudySeconds: (12 - index) * 7200,
  activeStudyDays: Math.min(7, Math.max(1, 7 - Math.floor(index / 2))),
  lastStudiedAt: "2026-09-02T09:00:00Z",
  isRunning: index % 3 === 0
}));

const meta = {
  title: "ManagerDashboard/StudyStats/StudentList",
  component: StudyStatsStudentList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "관리자 대시보드 공부 통계(StudyStats) 하단의 수강생 공부 기록 테이블 및 페이지네이션 컴포넌트입니다. 컬럼 정렬, 페이지네이션, 실시간 '공부 중' 뱃지, 상세 보기 액션 등을 지원합니다."
      }
    }
  }
};

export default meta;

/** 기본 스토리: 기본 수강생 5명 목록 */
export const Default = {
  name: "기본 학생 목록",
  args: {
    members: mockMembers,
    loading: false,
    error: null,
    search: ""
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 테이블 헤더 확인
    expect(canvas.getByText("구성원")).toBeInTheDocument();
    expect(canvas.getByText("이메일")).toBeInTheDocument();
    expect(canvas.getByText("오늘 학습")).toBeInTheDocument();
    expect(canvas.getByText("조회 기간 누적")).toBeInTheDocument();
    expect(canvas.getByText("학습일")).toBeInTheDocument();
    expect(canvas.getByText("최근 기록")).toBeInTheDocument();
    expect(canvas.getByText("기록 확인")).toBeInTheDocument();

    // 수강생 행 확인
    expect(canvas.getByText("최코딩")).toBeInTheDocument();
    expect(canvas.getByText("이열공")).toBeInTheDocument();
    expect(canvas.getByText("박성실")).toBeInTheDocument();
    expect(canvas.getByText("정새싹")).toBeInTheDocument();
    expect(canvas.getByText("강지각")).toBeInTheDocument();

    // 학습 시간 및 이메일 표시 확인
    expect(canvas.getByText("student3@omagotchi.site")).toBeInTheDocument();
    expect(canvas.getByText("6시간 30분")).toBeInTheDocument();
    expect(canvas.getByText("21시간")).toBeInTheDocument();
  }
};

/** 공부 중 빨간색 라이트 표시 스토리 */
export const WithRunningStatus = {
  name: "공부 중 빨간색 라이트 표시",
  args: {
    members: mockMembers,
    loading: false,
    error: null
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // isRunning: true 인 학생(최코딩, 정새싹)의 공부 중 빨간색 라이트 인디케이터 확인
    const lights = canvas.getAllByLabelText("공부 중");
    expect(lights.length).toBe(2);
    lights.forEach((light) => {
      expect(light).toHaveClass("study-running-light");
    });
  }
};

/** 페이지네이션 동작 스토리 (12명 수강생 -> 3페이지) */
export const Pagination = {
  name: "페이지네이션 동작 (12명)",
  args: {
    members: mockManyMembers,
    pageSize: 5,
    loading: false,
    error: null
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1페이지(5명)에 첫 번째 학생 표시 확인
    expect(canvas.getByText("수강생01")).toBeInTheDocument();
    expect(canvas.getByText("수강생05")).toBeInTheDocument();
    expect(canvas.queryByText("수강생06")).not.toBeInTheDocument();

    // 페이지 번호 버튼 확인 (1, 2, 3)
    const pageButtons = canvas.getAllByRole("button", { name: /^[1-3]$/ });
    expect(pageButtons.length).toBe(3);
    expect(pageButtons[0]).toHaveClass("is-active");

    // 2페이지 버튼 클릭
    await userEvent.click(pageButtons[1]);

    // 2페이지 학생 노출 확인
    expect(canvas.getByText("수강생06")).toBeInTheDocument();
    expect(canvas.getByText("수강생10")).toBeInTheDocument();
    expect(canvas.queryByText("수강생01")).not.toBeInTheDocument();

    // 3페이지 버튼 클릭
    await userEvent.click(pageButtons[2]);

    // 3페이지 학생 노출 확인 (11, 12)
    expect(canvas.getByText("수강생11")).toBeInTheDocument();
    expect(canvas.getByText("수강생12")).toBeInTheDocument();
    expect(canvas.queryByText("수강생06")).not.toBeInTheDocument();
  }
};

/** 컬럼 정렬 인터랙션 스토리 */
export const Sorting = {
  name: "컬럼 정렬 인터랙션",
  args: {
    members: mockMembers,
    pageSize: 5
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 초기 상태는 조회 기간 내림차순: 최코딩(21h)이 첫 행
    const rowsInitial = canvasElement.querySelectorAll("tbody tr");
    expect(rowsInitial[0].querySelector("[data-studystats-member-name]").textContent).toBe("최코딩");

    // '구성원' 컬럼 헤더 클릭 (내림차순 정렬)
    const nameHeader = canvas.getByText("구성원");
    await userEvent.click(nameHeader);

    // 내림차순(가나다 역순): 최코딩 -> 정새싹 -> 이열공 -> 박성실 -> 강지각
    const rowsAfterNameDesc = canvasElement.querySelectorAll("tbody tr");
    expect(rowsAfterNameDesc[0].querySelector("[data-studystats-member-name]").textContent).toBe("최코딩");

    // '구성원' 컬럼 헤더 다시 클릭 (오름차순 정렬)
    await userEvent.click(nameHeader);

    // 오름차순(가나다순): 강지각이 첫 번째 행이어야 함
    const rowsAfterNameAsc = canvasElement.querySelectorAll("tbody tr");
    expect(rowsAfterNameAsc[0].querySelector("[data-studystats-member-name]").textContent).toBe("강지각");

    // '오늘 학습' 컬럼 헤더 클릭 (내림차순 정렬)
    const todayHeader = canvas.getByText("오늘 학습");
    await userEvent.click(todayHeader);

    const rowsAfterTodayDesc = canvasElement.querySelectorAll("tbody tr");
    expect(rowsAfterTodayDesc[0].querySelector("[data-studystats-member-name]").textContent).toBe("최코딩");
    expect(rowsAfterTodayDesc[4].querySelector("[data-studystats-member-name]").textContent).toBe("강지각");
  }
};

/** 검색 필터링 적용 스토리 */
export const SearchFiltering = {
  name: "검색 필터링",
  args: {
    members: mockMembers,
    search: "이열공"
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // "이열공" 학생만 노출되어야 함
    expect(canvas.getByText("이열공")).toBeInTheDocument();
    expect(canvas.getByText("student1@omagotchi.site")).toBeInTheDocument();

    // 다른 학생들은 노출되지 않아야 함
    expect(canvas.queryByText("최코딩")).not.toBeInTheDocument();
    expect(canvas.queryByText("박성실")).not.toBeInTheDocument();
    expect(canvas.queryByText("정새싹")).not.toBeInTheDocument();
    expect(canvas.queryByText("강지각")).not.toBeInTheDocument();
  }
};

/** 이메일 검색 필터링 스토리 */
export const EmailSearchFiltering = {
  name: "이메일 검색 필터링",
  args: {
    members: mockMembers,
    search: "student4@"
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("정새싹")).toBeInTheDocument();
    expect(canvas.getByText("student4@omagotchi.site")).toBeInTheDocument();
    expect(canvas.queryByText("이열공")).not.toBeInTheDocument();
  }
};

/** 학생 목록 비어있음 스토리 */
export const Empty = {
  name: "조회된 수강생 없음",
  args: {
    members: [],
    loading: false,
    error: null
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
    members: [],
    loading: true,
    error: null
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("공부 통계를 불러오는 중입니다.")).toBeInTheDocument();
  }
};

/** 에러 상태 스토리 */
export const ErrorState = {
  name: "조회 실패",
  args: {
    members: [],
    loading: false,
    error: "네트워크 오류 발생"
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("공부 통계를 불러오지 못했습니다.")).toBeInTheDocument();
  }
};

/** 수강생 선택/상세보기 액션 인터랙션 스토리 */
export const InteractiveSelectMember = {
  name: "상세보기 및 회원 클릭 상호작용",
  args: {
    members: mockMembers,
    onSelectMember: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // '최코딩' 회원 이름 클릭
    const nameBtn = canvas.getByText("최코딩");
    await userEvent.click(nameBtn);
    expect(args.onSelectMember).toHaveBeenCalledWith(
      expect.objectContaining({ name: "최코딩" })
    );

    // 두 번째 행 '상세 보기' 버튼 클릭
    const detailButtons = canvas.getAllByRole("button", { name: "상세 보기" });
    await userEvent.click(detailButtons[1]);
    expect(args.onSelectMember).toHaveBeenCalledWith(
      expect.objectContaining({ name: "이열공" })
    );
  }
};

/** 키보드 정렬 및 정렬 상태 접근성 스토리 */
export const KeyboardSorting = {
  name: "키보드 정렬 접근성",
  args: {
    members: mockMembers,
    pageSize: 5
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sortableLabels = [
      "구성원",
      "오늘 학습",
      "조회 기간 누적",
      "학습일",
      "최근 기록"
    ];

    sortableLabels.forEach((label) => {
      expect(canvas.getByRole("button", { name: label })).toBeInTheDocument();
    });

    const nameSortButton = canvas.getByRole("button", { name: "구성원" });
    const nameHeader = nameSortButton.closest("th");
    expect(nameHeader).toHaveAttribute("aria-sort", "none");

    nameSortButton.focus();
    await userEvent.keyboard("{Enter}");
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");

    await userEvent.keyboard(" ");
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  }
};

function ShrinkingMemberList() {
  const [members, setMembers] = React.useState(mockManyMembers);

  return (
    <>
      <button type="button" onClick={() => setMembers(mockMembers.slice(0, 2))}>
        조회 결과 축소
      </button>
      <StudyStatsStudentList members={members} pageSize={5} />
    </>
  );
}

/** 구성원 목록 축소 시 현재 페이지 보정 스토리 */
export const PageRangeCorrection = {
  name: "목록 축소 시 페이지 보정",
  render: () => <ShrinkingMemberList />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pageButtons = canvas.getAllByRole("button", { name: /^[1-3]$/ });

    await userEvent.click(pageButtons[2]);
    expect(canvas.getByText("수강생11")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "조회 결과 축소" }));
    expect(canvas.getByText("최코딩")).toBeInTheDocument();
    expect(canvas.queryByText("조회된 수강생이 없습니다.")).not.toBeInTheDocument();
  }
};
