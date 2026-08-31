import { expect, userEvent, within } from "storybook/test";
import { HomeMenuPanel } from "./HomeMenuPanel.jsx";

const meta = {
  title: "Patterns/HomeMenuPanel",
  component: HomeMenuPanel,
  parameters: { layout: "fullscreen" },
  args: { menu: "progress" },
  argTypes: { menu: { control: "select", options: ["progress", "personal", "cohort", "space", "party", "community", "settings"] } }
};

export default meta;
export const Progress = {};
export const Personal = { args: { menu: "personal" } };
export const Cohort = {
  name: "기수 참여 중 · 내 파티 있음",
  args: { menu: "cohort" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("NHN 아카데미 11기")).toBeInTheDocument();
    expect(canvas.getByText("11기 내 파티")).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "파티 보기" })).toBeInTheDocument();
    expect(canvas.queryByRole("button", { name: /파티 만들기/ })).not.toBeInTheDocument();
    expect(canvas.getByText("과정 소속 안내")).toBeInTheDocument();
    expect(canvas.queryByLabelText("다른 기수 참여하기")).not.toBeInTheDocument();
    expect(canvas.queryByPlaceholderText("관리자에게 받은 가입 코드")).not.toBeInTheDocument();
  }
};
export const CohortUnassigned = {
  name: "기수 없음 · 가입 대기",
  args: { menu: "cohort", approvedCohort: null, party: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("참여 기수 없음")).toBeInTheDocument();
    expect(canvas.getByText("기수 참여 후 파티를 만들 수 있어요.")).toBeInTheDocument();
    expect(canvas.getByLabelText("가입 코드")).toBeInTheDocument();
    expect(canvas.getByPlaceholderText("관리자에게 받은 가입 코드")).toBeInTheDocument();
    expect(canvas.queryByRole("button", { name: "파티 만들기" })).not.toBeInTheDocument();
  }
};
export const CohortWithoutParty = {
  name: "기수 참여 중 · 파티 없음",
  args: { menu: "cohort", party: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("참여 중인 파티가 없습니다.")).toBeInTheDocument();
    expect(canvas.getAllByRole("button", { name: /파티 만들기/ })).toHaveLength(1);
  }
};
export const Space = {
  name: "공간 · 회의실 1개와 추가 예정",
  args: { menu: "space" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { name: "공간 목록" })).toBeInTheDocument();
    expect(canvas.getByText("1개")).toBeInTheDocument();
    expect(canvas.getAllByRole("heading", { name: "회의실" })).toHaveLength(2);
    expect(canvas.getByText("관리자 준비 중")).toBeInTheDocument();
    expect(canvas.getByText("기수 관리자가 공간을 추가하면 이 목록에 표시됩니다.")).toBeInTheDocument();
    expect(canvas.queryByText("＋", { exact: true })).not.toBeInTheDocument();
    expect(canvas.getByText("1 / 1")).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "다음 공간 →" })).toBeDisabled();
    expect(canvas.getByRole("link", { name: "텔레그램 알림 설정" })).toHaveAttribute("href", expect.stringContaining("https://t.me/"));
    expect(canvas.queryByText("회의실 A")).not.toBeInTheDocument();
    expect(canvas.queryByText("▦", { exact: true })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "도서관" }));
    expect(canvas.getByText("여러 기수가 함께 사용하는 조용한 학습 공간입니다.")).toBeInTheDocument();
  }
};
export const SpaceOccupied = {
  name: "공간 · 사용 중 회의실 알림 신청",
  args: {
    menu: "space",
    upcomingSpaces: [],
    rooms: [{
      id: "meeting-room",
      name: "회의실",
      status: "OCCUPIED",
      capacity: 8,
      occupancy: { participants: [{ id: "other-user", name: "다른 사용자" }] }
    }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("공실 알림 0건")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "공실 알림 신청" }));
    expect(canvas.getByText("공실 알림 1건")).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "공실 알림 취소" })).toBeInTheDocument();
    expect(canvas.getByRole("link", { name: "텔레그램 알림 설정" })).toHaveAttribute("target", "_blank");
  }
};
export const SpaceTelegramConnected = {
  name: "공간 · 텔레그램 알림 설정됨",
  args: { menu: "space", telegramConnected: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("텔레그램 알림 설정됨")).toBeInTheDocument();
    expect(canvas.queryByRole("link", { name: "텔레그램 알림 설정" })).not.toBeInTheDocument();
  }
};
export const SpaceMultiplePages = {
  name: "공간 · 관리자 추가 후 여러 페이지",
  args: {
    menu: "space",
    upcomingSpaces: [],
    rooms: [
      { id: "meeting-room", name: "회의실", status: "AVAILABLE", capacity: 8, occupancy: null },
      { id: "project-room", name: "프로젝트룸", status: "AVAILABLE", capacity: 6, occupancy: null },
      { id: "seminar-room", name: "세미나실", status: "AVAILABLE", capacity: 12, occupancy: null }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("1 / 2")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "다음 공간 →" }));
    expect(canvas.getByText("2 / 2")).toBeInTheDocument();
    expect(canvas.getByRole("heading", { name: "세미나실" })).toBeInTheDocument();
  }
};
export const PartyMaster = {
  name: "내 파티 · 마스터",
  args: { menu: "party" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("navigation", { name: "현재 위치" })).toHaveTextContent("기수 · 팀");
    expect(canvas.getByRole("button", { name: "파티 나가기" })).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "파티 해체" })).toBeInTheDocument();
    expect(canvas.queryByText("마스터 전용")).not.toBeInTheDocument();
    expect(canvas.queryByText("초대 링크 복사")).not.toBeInTheDocument();
  }
};
export const PartyMember = {
  name: "내 파티 · 일반 파티원",
  args: { menu: "party", currentUserId: "lucky" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("button", { name: "파티 나가기" })).toBeInTheDocument();
    expect(canvas.queryByRole("button", { name: "파티 해체" })).not.toBeInTheDocument();
    expect(canvas.queryByText("파티원 초대")).not.toBeInTheDocument();
  }
};
export const Community = { args: { menu: "community" } };
export const Settings = { args: { menu: "settings" } };
export const Mobile = { args: { menu: "community" }, parameters: { viewport: { defaultViewport: "mobile1" } } };
