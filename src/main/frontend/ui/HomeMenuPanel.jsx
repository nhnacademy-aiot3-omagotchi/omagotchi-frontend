import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";

const menuMeta = {
  progress: { title: "진행", description: "퀘스트와 성장 기록", icon: "/images/app/quest.png" },
  personal: { title: "내 정보", description: "나의 학습과 캐릭터", icon: "/images/app/userList.png" },
  cohort: { title: "기수", description: "참여 기수와 가입 상태", icon: "/images/app/cohort.png" },
  records: { title: "학습 기록", description: "집중 시간과 학습 흐름", icon: "/images/app/studyrecord.png" },
  space: { title: "공간", description: "함께 공부할 공간", icon: "/images/app/door.png" },
  community: { title: "커뮤", description: "공지와 동료들의 이야기", icon: "/images/app/commu.png" },
  settings: { title: "설정", description: "계정과 이용 환경", icon: "/images/app/set.png" }
};

function Stat({ label, value, tone = "mint" }) {
  return <article className={`ui-menu-stat ui-menu-stat--${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function ProgressPanel() {
  return (
    <>
      <nav className="ui-menu-tabs" aria-label="진행 항목"><button className="is-active" type="button">퀘스트</button><button type="button">업적</button><button type="button">랭킹</button><button type="button">통계</button></nav>
      <div className="ui-menu-stats"><Stat label="오늘 집중" value="2시간 18분" /><Stat label="연속 출석" value="4일" tone="cream" /><Stat label="이번 주" value="8시간 40분" tone="sky" /></div>
      <section className="ui-menu-section">
        <header><div><span className="ui-menu-eyebrow">오늘의 퀘스트</span><h3>집중 학습 3시간 달성</h3></div><strong>76%</strong></header>
        <progress value="76" max="100">76%</progress>
        <p>42분 더 집중하면 경험치 120을 받을 수 있어요.</p>
      </section>
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
      <div className="ui-menu-stats"><Stat label="총 학습" value="42시간" /><Stat label="출석" value="12일" tone="cream" /><Stat label="완료 퀘스트" value="18개" tone="lilac" /></div>
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

const studySessions = [
  ["08.13", "UI 컴포넌트 정리", "1시간 22분"],
  ["08.12", "React Island 학습", "2시간 05분"],
  ["08.11", "출석 화면 설계", "54분"]
];

function RecordsPanel() {
  return (
    <>
      <div className="ui-menu-stats"><Stat label="오늘" value="2시간 18분" /><Stat label="이번 주" value="8시간 40분" tone="sky" /><Stat label="평균 세션" value="48분" tone="cream" /></div>
      <section className="ui-menu-section">
        <header><div><span className="ui-menu-eyebrow">최근 기록</span><h3>집중 학습 세션</h3></div><GameButton variant="secondary">기록 추가</GameButton></header>
        <ol className="ui-record-list">
          {studySessions.map(([date, title, duration]) => <li key={`${date}-${title}`}><time>{date}</time><strong>{title}</strong><span>{duration}</span></li>)}
        </ol>
      </section>
    </>
  );
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
