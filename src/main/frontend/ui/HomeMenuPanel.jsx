import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";
import { GameTabs } from "./GameTabs.jsx";

const menuMeta = {
  progress: { title: "진행", description: "퀘스트와 성장 기록", icon: "/images/app/quest.png" },
  personal: { title: "내 정보", description: "나의 학습과 캐릭터", icon: "/images/app/userList.png" },
  cohort: { title: "기수", description: "참여 기수와 가입 상태", icon: "/images/app/cohort.png" },
  records: { title: "학습 기록", description: "집중 시간과 학습 흐름", icon: "/images/app/studyrecord.png" },
  space: { title: "공간", description: "함께 공부할 공간", icon: "/images/app/door.png" },
  community: { title: "커뮤", description: "공지와 동료들의 이야기", icon: "/images/app/commu.png" },
  settings: { title: "설정", description: "계정과 이용 환경", icon: "/images/app/set.png" }
};

function Stat({ label, value }) {
  return <article className="ui-menu-stat"><span>{label}</span><strong>{value}</strong></article>;
}

function ProgressPanel() {
  const progressItems = [
    {
      value: "quest",
      label: "퀘스트",
      content: (
        <section className="ui-menu-section">
          <header><div><span className="ui-menu-eyebrow">오늘의 퀘스트</span><h3>집중 학습 3시간 달성</h3></div><strong>76%</strong></header>
          <progress value="76" max="100">76%</progress>
          <p>42분 더 집중하면 경험치 120을 받을 수 있어요.</p>
        </section>
      )
    },
    { value: "achievement", label: "업적", content: <section className="ui-menu-section"><h3>업적 기능은 아직 준비되지 않았습니다.</h3><p>기능이 준비되면 달성 기록을 확인할 수 있습니다.</p></section> },
    { value: "ranking", label: "랭킹", content: <section className="ui-menu-section"><h3>랭킹 데이터가 없습니다.</h3><p>학습 기록이 제공되면 목록으로 표시됩니다.</p></section> },
    { value: "statistics", label: "통계", content: <section className="ui-menu-section"><h3>학습 통계</h3><p>오늘·이번 주 기록을 한 가지 목록 형식으로 확인합니다.</p></section> }
  ];

  return (
    <>
      <div className="ui-menu-stats"><Stat label="오늘 집중" value="2시간 18분" /><Stat label="연속 출석" value="4일" /><Stat label="이번 주" value="8시간 40분" /></div>
      <GameTabs items={progressItems} defaultValue="quest" ariaLabel="진행 항목" />
    </>
  );
}

function PersonalPanel() {
  return (
    <>
      <section className="ui-profile-hero">
        <div className="ui-profile-avatar"><img src="/images/characters/default/omagotchi_eye.gif" alt="나의 오마고치 캐릭터" /></div>
        <div><span className="ui-menu-eyebrow">학습자</span><h3>오마고치</h3><p>오늘도 차근차근 성장하고 있어요.</p></div>
        <strong>Lv. 7</strong>
      </section>
      <div className="ui-menu-stats"><Stat label="총 학습" value="42시간" /><Stat label="출석" value="12일" /><Stat label="완료 퀘스트" value="18개" /></div>
      <dl className="ui-menu-list"><div><dt>이메일</dt><dd>learner@example.com</dd></div><div><dt>참여 기수</dt><dd>NHN Academy 7기</dd></div><div><dt>대표 캐릭터</dt><dd>새싹 오마고치</dd></div></dl>
    </>
  );
}

function CohortPanel() {
  return (
    <>
      <section className="ui-menu-section ui-cohort-current">
        <div><span className="ui-menu-eyebrow">참여 중</span><h3>NHN Academy 7기</h3><p>2026.07.01 — 2026.12.18</p></div>
        <span className="ui-menu-chip">활동 중</span>
      </section>
      <div className="ui-menu-stats"><Stat label="재실 인원" value="18명" /><Stat label="내 출석" value="92%" tone="cream" /><Stat label="함께한 시간" value="36시간" tone="sky" /></div>
      <form className="ui-menu-inline-form" onSubmit={(event) => event.preventDefault()}>
        <GameField label="새 기수 참가" placeholder="관리자에게 받은 가입 코드" />
        <GameButton type="submit">참가 신청</GameButton>
      </form>
    </>
  );
}
// daily Study Sessions -> Timer
const dailyStudySessions = [
  { start: "08:10", end: "09:30", title: "구간 1", duration: "1시간 20분 15초" },
  { start: "10:00", end: "11:05", title: "구간 2", duration: "1시간 5분 30초" },
  { start: "13:30", end: "15:45", title: "구간 3", duration: "2시간 15분 45초" }
];

function formatHoursMinutes(seconds) {
  if (seconds === 0) return "0h 00m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function getMockMonthlyData(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const data = {
    aggregationMonth: monthStr,
    totalStudySeconds: 0,
    dailyTotals: []
  };

  const getHeatLevelForDay = (day) => {
    if (day % 5 === 0) return 0;
    if (day % 3 === 0) return 4;
    if (day % 2 === 0) return 2;
    return 1;
  };

  if (monthStr === "2026-08") {
    data.totalStudySeconds = 152100;
    for (let d = 1; d <= 18; d++) {
       data.dailyTotals.push({
          aggregationDate: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          studySeconds: getHeatLevelForDay(d) * 3600
       });
    }
  } else if (monthStr === "2026-07") {
    data.totalStudySeconds = 300000;
    for (let d = 1; d <= 31; d++) {
       const heat = d % 4 === 0 ? 3 : 2;
       data.dailyTotals.push({
          aggregationDate: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          studySeconds: heat * 3600
       });
    }
  }
  return data;
}

function MonthlyRecordsView({ currentMonth, setCurrentMonth, onDateClick }) {
  const [year, month] = currentMonth.split("-").map(Number);
  const mockData = getMockMonthlyData(currentMonth);
  
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const handlePrevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };
  
  const handleNextMonth = () => {
    const next = new Date(year, month, 1);
    setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => {
     const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
     const record = mockData.dailyTotals.find(d => d.aggregationDate === dateStr);
     return {
       date: i + 1,
       dateStr,
       hasData: Boolean(record),
       studySeconds: record ? record.studySeconds : 0
     };
  });

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div className="ui-menu-stats">
        <Stat label="이번 달 학습" value={formatHoursMinutes(mockData.totalStudySeconds).replace('h ', '시간 ').replace('m', '분')} />
        <Stat label="출석" value={`${mockData.dailyTotals.filter(d => d.studySeconds > 0).length}일`} tone="sky" />
        <Stat label="연속" value="5일" tone="cream" />
      </div>
      <section className="ui-menu-section">
        <header>
          <div>
            <span className="ui-menu-eyebrow">MONTHLY HEATMAP</span>
            <h3>날짜별 학습 시간</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="button" onClick={handlePrevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ui-ink-muted)", padding: "4px" }}>&lt;</button>
            <strong style={{ fontSize: "16px", width: "70px", textAlign: "center" }}>{year}.{String(month).padStart(2, '0')}</strong>
            <button type="button" onClick={handleNextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ui-ink-muted)", padding: "4px" }}>&gt;</button>
          </div>
        </header>
        <p style={{ color: "var(--ui-ink-muted)", marginBottom: "16px", fontSize: "14px", lineHeight: 1.5 }}>
          오전 4시부터 다음 날 오전 4시까지를 하루로 표시합니다. 날짜를 선택하면 일간 타임라인으로 이동합니다.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {["일", "월", "화", "수", "목", "금", "토"].map(day => (
            <div key={day} style={{ textAlign: "center", fontSize: "14px", color: "var(--ui-ink-muted)", fontWeight: "600", paddingBottom: "8px" }}>{day}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map((info, i) => {
            const isDisabled = !info.hasData;
            const heat = Math.floor(info.studySeconds / 3600);
            
            return (
              <div
                key={i}
                onClick={() => !isDisabled && onDateClick(info.dateStr)}
                style={{
                  height: "64px",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDisabled ? "transparent" : (info.studySeconds === 0 ? "var(--ui-canvas)" : `rgba(47, 196, 124, ${Math.min(1, 0.2 + (heat * 0.16))})`),
                  border: isDisabled ? "1px dashed var(--ui-line)" : (info.studySeconds === 0 ? "1px solid var(--ui-line)" : "none"),
                  color: isDisabled ? "var(--ui-ink-muted)" : (heat > 3 ? "#fff" : "var(--ui-ink)"),
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled ? 0.4 : 1
                }}
              >
                <strong style={{ fontSize: "16px" }}>{info.date}</strong>
                {!isDisabled && (
                  <span style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
                    {formatHoursMinutes(info.studySeconds)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "12px", color: "var(--ui-ink-muted)" }}>
          <span>Less</span>
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "var(--ui-canvas)", border: "1px solid var(--ui-line)" }} />
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgba(47, 196, 124, 0.36)" }} />
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgba(47, 196, 124, 0.52)" }} />
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgba(47, 196, 124, 0.68)" }} />
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgba(47, 196, 124, 0.84)" }} />
          <span>More</span>
        </div>
      </section>
    </div>
  );
}

function DailyRecordsView({ selectedDate, setSelectedDate }) {
  const [year, month, day] = selectedDate.split("-");
  const [selectedSessionId, setSelectedSessionId] = React.useState(null);

  const handlePrevDay = () => {
    const prev = new Date(year, month - 1, Number(day) - 1);
    setSelectedDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`);
  };
  
  const handleNextDay = () => {
    const next = new Date(year, month - 1, Number(day) + 1);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div className="ui-menu-stats">
        <Stat label="선택 날짜" value={`${Number(month)}월 ${Number(day)}일`} />
        <Stat label="총 학습" value="4시간 40분" tone="sky" />
        <Stat label="세션 수" value="3개" tone="cream" />
      </div>
      <section className="ui-menu-section">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="ui-menu-eyebrow">04:00 — NEXT 04:00</span>
            <h3>24시간 공부 타임라인</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="button" onClick={handlePrevDay} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ui-ink-muted)", padding: "4px" }}>&lt;</button>
            <strong style={{ fontSize: "16px", width: "100px", textAlign: "center" }}>{selectedDate}</strong>
            <button type="button" onClick={handleNextDay} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ui-ink-muted)", padding: "4px" }}>&gt;</button>
          </div>
        </header>
        <div style={{ position: "relative", height: "64px", background: "var(--ui-canvas)", borderRadius: "12px", border: "1px solid var(--ui-line)", marginBottom: "24px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0", display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 8px 4px", fontSize: "11px", color: "var(--ui-ink-muted)" }}>
             <span>04</span><span>10</span><span>16</span><span>22</span><span>04</span>
          </div>
          <button type="button" onClick={() => setSelectedSessionId(0)} style={{ position: "absolute", left: "17%", width: "5%", top: "8px", bottom: "20px", background: "var(--ui-emerald-500)", borderRadius: "4px", border: selectedSessionId === 0 ? "2px solid var(--ui-emerald-700)" : "none", color: "#fff", fontSize: "10px", padding: "0 2px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>1h 20m</button>
          <button type="button" onClick={() => setSelectedSessionId(1)} style={{ position: "absolute", left: "25%", width: "4%", top: "8px", bottom: "20px", background: "var(--ui-emerald-500)", borderRadius: "4px", border: selectedSessionId === 1 ? "2px solid var(--ui-emerald-700)" : "none", color: "#fff", fontSize: "10px", padding: "0 2px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>1h 5m</button>
          <button type="button" onClick={() => setSelectedSessionId(2)} style={{ position: "absolute", left: "40%", width: "9%", top: "8px", bottom: "20px", background: "var(--ui-emerald-500)", borderRadius: "4px", border: selectedSessionId === 2 ? "2px solid var(--ui-emerald-700)" : "none", color: "#fff", fontSize: "10px", padding: "0 2px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>2h 15m</button>
        </div>

        <header>
          <div>
            <span className="ui-menu-eyebrow">상세 기록</span>
            <h3>공부 상세 구간</h3>
          </div>
          <GameButton variant="secondary">기록 추가</GameButton>
        </header>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {dailyStudySessions.map((session, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: selectedSessionId === i ? "var(--ui-surface-hover, #f1f5f9)" : "var(--ui-surface)", borderRadius: "12px", border: selectedSessionId === i ? "1px solid var(--ui-emerald-500)" : "1px solid var(--ui-line)", transition: "all 0.2s" }}>
               <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                 <span style={{ fontSize: "12px", color: selectedSessionId === i ? "var(--ui-emerald-600)" : "var(--ui-ink-muted)", fontWeight: "600", width: "16px", textAlign: "center" }}>{i + 1}</span>
                 <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                   <strong style={{ fontSize: "15px", color: "var(--ui-ink)" }}>{session.start} – {session.end}</strong>
                   <span style={{ fontSize: "13px", color: "var(--ui-ink-muted)" }}>{session.title}</span>
                 </div>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                 <strong style={{ color: "var(--ui-emerald-600)" }}>{session.duration}</strong>
                 <div style={{ display: "flex", gap: "6px" }}>
                    <button type="button" style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--ui-line)", background: "#fff", cursor: "pointer", fontSize: "13px", color: "var(--ui-ink)", fontWeight: "500" }}>수정</button>
                    <button type="button" style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--ui-line)", background: "#fff", cursor: "pointer", fontSize: "13px", color: "var(--ui-danger)", fontWeight: "500" }}>삭제</button>
                 </div>
               </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function RecordsPanel() {
  const [activeTab, setActiveTab] = React.useState("monthly");
  const [currentMonth, setCurrentMonth] = React.useState("2026-08");
  const [selectedDate, setSelectedDate] = React.useState("2026-08-13");

  const tabs = [
    { 
      value: "monthly", 
      label: "월간", 
      content: <MonthlyRecordsView 
        currentMonth={currentMonth} 
        setCurrentMonth={setCurrentMonth} 
        onDateClick={(date) => {
          setSelectedDate(date);
          setActiveTab("daily");
        }} 
      /> 
    },
    { 
      value: "daily", 
      label: "일간", 
      content: <DailyRecordsView selectedDate={selectedDate} /> 
    }
  ];

  return <GameTabs items={tabs} value={activeTab} onValueChange={setActiveTab} ariaLabel="학습 기록 뷰" />;
}

const rooms = [
  { name: "7기 실습실", description: "현재 참여 중인 기수 공간", status: "18명 학습 중", tone: "mint" },
  { name: "회의실 A", description: "팀 회고와 페어 프로그래밍", status: "2자리 남음", tone: "sky" },
  { name: "조용한 도서관", description: "개인 집중 학습 공간", status: "입장 가능", tone: "cream" }
];

function SpacePanel() {
  return (
    <div className="ui-room-grid">
      {rooms.map((room) => <article key={room.name} className={`ui-room-card ui-room-card--${room.tone}`}><span aria-hidden="true">▦</span><div><h3>{room.name}</h3><p>{room.description}</p></div><strong>{room.status}</strong><GameButton variant="secondary">입장</GameButton></article>)}
    </div>
  );
}

const posts = [
  { type: "공지", title: "이번 주 금요일 데모데이 안내", author: "기수 관리자", time: "10분 전" },
  { type: "자유", title: "오늘 학습 목표 공유해요", author: "민지", time: "32분 전" },
  { type: "자유", title: "React 상태 관리 자료 추천", author: "준호", time: "1시간 전" }
];

function CommunityPanel() {
  return (
    <>
      <div className="ui-community-toolbar"><nav className="ui-menu-tabs" aria-label="게시판 구분"><button className="is-active" type="button">전체</button><button type="button">공지</button><button type="button">자유</button></nav><input type="search" aria-label="게시글 검색" placeholder="게시글 검색" /><GameButton>글쓰기</GameButton></div>
      <ol className="ui-community-list">
        {posts.map((post) => <li key={post.title}><span className="ui-menu-chip">{post.type}</span><div><strong>{post.title}</strong><p>{post.author} · {post.time}</p></div><span aria-hidden="true">›</span></li>)}
      </ol>
    </>
  );
}

function SettingsPanel() {
  return (
    <>
      <section className="ui-settings-group"><h3>화면 및 소리</h3><label><span><strong>배경 음악</strong><small>홈 화면에서 BGM을 재생합니다.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>움직임 줄이기</strong><small>화면 전환 효과를 최소화합니다.</small></span><input type="checkbox" /></label></section>
      <section className="ui-settings-group"><h3>계정</h3><button type="button"><span><strong>비밀번호 변경</strong><small>새 비밀번호를 설정합니다.</small></span><span>›</span></button><button type="button" className="is-danger"><span><strong>로그아웃</strong><small>현재 기기에서 로그아웃합니다.</small></span><span>›</span></button></section>
    </>
  );
}

const panelByMenu = { progress: ProgressPanel, personal: PersonalPanel, cohort: CohortPanel, records: RecordsPanel, space: SpacePanel, community: CommunityPanel, settings: SettingsPanel };

export function HomeMenuPanel({ menu = "progress" }) {
  const meta = menuMeta[menu] || menuMeta.progress;
  const Panel = panelByMenu[menu] || ProgressPanel;

  return (
    <main className="ui-story-canvas">
      <section className={`ui-menu-panel ui-menu-panel--${menu}`} aria-labelledby={`ui-menu-${menu}-title`}>
        <header className="ui-menu-panel__header">
          <span className="ui-menu-panel__icon" aria-hidden="true"><img src={meta.icon} alt="" /></span>
          <div><h2 id={`ui-menu-${menu}-title`}>{meta.title}</h2><p>{meta.description}</p></div>
          <button type="button" className="ui-menu-panel__close" aria-label={`${meta.title} 닫기`}>×</button>
        </header>
        <div className="ui-menu-panel__body"><Panel /></div>
      </section>
    </main>
  );
}

/**
 * 실제 Home용 내용 어댑터.
 * Storybook의 mock Panel은 가져오지 않고, home.js가 만든 내부 템플릿만 감싼다.
 */
export function HomeMenuLiveContent({ menu, content }) {
  return (
    <div
      className={`ui-menu-live-content ui-menu-live-content--${menu}`}
      data-ui-state="ready"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
