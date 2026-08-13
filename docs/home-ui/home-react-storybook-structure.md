# Home React·Storybook 구조 가이드

- 작성일: 2026-08-13
- 상태: 현재 구현·개발 가이드
- 대상: Home React Island와 Storybook을 수정하는 Frontend 팀원

## 목적

Home React 소스, Story, CSS, 기존 JavaScript와 빌드 산출물의 위치와 책임을 고정한다.
신규 UI를 추가할 때 파일이 여러 디렉터리에 흩어지거나 Storybook mock이 실제 Home에
섞이지 않도록 이 문서를 기준으로 작업한다.

## 기준 디렉터리

```text
view/
├── .storybook/
│   ├── main.js                         Story 검색 경로·정적 리소스·Addon 설정
│   └── preview.jsx                     실제 Home 공통 CSS 로드 순서
├── docs/
│   ├── home-ui/
│   │   ├── README.md                    Home UI 문서 인덱스
│   │   ├── home-react-storybook-structure.md  이 구조 가이드
│   │   └── react-ui-adoption-checklist.md
│   └── adr/0003-react-game-ui-tools-incremental-adoption.md
├── src/main/frontend/home-react/
│   ├── main.jsx                        React mount·Home overlay store
│   └── components/
│       ├── ComponentName.jsx           실제 Home에서 사용하는 UI
│       └── ComponentName.stories.jsx   같은 UI의 Storybook 상태
├── src/main/resources/
│   ├── templates/pages/app/home.html   Home 진입점·script 로드 순서
│   └── static/
│       ├── css/home/                   Home UI·반응형·패널 CSS
│       ├── images/                     Storybook도 함께 사용하는 정적 에셋
│       └── js/
│           ├── home.js                 기존 Home 기능 조립
│           ├── home/                   BGM·출석 등 기능 Controller
│           └── home-react/home-app.js  Vite 생성물, 직접 수정 금지
├── package.json                        npm·Storybook 실행 명령
└── vite.config.js                      React entry와 산출물 경로
```

`node_modules/`와 `storybook-static/`은 로컬 설치·빌드 결과이므로 Git에 추가하지 않는다.

## 파일별 책임

| 위치 | 책임 | 직접 수정 |
| --- | --- | --- |
| `src/main/frontend/home-react/components/*.jsx` | UI DOM, props, 접근성 속성 | 가능 |
| 같은 폴더의 `*.stories.jsx` | 상태별 예제와 Storybook 전용 데이터 | 가능 |
| `src/main/frontend/home-react/main.jsx` | React root mount, 전역 overlay store | 필요한 경우만 |
| `src/main/resources/static/css/home/*.css` | 실제 Home과 Storybook이 공유하는 외형·반응형 | 가능 |
| `src/main/resources/static/js/home.js` | 기존 기능 Controller 연결 | 계약 확인 후 가능 |
| `src/main/resources/static/js/home/*.js` | 타이머·BGM·출석 등 실제 동작 | 계약 확인 후 가능 |
| `src/main/resources/static/js/home-react/home-app.js` | `npm run build:home` 생성물 | 금지 |
| `.storybook/main.js` | Story 탐색, Addon, 정적 파일 경로 | 설정 변경 시 |
| `.storybook/preview.jsx` | 실제 Home CSS 연결 | CSS 추가·순서 변경 시 |

## 렌더링과 기능 연결

```text
home.html
  └─ #home-react-root
       └─ home-app.js
            └─ main.jsx
                 └─ HomeStage와 하위 React 컴포넌트
                      └─ data-* DOM 계약
                           └─ home.js와 home/* Controller
```

React는 UI 구조를 렌더링하고 기존 JavaScript는 `data-*` 속성을 통해 기능을 연결한다.
따라서 `data-timer-*`, `data-bgm-*`, `data-attendance-*`, `data-presence-*` 같은 속성은
Controller를 함께 확인하지 않고 삭제하거나 이름을 바꾸지 않는다.

React 번들은 `home.js`보다 먼저 로드되어야 한다. 그래야 기존 JavaScript의 초기
`querySelector`가 React가 만든 DOM을 찾을 수 있다.

## 컴포넌트와 Story 배치 규칙

컴포넌트와 Story는 반드시 같은 디렉터리에 같은 이름으로 둔다.

```text
components/TimerPanel.jsx
components/TimerPanel.stories.jsx
```

새 Story를 별도 `src/stories/`에 만들지 않는다. 현재 `.storybook/main.js`는
`src/main/frontend/**/*.stories.*`를 탐색한다.

2026-08-13 기준 Home 공통 컴포넌트는 12종이고 Story는 38개다.

| 컴포넌트 | 역할 |
| --- | --- |
| `HomeDockButton` | 공통 빠른 실행 버튼 |
| `TimerPanel` | 학습 타이머 표시와 동작 버튼 |
| `StatusHud` | 캐릭터 레벨·경험치 |
| `CharacterStage` | 캐릭터·날개·말풍선 |
| `TopMenu` | Home 상단 메뉴 |
| `ChatDrawer` | 채팅 입력 패널 |
| `ActionDock` | 채팅·출석·BGM·퇴실·재실 버튼 조립 |
| `PresenceHud` | 재실 인원 버튼과 목록 패널 |
| `BgmPlayer` | BGM 컨트롤과 플레이리스트 |
| `HomeOverlay` | 도움말·진행·설정 등 공통 overlay shell |
| `HomeStage` | Home 전체 UI 조합 |
| `ScrollPanel` | 세로·가로 공통 스크롤 영역 |

## Storybook 데이터 규칙

Story의 이름, 시간, 경험치, 재실 사용자와 학습 기록은 시각·동작 검증용 데이터다.

- Story 전용 데이터는 `*.stories.jsx` 안에 둔다.
- Story mock을 실제 컴포넌트, `main.jsx`, `home.js`에서 import하지 않는다.
- Backend 명세에 없는 데이터를 실제 성공 fallback으로 사용하지 않는다.
- 실제 API가 연결되면 API 응답을 컴포넌트 props로 변환하고 Story 데이터는 유지한다.

## CSS 배치와 로드 순서

Storybook은 `.storybook/preview.jsx`에서 아래 순서로 실제 Home CSS를 읽는다.

```text
gameFont.css
home.css
home/home-ui.css
home/react-stage.css
home/home-responsive.css
home/home-overlay-theme.css
home/home-quick-panels.css
```

CSS 책임은 다음처럼 나눈다.

- `react-stage.css`: React Home stage와 공통 컴포넌트 기본 구조
- `home-responsive.css`: 화면 폭·높이·비율에 따른 최종 배치
- `home-overlay-theme.css`: overlay별 외형과 크기
- `home-quick-panels.css`: BGM·출석·재실·Action Dock 외형

Story에서만 모양을 맞추기 위해 제품 CSS와 다른 대규모 inline style을 만들지 않는다.
Story decorator의 inline style은 배경, 캔버스 최소 높이와 정렬 같은 검증 환경에만 쓴다.

## 신규 UI 추가 순서

1. `components/Name.jsx`에 실제 UI를 작성한다.
2. 기존 Controller가 찾는 `data-*` 계약을 확인하고 보존한다.
3. 같은 위치에 `components/Name.stories.jsx`를 만든다.
4. 기본, 빈 값, 긴 값, 비활성, 좁은 화면 중 의미 있는 상태만 Story로 작성한다.
5. 제품 CSS를 담당 CSS 파일에 추가한다.
6. 전체 Home에 필요한 UI만 `HomeStage.jsx`에서 조립한다.
7. React 소스를 변경했다면 Home bundle을 다시 생성한다.
8. Storybook 빌드와 실제 Spring Home 기능을 함께 확인한다.

```bash
npm run build:home
npm run storybook
npm run build-storybook
./mvnw test
```

## 팀원이 변경을 받은 뒤 할 일

의존성은 `package.json`과 `package-lock.json`에 이미 고정되어 있다. 팀원은 개별 Storybook,
Radix UI 또는 Motion 설치 명령을 실행하지 않는다.

```bash
git pull
npm ci
npm run build:home
npm run storybook
```

Backend만 수정하고 Frontend를 실행하지 않는 팀원은 npm 설치를 생략할 수 있다.

## 현재 적용 상태와 다음 단계

- Storybook, Radix UI와 Motion 패키지 설치 완료
- Home 공통 컴포넌트 12종과 Story 38개 작성 완료
- Storybook preview에 실제 Home의 반응형·overlay·quick panel CSS 로드 순서 반영
- `ActionDock`의 재실·출석·BGM·퇴실·채팅 버튼을 같은 아이콘·라벨 DOM 구조로 통일
- 출석 Controller가 `data-attendance-label`을 보존하면서 `퇴실`·`완료` 상태를 갱신
- `ScrollPanel`에 세로·가로·모바일 Story와 Firefox·WebKit 스크롤 스타일 적용
- Home·Storybook production build 통과
- Radix UI와 Motion은 실제 Home에 아직 적용하지 않음
- 다음 검증은 실제 Spring `/home`의 타이머, BGM, 출석, 재실, 채팅과 overlay 회귀 확인

구조적 도입 결정은
[ADR 0003](../adr/0003-react-game-ui-tools-incremental-adoption.md), 실행 순서는
[React 게임 UI 도입 실행 체크리스트](react-ui-adoption-checklist.md)를 함께 확인한다.
