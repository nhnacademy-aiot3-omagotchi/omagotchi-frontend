import React from "react";
import { PanelHeader } from "../../ui/PanelHeader.jsx";

export function BgmPlayer({
  title = "준비 중",
  artist = "Pixabay",
  playing = false,
  shuffle = false,
  repeat = false,
  playlistOpen = false,
  volume = 22,
  progress = 0,
  currentTime = "0:00",
  duration = "0:00",
  credit = "",
  tracks = []
}) {
  return (
    <aside className="bgm-player" id="home-bgm-player" data-bgm-player aria-label="배경 음악">
      <PanelHeader
        icon="/images/app/music.png"
        title="배경 음악"
        description="공부에 어울리는 음악을 재생하세요."
        className="quick-panel-header bgm-panel-header"
        closeButton={(
          <button className="quick-panel-close" type="button" data-home-music-close aria-label="BGM 닫기">×</button>
        )}
      />
      <div className="bgm-player-copy">
        <span>현재 재생</span>
        <strong data-bgm-title>{title}</strong>
        <small data-bgm-artist>{artist}</small>
      </div>
      <div className="bgm-player-actions">
        <button type="button" data-bgm-play aria-label={playing ? "BGM 정지" : "BGM 재생"} title={playing ? "BGM 정지" : "BGM 재생"}>{playing ? "II" : "▶"}</button>
        <button type="button" data-bgm-next aria-label="다음 BGM" title="다음 BGM">⏭</button>
        <button type="button" className={shuffle ? "is-active" : undefined} data-bgm-shuffle aria-pressed={shuffle} aria-label="BGM 셔플" title="BGM 셔플">⇄</button>
        <button type="button" className={repeat ? "is-active" : undefined} data-bgm-repeat aria-pressed={repeat} aria-label="현재 BGM 반복" title="현재 BGM 반복">↻1</button>
        <button type="button" data-bgm-list aria-expanded={playlistOpen} aria-controls="bgm-playlist" aria-label="BGM 플레이리스트" title="BGM 플레이리스트">▤</button>
      </div>
      <label className="bgm-volume">
        <span className="sr-only">BGM 볼륨</span>
        <input type="range" min="0" max="100" defaultValue={volume} data-bgm-volume />
      </label>
      <div className="bgm-progress" aria-label="BGM 재생 진행도">
        <progress value={progress} max="100" data-bgm-progress />
        <span><b data-bgm-current-time>{currentTime}</b> / <b data-bgm-duration>{duration}</b></span>
      </div>
      <p className="bgm-source-note">노래 출처는 도움말에 정리했습니다.</p>
      <p className={`bgm-credit-toast${credit ? " is-visible" : ""}`} data-bgm-credit role="status" aria-live="polite">{credit}</p>
      <section className="bgm-playlist" id="bgm-playlist" data-bgm-panel hidden={!playlistOpen}>
        <header><strong>Playlist</strong></header>
        <ol data-bgm-tracks>
          {tracks.length ? tracks.map((track, index) => (
            <li key={`${track.title}-${index}`}>
              <button type="button" className={track.current ? "is-current" : undefined} data-bgm-track={index} aria-current={track.current || undefined}>
                <span>{track.title}</span><small>{track.artist}</small>
              </button>
            </li>
          )) : <li className="bgm-playlist-empty">BGM 목록을 불러오지 못했습니다.</li>}
        </ol>
      </section>
    </aside>
  );
}
