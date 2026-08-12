import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const menuItems = [
  { href: "/help", overlay: "help", label: "도움말", icon: "/images/app/help.png" },
  { href: "/progress#quests", overlay: "progress", label: "진행", icon: "/images/app/quest.png", alert: true },
  { href: "/personal", overlay: "personal", label: "내 정보", icon: "/images/app/userList.png" },
  { href: "/cohort", overlay: "cohort", label: "기수", icon: "/images/app/cohort.png" },
  { href: "/write", overlay: "write", label: "학습 기록", icon: "/images/app/studyrecord.png" },
  { href: "/space#lab", overlay: "space", label: "공간", icon: "/images/app/door.png" },
  { href: "/home#community", overlay: "community", label: "커뮤", icon: "/images/app/commu.png" },
  { href: "/settings", overlay: "settings", label: "설정", icon: "/images/app/set.png" }
];

function TopMenu() {
  return (
    <>
      <h1 id="home-title">Omagotchi</h1>
      <nav className="home-menu" aria-label="주요 메뉴">
        {menuItems.map((item) => (
          <a
            key={item.overlay}
            className={item.alert ? "has-menu-alert" : undefined}
            href={item.href}
            aria-label={item.label}
            data-home-overlay={item.overlay}
          >
            <span>
              <img src={item.icon} alt="" width="32" />
            </span>
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}

function BgmPlayer() {
  return (
    <aside className="bgm-player" id="home-bgm-player" data-bgm-player aria-label="배경 음악">
      <div className="bgm-player-copy">
        <span>BGM</span>
        <strong data-bgm-title>준비 중</strong>
        <small data-bgm-artist>Pixabay</small>
      </div>
      <div className="bgm-player-actions">
        <button type="button" data-bgm-play aria-label="BGM 재생" title="BGM 재생">▶</button>
        <button type="button" data-bgm-next aria-label="다음 BGM" title="다음 BGM">⏭</button>
        <button type="button" data-bgm-shuffle aria-pressed="false" aria-label="BGM 셔플" title="BGM 셔플">⇄</button>
        <button type="button" data-bgm-repeat aria-pressed="false" aria-label="현재 BGM 반복" title="현재 BGM 반복">↻1</button>
        <button type="button" data-bgm-list aria-expanded="false" aria-controls="bgm-playlist" aria-label="BGM 플레이리스트" title="BGM 플레이리스트">▤</button>
      </div>
      <label className="bgm-volume">
        <span className="sr-only">BGM 볼륨</span>
        <input type="range" min="0" max="100" defaultValue="22" data-bgm-volume />
      </label>
      <div className="bgm-progress" aria-label="BGM 재생 진행도">
        <progress value="0" max="100" data-bgm-progress />
        <span><b data-bgm-current-time>0:00</b> / <b data-bgm-duration>0:00</b></span>
      </div>
      <p className="bgm-source-note">노래 출처는 도움말에 정리했습니다.</p>
      <p className="bgm-credit-toast" data-bgm-credit role="status" aria-live="polite"></p>
      <section className="bgm-playlist" id="bgm-playlist" data-bgm-panel hidden>
        <header>
          <strong>Playlist</strong>
        </header>
        <ol data-bgm-tracks></ol>
      </section>
    </aside>
  );
}

function PresenceHud() {
  return (
    <aside className="presence-hud" data-presence-hud>
      <button
        className="presence-trigger"
        type="button"
        data-presence-trigger
        aria-expanded="false"
        aria-controls="presence-panel"
        aria-label="재실 인원 보기"
        title="재실 인원 보기"
      >
        <span className="presence-trigger-copy">
          <strong>실습실 재실 인원</strong>
          <span><b data-presence-count>0</b><b className="sr-only" data-presence-capacity>50</b></span>
        </span>
        <kbd aria-hidden="true">U</kbd>
      </button>

      <section
        className="presence-panel"
        id="presence-panel"
        data-presence-panel
        aria-labelledby="presence-panel-title"
        hidden
      >
        <header>
          <div>
            <span>MY COHORT LAB</span>
            <h2 id="presence-panel-title">AIoT 3기 실습실</h2>
          </div>
          <button className="presence-refresh" type="button" data-presence-refresh aria-label="재실 인원 새로고침" title="재실 인원 새로고침">↻</button>
        </header>

        <label className="presence-search">
          <span className="sr-only">이름 또는 이메일 검색</span>
          <input type="search" data-presence-search placeholder="이름 또는 이메일 검색" autoComplete="off" />
        </label>

        <div className="presence-list" data-presence-list></div>

        <footer>
          <span data-presence-updated>아직 갱신하지 않음</span>
          <span><kbd>Esc</kbd> 닫기</span>
        </footer>
      </section>
    </aside>
  );
}

function TimerPanel() {
  return (
    <section className="timer-panel" aria-label="학습 타이머">
      <time className="timer-display" dateTime="PT0S" data-timer-display>00:00:00</time>
      <div className="timer-actions">
        <button type="button" data-timer-toggle>시작</button>
      </div>
      <p className="timer-policy" data-timer-status aria-live="polite"></p>
    </section>
  );
}

function ActionDock() {
  return (
    <div className="home-action-dock" aria-label="홈 빠른 실행">
      <button className="attendance-button" type="button" data-attendance-button title="퇴실하기" aria-label="퇴실하기" hidden>
        퇴실하기
      </button>
      <button
        className="home-dock-button home-music-toggle"
        type="button"
        data-home-music-toggle
        aria-expanded="false"
        aria-controls="home-bgm-player"
        aria-label="BGM 열기"
        title="BGM 열기"
      >
        <img src="/images/app/music.png" alt="" aria-hidden="true" />
      </button>
      <button
        className="home-dock-button home-attendance-toggle"
        type="button"
        data-attendance-panel-toggle
        aria-expanded="false"
        aria-controls="attendance-detail"
        aria-label="출석부 열기"
        title="출석부 열기"
      >
        <img src="/images/app/calendar.png" alt="" aria-hidden="true" />
      </button>
      <PresenceHud />
    </div>
  );
}

function CharacterStage() {
  return (
    <section className="companion-panel" aria-label="캐릭터 상태">
      <div className="character-badge" data-presence="online">
        <span data-character-name>오마고치</span>
        <strong data-character-level>1</strong>
      </div>
      <div className="home-character-stage" data-character-stage>
        <img className="home-character-wing" data-character-wing alt="" aria-hidden="true" hidden />
        <p className="character-speech-bubble" data-character-bubble aria-live="polite" hidden>
          오늘도 같이 공부해요!
        </p>
        <button className="home-character-button" type="button" data-character-interaction aria-label="오마고치와 놀아주기">
          <img
            className="home-character"
            data-home-character
            src="/images/characters/default/omagotchi.png"
            alt="오마고치 캐릭터"
          />
        </button>
      </div>
      <div className="xp-area" aria-label="경험치">
        <div className="xp-bar">
          <span data-xp-fill style={{ width: "0%" }}></span>
        </div>
        <div className="xp-labels">
          <span data-current-xp>0xp</span>
          <span data-next-level>다음 레벨까지 50xp</span>
        </div>
      </div>
      <section className="home-chat-bar" aria-label="실시간 채팅">
        <div className="home-chat-tabs" role="tablist" aria-label="채팅방">
          <button type="button" className="is-active" role="tab" aria-selected="true">
            <span className="home-chat-tab-icon home-chat-tab-icon-global" aria-hidden="true"></span>
            GLOBAL
          </button>
          <button type="button" role="tab" aria-selected="false">
            COHORT
          </button>
        </div>
        <label className="home-chat-input">
          <span className="sr-only">채팅 메시지</span>
          <input type="text" placeholder="메시지 입력" disabled />
        </label>
      </section>
    </section>
  );
}

function HomeApp() {
  return (
    <>
      <TopMenu />
      <BgmPlayer />
      <TimerPanel />
      <ActionDock />
      <CharacterStage />
    </>
  );
}

const rootElement = document.getElementById("home-react-root");

if (rootElement) {
  flushSync(() => {
    createRoot(rootElement).render(<HomeApp />);
  });
}
