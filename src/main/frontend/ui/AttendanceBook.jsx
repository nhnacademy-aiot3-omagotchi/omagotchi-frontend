import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameCard } from "./GameCard.jsx";

const weekdays = ["월", "화", "수", "목", "금"];
const augustWeekdays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 31];

const statusContent = {
  before: { checkIn: "아직 입실 전", checkOut: "아직 퇴실 전", early: "기록 없음", late: "기록 없음" },
  checkedIn: { checkIn: "09:03 입실", checkOut: "학습 중", early: "정상 입실", late: "지각 없음" },
  checkedOut: { checkIn: "09:03 입실", checkOut: "18:12 퇴실", early: "정상 입실", late: "총 9시간 9분" }
};

export function AttendanceBook({
  status = "before",
  presentDays = [5, 6, 10],
  today = 13,
  streak = 3,
  loading = false,
  empty = false,
  embedded = false,
  closeControl
}) {
  const summary = statusContent[status] || statusContent.before;
  const activeDays = empty ? [] : presentDays;

  return (
    <main className={embedded ? "ui-attendance-shell" : "ui-story-canvas"}>
      <section className="ui-attendance" aria-labelledby="attendance-title" aria-busy={loading || undefined}>
        <header className="ui-attendance__header">
          <span className="ui-attendance__header-icon" aria-hidden="true">▣</span>
          <div className="ui-attendance__header-copy">
            <h1 id="attendance-title">출석 현황</h1>
            <p>오늘의 출석과 이번 달 학습 흐름을 확인하세요.</p>
          </div>
          {closeControl
            ? closeControl(<GameButton variant="secondary" className="ui-attendance__close" aria-label="출석 현황 닫기">×</GameButton>)
            : <GameButton variant="secondary" className="ui-attendance__close" aria-label="출석 현황 닫기">×</GameButton>}
        </header>

        <div className="ui-attendance__layout">
          <section className="ui-attendance__main" aria-labelledby="today-attendance-title">
            <h2 id="today-attendance-title">오늘 출석</h2>
            <div className="ui-attendance__summary">
              <GameCard tone="mint" eyebrow="입실" title={loading ? "불러오는 중…" : summary.checkIn} />
              <GameCard tone="sky" eyebrow="퇴실" title={loading ? "불러오는 중…" : summary.checkOut} />
              <GameCard tone="cream" eyebrow="출석 상태" title={loading ? "—" : summary.early} />
              <GameCard tone="peach" eyebrow="학습 기록" title={loading ? "—" : summary.late} />
            </div>
          </section>

          <section className="ui-attendance__calendar" aria-labelledby="attendance-calendar-title">
            <header className="ui-calendar-header">
              <h2 id="attendance-calendar-title">8월 출석 기록</h2>
              <div className="ui-calendar-controls">
                <button type="button" className="ui-calendar-nav" aria-label="이전 달">‹</button>
                <span>2026년 8월</span>
                <button type="button" className="ui-calendar-nav" aria-label="다음 달">›</button>
              </div>
            </header>
            <div className="ui-calendar-grid" aria-label="2026년 8월 평일 출석 달력">
              {weekdays.map((day) => <span key={day} className="ui-calendar-day ui-calendar-day--weekday">{day}</span>)}
              {augustWeekdays.map((day) => {
                const classes = ["ui-calendar-day", activeDays.includes(day) ? "ui-calendar-day--present" : "", day === today ? "ui-calendar-day--today" : ""]
                  .filter(Boolean)
                  .join(" ");
                const state = day === today ? "오늘" : activeDays.includes(day) ? "출석" : "기록 없음";
                return <span key={day} className={classes} aria-label={`8월 ${day}일, ${state}`}>{day}</span>;
              })}
            </div>
          </section>

          <section className="ui-attendance__streak" aria-labelledby="attendance-streak-title">
            <header className="ui-streak-header">
              <div>
                <h2 id="attendance-streak-title">연속 출석</h2>
                <p className="ui-card__description">입실 기록을 기준으로 이어집니다.</p>
              </div>
              <strong className="ui-streak-count">{empty ? 0 : streak}일</strong>
            </header>
            <ol className="ui-streak-list">
              {["8/7", "8/10", "8/11", "8/12", "오늘"].map((label, index) => (
                <li key={label} className={`ui-streak-item${!empty && index < streak ? " is-active" : ""}${label === "오늘" ? " is-today" : ""}`}>
                  <span className="ui-streak-dot" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
    </main>
  );
}
