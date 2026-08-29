import { useState } from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";
import { GameTabs } from "./GameTabs.jsx";

const menuMeta = {
  progress: { title: "진행", description: "퀘스트와 성장 기록", icon: "/images/app/quest.png" },
  personal: { title: "내 정보", description: "나의 학습과 캐릭터", icon: "/images/app/userList.png" },
  cohort: { title: "기수 · 팀", description: "기수 안에서 팀을 만들고 함께 성장하세요.", icon: "/images/app/cohort.png" },
  space: { title: "공간", description: "함께 공부할 공간", icon: "/images/app/door.png" },
  party: { title: "내 파티", description: "함께할 멤버를 초대하고 파티를 관리하세요.", icon: "/images/app/social.png" },
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

const defaultCohortMembers = [
  { id: "current-user", name: "m00n", characterImage: "/images/characters/study/study.png" },
  { id: "lucky", name: "LUCKY", characterImage: "/images/characters/caffeine/pistachio.png" },
  { id: "nabi", name: "NABI", characterImage: "/images/characters/sprout/cream_can.png" },
  { id: "commit", name: "COMMIT", characterImage: "/images/characters/commit/light_purple.png" }
];

const defaultApprovedCohort = {
  cohortId: 11,
  name: "NHN 아카데미 11기",
  startDate: "2026.03.02",
  endDate: "2026.09.18",
  role: "STUDENT",
  cohortStatus: "ACTIVE",
  memberCount: 32,
  members: defaultCohortMembers
};

const defaultParty = {
  id: "party-home",
  name: "집에 가고 싶은 사람들",
  masterId: "current-user",
  members: defaultCohortMembers.slice(0, 3)
};

const defaultRooms = [
  {
    id: "meeting-room",
    name: "회의실",
    status: "AVAILABLE",
    capacity: 8,
    occupancy: null
  }
];

function CharacterAvatar({ member, compact = false }) {
  return (
    <span className={`ui-character-avatar${compact ? " is-compact" : ""}`} title={member.name}>
      <img src={member.characterImage} alt={`${member.name} 캐릭터`} />
    </span>
  );
}

function CohortJoinForm() {
  return (
    <form className="ui-menu-inline-form" onSubmit={(event) => event.preventDefault()}>
      <GameField label="가입 코드" placeholder="관리자에게 받은 가입 코드" />
      <GameButton type="submit">참가 신청</GameButton>
    </form>
  );
}

function CohortPanel({ approvedCohort, party }) {
  if (!approvedCohort) {
    return (
      <div className="ui-cohort-empty-layout" data-cohort-state="unassigned">
        <section className="ui-cohort-empty" aria-labelledby="ui-cohort-empty-title">
          <div>
            <span className="ui-menu-eyebrow">나의 기수</span>
            <h3 id="ui-cohort-empty-title">참여 기수 없음</h3>
            <p>승인된 기수 정보가 없습니다. 관리자에게 받은 가입 코드로 참가를 신청해 주세요.</p>
          </div>
          <span className="ui-menu-chip">대기</span>
        </section>
        <CohortJoinForm />
        <section className="ui-cohort-party-locked" aria-label="기수 내 파티 비활성 상태">
          <div><strong>기수 참여 후 파티를 만들 수 있어요.</strong><p>승인이 완료되면 같은 기수 멤버와 최대 8명까지 파티를 구성할 수 있습니다.</p></div>
        </section>
      </div>
    );
  }

  const cohortMembers = approvedCohort.members || [];
  const visibleMembers = cohortMembers.slice(0, 7);
  const hiddenMemberCount = Math.max(0, (approvedCohort.memberCount || cohortMembers.length) - visibleMembers.length);
  const partyMembers = party?.members || [];

  return (
    <section className="ui-cohort-shell" data-cohort-state="approved">
      <span className="ui-menu-eyebrow">나의 기수</span>
      <header className="ui-cohort-summary">
        <div className="ui-cohort-summary__copy">
          <h3>{approvedCohort.name}</h3>
          <p>{approvedCohort.startDate} — {approvedCohort.endDate}</p>
          <span className="ui-menu-chip">{approvedCohort.cohortStatus === "ACTIVE" ? "운영 중" : "대기"}</span>
        </div>
        <div className="ui-cohort-member-stack" aria-label={`기수원 ${approvedCohort.memberCount || cohortMembers.length}명`}>
          {visibleMembers.map((member) => <CharacterAvatar key={member.id} member={member} compact />)}
          {hiddenMemberCount > 0 ? <strong>+{hiddenMemberCount}</strong> : null}
        </div>
      </header>

      <section className="ui-cohort-party-zone" aria-labelledby="ui-cohort-party-title">
        <header>
          <div><h3 id="ui-cohort-party-title">{approvedCohort.name.match(/\d+기/)?.[0] || "기수"} 내 파티</h3><p>같은 기수 멤버와 최대 8명까지 함께할 수 있어요.</p></div>
        </header>
        <div className="ui-cohort-party-grid is-single">
          {party ? (
            <article className="ui-cohort-party-card">
              <div><h4>{party.name}</h4><span>{partyMembers.length} / 8</span></div>
              <div className="ui-cohort-party-card__members">{partyMembers.map((member) => <CharacterAvatar key={member.id} member={member} />)}</div>
              <span className="ui-menu-chip">내 파티</span>
              <GameButton variant="secondary">파티 보기</GameButton>
            </article>
          ) : (
            <button className="ui-cohort-party-create" type="button"><span aria-hidden="true">＋</span><strong>새 파티 만들기</strong><small>참여 중인 파티가 없습니다.</small></button>
          )}
        </div>
      </section>
      <section className="ui-cohort-affiliation-note" aria-label="기수 소속 안내">
        <strong>과정 소속 안내</strong>
        <p>과정 중에는 다른 기수로 변경할 수 없습니다. 중도 참여 포기가 필요하면 관리자에게 문의해 주세요.</p>
      </section>
    </section>
  );
}

function PartyHud({ party }) {
  if (!party) return <aside className="ui-party-hud is-empty"><strong>MY PARTY</strong><p>파티가 없습니다.</p></aside>;

  return (
    <aside className="ui-party-hud" aria-label={`내 파티 ${party.name}`}>
      <header><div><span>MY PARTY</span><h3>{party.name}</h3></div><strong>{party.members.length} / 8</strong></header>
      <ul>{party.members.map((member) => <li key={member.id}><CharacterAvatar member={member} /><strong>{member.name}</strong></li>)}</ul>
      <div className="ui-party-hud__slots" aria-label={`${8 - party.members.length}자리 비어 있음`}>
        {Array.from({ length: Math.max(0, 8 - party.members.length) }, (_, index) => <span key={index} aria-hidden="true">●</span>)}
      </div>
    </aside>
  );
}

function MeetingRoomCard({ room, alertEnabled, onToggleAlert }) {
  const occupantCount = room.occupancy?.participants?.length || 0;
  const inactive = room.status === "INACTIVE";
  const available = !inactive && !room.occupancy;
  const statusLabel = inactive ? "운영 중지" : available ? "입장 가능" : "사용 중";

  return (
    <article className="ui-space-room-card" data-room-status={room.status}>
      <div><h4>{room.name}</h4><p>{room.capacity}인실 · 함께 공부할 파티와 입장하세요.</p></div>
      <span className={`ui-menu-chip${available ? " is-available" : ""}`}>{statusLabel}</span>
      <strong>{occupantCount} / {room.capacity}</strong>
      {available ? <GameButton>입장</GameButton> : null}
      {!available && !inactive ? <GameButton variant="secondary" aria-pressed={alertEnabled} onClick={() => onToggleAlert(room.id)}>{alertEnabled ? "공실 알림 취소" : "공실 알림 신청"}</GameButton> : null}
      {inactive ? <GameButton disabled>입장 불가</GameButton> : null}
    </article>
  );
}

function SpacePanel({ party, rooms, upcomingSpaces, telegramConnected, telegramDeepLink }) {
  const [activeTab, setActiveTab] = useState("meeting");
  const [spacePage, setSpacePage] = useState(0);
  const [alertRoomIds, setAlertRoomIds] = useState([]);
  const spaceItems = [
    ...rooms.map((room) => ({ type: "room", ...room })),
    ...upcomingSpaces.map((space) => ({ type: "upcoming", ...space }))
  ];
  const spacePageSize = 2;
  const spacePageCount = Math.max(1, Math.ceil(spaceItems.length / spacePageSize));
  const safeSpacePage = Math.min(spacePage, spacePageCount - 1);
  const visibleSpaceItems = spaceItems.slice(safeSpacePage * spacePageSize, (safeSpacePage + 1) * spacePageSize);
  const toggleRoomAlert = (roomId) => setAlertRoomIds((current) => current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]);

  return (
    <div className="ui-space-layout">
      <nav className="ui-space-tabs" aria-label="공간 종류">
        <button className={activeTab === "meeting" ? "is-active" : ""} type="button" aria-pressed={activeTab === "meeting"} onClick={() => setActiveTab("meeting")}>회의실</button>
        <button className={activeTab === "library" ? "is-active" : ""} type="button" aria-pressed={activeTab === "library"} onClick={() => setActiveTab("library")}>도서관</button>
      </nav>
      {activeTab === "meeting" ? (
        <section className="ui-space-meeting" aria-labelledby="ui-space-meeting-title">
          <header>
            <div><span className="ui-menu-eyebrow">FIRST COME, FIRST SERVED</span><h3 id="ui-space-meeting-title">회의실</h3></div>
            <div className="ui-space-meeting__tools">
              <span className="ui-menu-chip">공실 알림 {alertRoomIds.length}건</span>
              {telegramConnected ? (
                <span className="ui-space-telegram-status">텔레그램 알림 설정됨</span>
              ) : (
                <a className="ui-space-telegram-link" href={telegramDeepLink} target="_blank" rel="noreferrer">텔레그램 알림 설정</a>
              )}
            </div>
          </header>
          <div className="ui-space-meeting__body">
            <PartyHud party={party} />
            <section className="ui-space-list" aria-labelledby="ui-space-list-title">
              <header><h3 id="ui-space-list-title">공간 목록</h3><span>{rooms.length}개</span></header>
              <div className="ui-space-list__grid">
                {visibleSpaceItems.map((space) => space.type === "room" ? (
                  <MeetingRoomCard key={space.id} room={space} alertEnabled={alertRoomIds.includes(space.id)} onToggleAlert={toggleRoomAlert} />
                ) : (
                  <article key={space.id} className="ui-space-upcoming" aria-label={`${space.name} 관리자 추가 예정`}>
                    <div><h4>{space.name}</h4><strong>관리자 준비 중</strong><p>기수 관리자가 공간을 추가하면 이 목록에 표시됩니다.</p></div>
                  </article>
                ))}
              </div>
              <footer className="ui-space-pagination" aria-label="공간 목록 페이지">
                <span>{safeSpacePage + 1} / {spacePageCount}</span>
                <button
                  type="button"
                  disabled={spacePageCount <= 1}
                  onClick={() => setSpacePage((safeSpacePage + 1) % spacePageCount)}
                >다음 공간 →</button>
              </footer>
            </section>
          </div>
        </section>
      ) : (
        <section className="ui-space-library"><span className="ui-menu-eyebrow">SHARED STUDY SPACE</span><h3>도서관</h3><p>여러 기수가 함께 사용하는 조용한 학습 공간입니다.</p><GameButton>도서관 입장</GameButton></section>
      )}
    </div>
  );
}

function PartyPanel({ party, currentUserId }) {
  if (!party) return null;
  const isMaster = party.masterId === currentUserId;

  return (
    <div className="ui-party-page">
      <nav aria-label="현재 위치"><button type="button">기수 · 팀</button><span>›</span><strong>내 파티</strong></nav>
      <section className="ui-party-summary">
        <div><span className="ui-menu-eyebrow">MY STUDY PARTY</span><h3>{party.name}</h3><p>같은 기수 멤버와 함께하는 스터디 파티</p></div>
        <span className="ui-menu-chip">{party.members.length} / 8</span>
        {isMaster ? <button type="button">파티 이름 수정</button> : null}
      </section>
      <div className="ui-party-management">
        <section className="ui-party-members" aria-labelledby="ui-party-members-title"><h3 id="ui-party-members-title">파티원</h3><ul>{party.members.map((member) => <li key={member.id}><CharacterAvatar member={member} /><strong>{member.name}</strong>{member.id === currentUserId ? <span>나</span> : null}{member.id === party.masterId ? <em>마스터</em> : null}</li>)}</ul>{party.members.length < 8 ? <p>초대한 멤버가 여기에 표시됩니다.</p> : null}</section>
        {isMaster ? <form className="ui-party-invite" onSubmit={(event) => event.preventDefault()}><h3>파티원 초대</h3><p>같은 기수 구성원만 초대할 수 있어요.</p><GameField label="이름 또는 이메일" placeholder="이름 또는 이메일 검색" /><GameButton type="submit">초대 보내기</GameButton></form> : <section className="ui-party-member-note"><h3>파티 정보</h3><p>파티원은 회의실 입장 시 참여자 후보에 먼저 표시됩니다.</p></section>}
      </div>
      <footer className="ui-party-danger-zone">
        <p>파티에서 나가도 기수에는 계속 참여합니다.</p>
        <GameButton className="ui-party-danger-action" variant="danger">파티 나가기</GameButton>
        {isMaster ? <GameButton className="ui-party-danger-action" variant="danger">파티 해체</GameButton> : null}
      </footer>
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

const panelByMenu = { progress: ProgressPanel, personal: PersonalPanel, cohort: CohortPanel, space: SpacePanel, party: PartyPanel, community: CommunityPanel, settings: SettingsPanel };

export function HomeMenuPanel({
  menu = "progress",
  approvedCohort = defaultApprovedCohort,
  party = defaultParty,
  rooms = defaultRooms,
  upcomingSpaces = [{ id: "upcoming-space", name: "공간 추가 예정" }],
  telegramConnected = false,
  telegramDeepLink = "https://t.me/omagotchi_bot?start=space-alerts",
  currentUserId = "current-user"
}) {
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
        <div className="ui-menu-panel__body"><Panel approvedCohort={approvedCohort} party={party} rooms={rooms} upcomingSpaces={upcomingSpaces} telegramConnected={telegramConnected} telegramDeepLink={telegramDeepLink} currentUserId={currentUserId} /></div>
      </section>
    </main>
  );
}
