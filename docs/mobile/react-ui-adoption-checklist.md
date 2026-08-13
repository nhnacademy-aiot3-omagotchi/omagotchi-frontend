# React 게임 UI 도입 실행 체크리스트

- 작성일: 2026-08-13
- 상태: 실행 가이드
- 검토 배경: [게임 UI 프레임워크 도입 검토안](react-ui-library.md)

## 목적

검토안에 나온 도구를 현재 프로젝트에 어떤 순서로 도입할지 정리한다. 한 번에 모든
라이브러리를 설치하지 않고, 기존 Home의 React와 `home.js` 계약을 유지하면서 한 기능씩
검증한다.

## 현재 프로젝트 상태

| 항목 | 현재 상태 | 조치 |
| --- | --- | --- |
| React | 19.2.8 설치됨 | 유지 |
| React DOM | 19.2.8 설치됨 | 유지 |
| Vite | 7.3.6 설치됨 | 유지 |
| React Vite Plugin | 5.2.0 설치됨 | 유지 |
| Storybook | 10.5.7 설치·Home Story 38개 등록 | PC·모바일 시각 QA에 사용 |
| Radix UI | 1.6.7 설치됨 | Dialog·Tabs 시험 적용 전 대기 |
| Motion | 13.1.0 설치됨 | 최소 애니메이션 적용 전 대기 |
| Phaser·XState·Rive | 미설치 | 현재 설치하지 않음 |

현재 개발 환경은 Node.js 24.13.1, npm 11.8.0이다. Vite 7과 Storybook 10을 사용하려면
최소 Node.js 20.19 이상과 npm 10 이상을 팀 개발 환경에서도 맞춘다.

```bash
node --version
npm --version
npm ci
npm run build:home
```

## 팀 공통 설치 방식

팀원마다 Radix UI, Storybook과 Motion 설치 명령을 각각 실행하지 않는다. 각 단계의 최초
도입 담당자 한 명이 패키지를 설치하고 설정을 만든 뒤 다음 파일을 같은 변경으로
커밋한다.

```text
package.json
package-lock.json
.storybook/                  Storybook 도입 단계
src/main/frontend/**/*.stories.jsx
관련 React source와 CSS
```

의존성 변경이 반영된 브랜치를 받은 팀원은 프로젝트 루트에서 다음 명령만 실행한다.

```bash
git pull
node --version
npm --version
npm ci
npm run build:home
```

Storybook이 도입된 이후 UI 작업자는 다음 명령으로 컴포넌트를 확인한다.

```bash
npm run storybook
```

역할별 기준은 다음과 같다.

| 대상 | 해야 할 일 |
| --- | --- |
| 최초 도입 담당자 | 단계에 맞는 설치 명령 실행, 설정 작성, `package.json`과 lockfile 커밋 |
| Frontend 작업 팀원 | Pull 후 `npm ci`, Home build와 Storybook 실행 |
| Backend 전용 작업 팀원 | Frontend를 빌드·수정하지 않으면 npm 설치 생략 가능 |
| CI | `npm ci` 후 Home과 Storybook 정적 build 실행 |

`npm ci`는 커밋된 `package-lock.json`의 정확한 버전을 설치하므로 팀원별 버전 차이를
막는다. 팀원은 패키지를 전역으로 설치하거나, lockfile 오류를 해결하기 위해 임의로
삭제한 뒤 `npm install`을 실행하지 않는다. 오류가 나면 먼저 Node.js와 npm 버전을
확인한다.

2026-08-13 기준 Storybook, Radix UI와 Motion의 개발환경 구성이 완료됐다. Home에서는
버튼, 타이머, 상태 HUD, 캐릭터, 상단 메뉴, 채팅, 액션 도크, 재실 HUD, BGM, 오버레이와
전체 Stage와 공통 스크롤 영역을 컴포넌트로 분리하고 38개 Story를 등록했다. 이 변경의
`package.json`, `package-lock.json`과 `.storybook` 설정이 병합된 뒤부터 팀원은
`npm ci`로 같은 환경을 설치할 수 있다. Radix UI와 Motion은 설치만 완료됐으며 실제 Home
적용은 Storybook 상태 검증 후 별도 변경으로 진행한다.

## 설치 전에 결정할 것

다음 항목은 라이브러리로 대신 결정할 수 없는 제품 기준이다.

- [ ] 핵심 반복 행동을 `입실 → 집중 학습 → 기록 저장 → EXP·캐릭터 성장`으로 확정한다.
- [ ] 공간 화면에 자유 이동·충돌·카메라가 필요한지 결정한다. 확정 전에는 Phaser를 쓰지 않는다.
- [ ] 현재 UI와 비교할 픽셀 UI 참고 화면 3개를 선정한다.
- [ ] Storybook 전용 mock만 허용하고 실제 앱의 성공 상태 fallback에는 mock을 쓰지 않는다.
- [ ] 외부 에셋 선정자와 라이선스 확인 담당자를 정한다.
- [ ] 데스크톱, 모바일 세로, 모바일 가로에서 확인할 최소 QA 화면을 정한다.

권장 QA 뷰포트는 레이아웃을 하드코딩하기 위한 breakpoint가 아니라 검증 표본이다.

```text
데스크톱       1440 × 900
태블릿         1024 × 768
모바일 세로     390 × 844
모바일 가로     844 × 390
최소 폭 확인     320 × 568
```

## 설치 대상

### 1. Radix UI

첫 시험에서는 Dialog와 Tabs만 사용한다. 공식 권장 통합 패키지는 tree-shaking을 지원하므로
필요한 Primitive만 import한다.

```bash
npm install radix-ui
```

```jsx
import { Dialog, Tabs } from "radix-ui";
```

Radix의 기본 외형을 가져오지 않는다. 포커스 이동, 키보드 조작, ARIA 동작만 사용하고
색상·테두리·간격은 기존 오마고치 CSS를 유지한다.

### 2. Storybook

`main.jsx`에서 공통 컴포넌트를 분리한 후 프로젝트 루트에서 설치한다. 설치 명령은
`.storybook`, 예제 Story, npm script와 개발 의존성을 생성하므로 별도 변경으로 검토한다.

```bash
npm create storybook@latest
npm run storybook
```

설치 후 생성된 `.storybook/main.*`에서 다음 두 가지를 확인한다.

```js
const config = {
  stories: [
    "../src/main/frontend/**/*.mdx",
    "../src/main/frontend/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  staticDirs: ["../src/main/resources/static"]
};
```

`staticDirs`가 있어야 Story에서 `/images/...`로 참조하는 현재 캐릭터와 아이콘을 표시할 수
있다. CLI가 만든 framework와 addons 설정은 지우지 않고 위 항목을 병합한다.

현재 Home Story 대상과 상태:

| 컴포넌트 | 필수 Story |
| --- | --- |
| `HomeDockButton` | 기본, 확장, 비활성 |
| `TimerPanel` | 대기, 실행, 점검 |
| `StatusHud` | 신규 캐릭터, 성장 중, 레벨업 임박 |
| `CharacterStage` | 기본, 대화, 날개 장착 |
| `TopMenu` | 기본, 알림 없음, 복수 알림 |
| `ChatDrawer` | 닫힘, 열림, 입력 가능 |
| `ActionDock` | 기본, 채팅 열림, 입실 완료 |
| `PresenceHud` | 닫힘, 열림, 빈 목록 |
| `BgmPlayer` | 준비, 재생, 플레이리스트 열림 |
| `HomeOverlay` | 도움말, 성장 현황, 설정 |
| `HomeStage` | 데스크톱, 모바일 세로·가로, 학습 중 |
| `ScrollPanel` | 짧은 콘텐츠, 긴 세로 목록, 가로 스크롤, 모바일 |

### 3. Motion

Radix Dialog와 Tabs 시험이 완료된 뒤 설치한다. 단순 hover 색상과 눌림 효과는 CSS로
유지하고, 등장·퇴장이나 서버 값 변화처럼 React 상태와 연결되는 효과에만 사용한다.

```bash
npm install motion
```

```jsx
import { motion, useReducedMotion } from "motion/react";
```

첫 적용 범위는 오버레이의 4~8px 등장 효과와 경험치 증가로 제한한다. 모든 효과는
`prefers-reduced-motion` 또는 `useReducedMotion()`에서 제거할 수 있어야 한다.

## 지금 설치하지 않을 것

| 대상 | 이유 | 다시 검토할 조건 |
| --- | --- | --- |
| Phaser | 일반 DOM으로 가능한 공간 요구사항이 아직 많음 | 이동·충돌·맵·카메라 요구 중 3개 이상 확정 |
| XState | 현재 상태 전이가 단순함 | 저장·복구·오류 상태가 여러 기능과 얽힐 때 |
| Rive | 현재 픽셀 아트 방향과 다름 | 벡터 애니메이션 방향으로 변경할 때 |
| React Native | 웹·PWA 검증 전임 | PWA로 충족되지 않는 네이티브 요구가 생길 때 |
| NES.css | 완성 테마를 적용할 계획이 없음 | 설치하지 않고 구현 방식만 참고 |
| Kenney·itch.io·OpenGameArt 에셋 | npm 패키지가 아니며 개별 라이선스 확인 필요 | 실제 사용할 파일을 선정한 뒤 |

## 구현 순서

### 0단계 — 기준 확정

- 위의 제품 결정 체크리스트를 완료한다.
- 기존 Home의 데스크톱·모바일 화면을 기준 이미지로 남긴다.
- `npm ci`와 `npm run build:home`이 통과하는지 확인한다.

### 1단계 — 설치 없이 컴포넌트 분리

현재 `src/main/frontend/home-react/main.jsx`는 렌더링 시작 코드와 약 390줄의 UI가 한 파일에
있다. Storybook 설치 전에 다음처럼 역할만 분리한다.

```text
src/main/frontend/home-react/
├── main.jsx
├── app/
│   └── HomeApp.jsx
├── components/
│   ├── game/
│   │   ├── GameButton.jsx
│   │   ├── GameDialog.jsx
│   │   ├── GamePanel.jsx
│   │   ├── GameTabs.jsx
│   │   └── ProgressBar.jsx
│   ├── character/
│   └── study/
└── stores/
    └── homeOverlayStore.js
```

이 단계에서는 DOM 구조, class, `data-*` 속성, 화면 동작을 바꾸지 않는다. `main.jsx`에는
두 React root를 찾고 렌더링하는 bootstrap 코드만 남긴다.

### 2단계 — 디자인 토큰과 Storybook

- 기존 CSS 값을 조사해 색상, 간격, 테두리, control 높이 토큰을 만든다.
- Storybook을 설치한다.
- `GameButton`, `GamePanel`, `ProgressBar`부터 Story를 작성한다.
- mock 데이터에는 `Mock` 표식을 사용하고 앱 코드로 import하지 않는다.

완료 기준:

- Spring Boot 없이 공통 컴포넌트를 볼 수 있다.
- 5개 QA 뷰포트에서 텍스트 잘림과 가로 스크롤을 확인할 수 있다.
- 기존 Home build 결과와 기능이 유지된다.

### 3단계 — Radix Dialog 한 개 시험

현재 오버레이는 React의 `HomeOverlayHost`와 Vanilla JS의 `home.js`가 함께 관리한다.
다음 계약을 먼저 보존한다.

```text
window.OmagotchiHomeOverlay
[data-home-overlay-root]
[data-close-home-overlay]
.home-overlay-body
data-overlay-tab / data-overlay-panel
```

특히 `home.js`는 `[data-home-overlay-root]` 내부에서 제목, 본문, 학습 기록, 공간 root를
찾고 클릭 이벤트를 위임한다. Radix `Dialog.Portal`이 콘텐츠를 기본값인 `document.body`로
옮기면 이 조회와 이벤트 위임이 깨질 수 있다. Portal container를 기존 overlay root 안에
두거나, 관련 Vanilla JS를 React로 옮긴 뒤 Portal을 적용한다.

첫 시험은 콘텐츠가 단순한 도움말 오버레이 하나로 제한한다. 커뮤니티, 학습 기록, 공간은
기존 JavaScript가 DOM을 직접 변경하므로 첫 대상에서 제외한다.

완료 기준:

- 메뉴 클릭으로 열리고 닫기 버튼·배경·Esc로 닫힌다.
- 열린 뒤 포커스가 Dialog 안으로 이동하고 닫힌 뒤 trigger로 돌아간다.
- Tab과 Shift+Tab 포커스가 Dialog 밖으로 빠져나가지 않는다.
- 모바일에서 배경 스크롤이 잠기고 Dialog 내부만 스크롤된다.
- 기존 `home.js` 기능과 `data-*` 계약이 유지된다.

### 4단계 — Radix Tabs 한 개 시험

진행 오버레이의 퀘스트·업적·랭킹 전환 한 곳에만 적용한다. 기존
`data-overlay-tab`, `data-overlay-panel`을 바로 삭제하지 않고 `home.js` 사용 여부를 먼저
제거하거나 어댑터로 유지한다.

완료 기준:

- 방향키로 탭을 이동할 수 있다.
- 선택 탭과 표시 패널이 항상 일치한다.
- 새로고침과 오버레이 재진입 시 기본 탭이 명확하다.

### 5단계 — Motion 최소 적용

- Dialog 등장·퇴장과 경험치 변화에만 적용한다.
- 버튼의 1~2px 눌림은 우선 CSS로 구현한다.
- 저사양 모바일에서 긴 작업과 layout shift가 없는지 확인한다.
- reduced motion 환경에서는 즉시 전환한다.

## 외부 에셋을 사용할 때

에셋은 실제 사용 파일만 아래 구조에 추가한다.

```text
src/main/resources/static/assets/
├── omagotchi/
└── vendor/
    └── 에셋-이름/
        ├── images/
        ├── LICENSE.txt
        └── SOURCE.md
```

`docs/ASSET_LICENSES.md`에는 에셋 이름, 제작자, 원본 주소, 다운로드 날짜, 라이선스,
출처 표시 여부, 수정 여부와 사용 화면을 기록한다. 후보만 검토하는 동안에는 에셋 파일과
라이선스 문서를 미리 만들 필요가 없다.

## 작업별 검증 명령

```bash
npm run build:home
./mvnw test
```

Storybook 설치 이후에는 다음 명령도 추가한다.

```bash
npm run storybook
npm run build-storybook
```

`src/main/resources/static/js/home-react/home-app.js`는 Vite 산출물이므로 React source 변경
후 다시 빌드한다. 기능 변경 시에는 Home에서 타이머, 오버레이, BGM, 출석, 재실, 채팅의
기존 동작도 수동 확인한다.

## 첫 작업 범위

첫 번째 변경은 아래까지만 포함한다.

- [x] `main.jsx`에서 공통 UI 컴포넌트 분리
- [ ] 디자인 토큰 정리
- [x] Storybook 설치와 정적 리소스·실제 Home CSS 연결
- [x] Home 공통 컴포넌트 12종, 상태 Story 38개 작성
- [x] `npm run build:home`, `npm run build-storybook` 통과
- [ ] `./mvnw test`와 실제 Spring Home 기능 회귀 확인

Radix와 Motion 적용은 이 변경을 검증한 다음 별도 작업으로 진행한다.

## 공식 문서

- [Radix Primitives 설치](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Motion for React 설치](https://motion.dev/docs/react-installation)
- [Storybook 설치](https://storybook.js.org/docs/get-started/install)
- [Storybook React·Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/)
- [Vite 7 시작하기](https://v7.vite.dev/guide/)
