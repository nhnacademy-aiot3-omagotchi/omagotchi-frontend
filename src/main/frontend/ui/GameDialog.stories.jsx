import React from "react";
import { AttendanceBook } from "./AttendanceBook.jsx";
import { GameButton } from "./GameButton.jsx";
import { GameDialog, GameDialogClose } from "./GameDialog.jsx";

const meta = {
  title: "UI/GameDialog",
  component: GameDialog,
  parameters: { layout: "fullscreen" }
};

export default meta;

export const Attendance = {
  render: () => (
    <main className="ui-story-canvas">
      <GameDialog
        title="출석 현황"
        description="오늘의 출석과 이번 달 학습 흐름"
        trigger={<GameButton>출석 현황 열기</GameButton>}
      >
        <AttendanceBook
          embedded
          status="checkedIn"
          presentDays={[5, 6, 10, 13]}
          streak={4}
          closeControl={(button) => <GameDialogClose>{button}</GameDialogClose>}
        />
      </GameDialog>
    </main>
  )
};

export const OpenByDefault = {
  render: () => (
    <main className="ui-story-canvas">
      <GameDialog
        defaultOpen
        title="출석 현황"
        description="Escape 키와 배경 클릭으로 닫을 수 있습니다."
        trigger={<GameButton>출석 현황 다시 열기</GameButton>}
      >
        <AttendanceBook
          embedded
          closeControl={(button) => <GameDialogClose>{button}</GameDialogClose>}
        />
      </GameDialog>
    </main>
  )
};

export const Mobile = {
  ...Attendance,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } }
};
