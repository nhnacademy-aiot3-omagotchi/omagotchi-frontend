# Home 하단 HUD 반응형 리팩토링 기록

- 상태: 작업 기록

## 목적

Home 하단의 닉네임, 레벨, XP, 채팅 입력, 빠른 실행 도크가 화면 폭과 높이에 따라 서로 겹치지 않도록 하단 HUD 구조를 재정리한다.

이번 작업은 모바일 전용 페이지를 새로 만드는 작업이 아니라, 기존 `/home` React island 안에서 하단 정보 영역의 기준점을 하나로 묶는 작업이다.

## 문제

기존 하단 영역은 요소별 위치 기준이 달랐다.

- 닉네임과 레벨은 `character-badge` 기준
- XP bar와 XP text는 `xp-area` 기준
- 채팅 입력은 `home-chat-bar` 기준
- BGM, 출석부, 재실 인원, 퇴실 버튼은 각 버튼의 fixed 위치 기준

이 때문에 화면 폭을 줄이면 닉네임, 레벨, XP, 채팅 입력, 도크 버튼이 서로 독립적으로 움직이며 정렬이 흐트러졌다.

## 목표 배치

좁은 폭에서는 하단 HUD를 다음 관계로 본다.

```text
[닉네임 / Lv.1]
[XP bar]
[0 / 50]

          [메시지 입력]

                         [출석] [기록] [BGM] [퇴실]
```

핵심은 닉네임, 레벨, XP를 하나의 `status cluster`로 묶고, 채팅 입력과 빠른 실행 도크를 같은 하단 HUD 문맥 안에서 배치하는 것이다.

## 구현 방향

- `CharacterStage` 안에 `home-bottom-hud`를 추가했다.
- 닉네임, 레벨, XP를 `home-status-cluster`로 묶었다.
- `home-chat-bar`는 하단 HUD 안에 유지하되, 좁은 폭에서는 작은 입력 바처럼 보이게 했다.
- `home-action-dock`도 하단 HUD 안으로 이동시켰다.
- 기존 `data-*` 계약은 유지했다.
- 퇴실 버튼은 기존 출석 상태 로직에 따라 입실 전 hidden 상태를 유지한다.

## 지킨 계약

- `data-character-name`
- `data-character-level`
- `data-xp-fill`
- `data-current-xp`
- `data-next-level`
- `data-attendance-button`
- `data-home-music-toggle`
- `data-attendance-panel-toggle`
- `data-presence-*`

## 검증 기준

다음 화면에서 하단 HUD를 확인한다.

- 320 x 568
- 360 x 780
- 375 x 812
- 390 x 844
- 412 x 892
- 568 x 320
- 780 x 360
- 844 x 390
- 1280 x 720
- 1440 x 900

확인 항목:

- 닉네임과 레벨이 같은 줄에서 뒤섞이지 않는가
- XP bar와 `0 / 50` 텍스트가 같은 기준으로 보이는가
- 메시지 입력이 과한 카드처럼 보이지 않는가
- 도크 버튼이 하단 safe area 안에서 유지되는가
- 퇴실 버튼이 표시될 때 도크 버튼 간격이 깨지지 않는가
- 모바일 가로 또는 낮은 높이 화면에서 HUD가 캐릭터와 겹치지 않는가

## 다음 작업

- 실제 Figma 시안에 맞춰 하단 HUD 세부 간격을 조정한다.
- Playwright 또는 브라우저 DevTools로 viewport별 스크린샷 검증을 수행한다.
- 하단 HUD가 안정화되면 오버레이 UI shell 리팩토링으로 넘어간다.
