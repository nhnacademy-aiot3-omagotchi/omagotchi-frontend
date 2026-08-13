# [ADR] React 게임 UI 도구의 단계적 도입

## 1. 상태 (Status)

- [ ] 제안됨 (Proposed)
- [x] 수용됨 (Accepted)
- [ ] 거절됨 (Rejected)
- [ ] 폐기됨/대체됨 (Deprecated/Superseded)

## 2. 배경 및 맥락 (Context)

Home 화면은 React Island로 UI DOM을 렌더링하고, 기존 `home.js`가 `data-*` 계약을 통해
타이머, 캐릭터, 경험치, 출석, BGM, 재실 인원과 오버레이 기능을 연결하는 구조다.

화면을 게임형 학습 UI로 발전시키려면 다음 요구가 있다.

- 반복해서 사용하는 버튼, 패널, Dialog, Tabs와 Progress Bar의 형태와 상태를 통일한다.
- 실제 Spring Boot 애플리케이션을 실행하지 않고도 공통 UI의 다양한 상태를 검증한다.
- Dialog의 포커스 이동, Esc 닫기와 Tabs의 키보드 이동 같은 접근성 동작을 보장한다.
- 경험치 증가, 보상과 오버레이 전환에 짧고 일관된 피드백을 제공한다.
- 기존 픽셀 아트와 Custom CSS를 유지하고 외부 UI 테마에 종속되지 않는다.

React, React DOM과 Vite는 이미 도입되어 있지만, 공통 컴포넌트 개발 환경과 접근 가능한
UI Primitive, React 상태 기반 애니메이션 도구는 아직 없다. 한편 현재 React source는
`main.jsx` 한 파일에 렌더링 시작 코드와 UI 컴포넌트가 함께 있어 별도 환경에서
컴포넌트를 가져와 검증하기 어렵다.

도구를 한꺼번에 추가하면 기존 Vanilla JavaScript와 React의 책임 경계를 동시에 바꾸게
되어 회귀 원인을 찾기 어렵다. 따라서 도입 대상과 순서를 명확히 결정할 필요가 있다.

## 3. 고려한 대안 (Alternatives)

### React와 Custom CSS만 유지

추가 라이브러리 없이 모든 컴포넌트 동작, 접근성과 애니메이션을 직접 구현한다.

의존성이 늘지 않는 장점이 있지만 Dialog 포커스 관리, 키보드 Tabs와 컴포넌트별 상태
검증 환경을 직접 구현하고 계속 유지해야 한다.

### 모든 후보 도구를 한 번에 도입

Storybook, Radix UI, Motion, Phaser와 상태 관리 도구를 동시에 설치하고 전체 Home UI를
새 구조로 전환한다.

목표 구조에 빠르게 접근할 수 있지만 변경 범위가 너무 크며, 어떤 도구가 실제로 필요한지
검증하기 전에 의존성과 구조가 고정된다.

### 완성형 게임 UI 프레임워크 또는 테마 도입

NES.css 같은 완성형 테마나 외부 게임 UI 패키지를 화면 전체에 적용한다.

초기 제작 속도는 빠를 수 있지만 기존 오마고치 디자인이 외부 테마에 종속되고, 사용하지
않는 전역 스타일과 컴포넌트까지 프로젝트에 들어올 수 있다.

### 필요한 도구만 단계적으로 도입

공통 컴포넌트를 먼저 분리한 뒤 Storybook, Radix UI, Motion 순서로 각각의 필요성과
효과를 검증한다. 다음 단계는 이전 단계의 완료 기준을 통과한 경우에만 진행한다.

## 4. 결정 사항 및 사유 (Decision & Rationale)

**React 게임 UI 도구를 Storybook → Radix UI → Motion 순서로 단계적으로 도입한다.**

### 1단계 — 공통 컴포넌트 분리와 Storybook 도입

먼저 `main.jsx`에서 렌더링 bootstrap과 공통 UI 컴포넌트를 분리한다. 이후 Storybook을
개발 의존성으로 설치하고 다음 컴포넌트의 독립적인 상태를 문서화한다.

- `GameButton`
- `GamePanel`
- `GameDialog`
- `GameTabs`
- `ProgressBar`

각 컴포넌트는 기본, hover, focus, disabled, loading, 긴 텍스트와 좁은 화면 상태를
검증한다. Storybook의 mock은 Story 내부에서만 사용하고 실제 애플리케이션의 fallback
데이터로 사용하지 않는다.

### 2단계 — Radix UI 시험 도입

Radix UI는 Dialog와 Tabs의 동작 및 접근성 Primitive로 사용한다. Radix의 기본 디자인이나
별도 테마는 사용하지 않고 기존 오마고치 CSS를 적용한다.

첫 Dialog 시험은 기존 JavaScript의 DOM 직접 변경이 적은 도움말 오버레이로 제한한다.
커뮤니티, 학습 기록과 공간 오버레이는 기존 `home.js`와의 경계가 정리되기 전까지 전환하지
않는다.

현재 `home.js`는 `[data-home-overlay-root]` 내부에서 콘텐츠를 조회하고 클릭 이벤트를
위임한다. 따라서 Radix `Dialog.Portal`을 사용할 때 콘텐츠가 기존 root 밖으로 이동해
`data-*` 계약을 깨지 않도록 Portal container 또는 JavaScript 경계를 함께 검토한다.

### 3단계 — Motion 최소 도입

Dialog와 Tabs 시험이 완료된 뒤 Motion을 도입한다. 오버레이의 짧은 등장·퇴장과 서버에서
받은 경험치 값의 변화처럼 React 상태와 직접 연결되는 효과에만 사용한다.

버튼 눌림, 색상 변경과 같은 단순 효과는 CSS로 유지한다. 모든 Motion 효과는
`prefers-reduced-motion`과 `useReducedMotion()`을 존중하며, 애니메이션이 없어도 기능이
동일하게 동작해야 한다.

### 설치 범위

```bash
# Storybook: 공통 컴포넌트 분리 후 설치
npm create storybook@latest

# Radix UI: Dialog·Tabs 시험 작업에서 설치
npm install radix-ui

# Motion: Radix 시험 완료 후 설치
npm install motion
```

Storybook은 개발·문서화 도구로만 사용한다. Radix UI와 Motion은 실제로 사용하는
컴포넌트만 production bundle에 포함한다.

각 단계의 최초 도입 담당자가 설치 명령을 한 번 실행하고 변경된 `package.json`,
`package-lock.json`과 관련 설정을 커밋한다. 다른 팀원과 CI는 개별 패키지 설치 명령 대신
`npm ci`로 lockfile에 기록된 동일 버전을 설치한다. 패키지를 전역으로 설치하지 않는다.

Phaser, XState, Rive, React Native와 NES.css는 이번 결정의 설치 범위에서 제외한다.
Kenney, itch.io와 OpenGameArt 에셋은 npm 의존성이 아니며 실제 사용할 파일과 라이선스가
확정된 경우에만 별도로 추가한다.

이 방식을 선택한 이유는 다음과 같다.

- 컴포넌트 분리와 시각 검증 환경을 먼저 마련해 이후 도구의 효과를 비교할 수 있다.
- 접근성 동작을 검증된 Primitive에 맡기면서 오마고치의 시각 디자인은 유지할 수 있다.
- 애니메이션을 UI 구조가 안정된 이후에 추가해 기능과 연출 문제를 분리할 수 있다.
- 각 단계에서 기존 Home 동작과 bundle 크기, 모바일 성능을 확인하고 중단할 수 있다.
- 현재 React Island와 Vanilla JavaScript의 점진적 이전 방향을 유지할 수 있다.

## 5. 결과 및 영향 (Consequences)

### 장점 (Positive)

- 공통 UI를 실제 화면과 분리해 여러 상태와 뷰포트에서 확인할 수 있다.
- Dialog와 Tabs의 포커스 및 키보드 동작을 직접 구현하는 부담이 줄어든다.
- 공통 컴포넌트의 시각 규칙과 사용법이 Story로 문서화된다.
- 애니메이션 범위를 제한해 학습 흐름과 모바일 성능에 미치는 영향을 줄인다.
- 도구별 효과가 없거나 기존 코드가 복잡해지면 다음 단계 도입을 중단할 수 있다.

### 단점 (Negative)

- npm 의존성, Storybook 설정과 관련 유지보수 작업이 추가된다.
- 공통 컴포넌트를 분리하는 선행 작업이 필요하다.
- Storybook과 실제 Spring Boot 화면의 정적 리소스 경로와 CSS를 함께 관리해야 한다.
- Radix Portal과 기존 `home.js`의 이벤트 위임 범위가 충돌할 수 있다.
- React와 Vanilla JavaScript가 공존하는 동안 상태와 DOM 소유권을 계속 구분해야 한다.
- Motion을 잘못 사용하면 bundle 크기와 저사양 모바일 렌더링 비용이 증가할 수 있다.

## 6. 규정 준수 (Compliance)

- 기존 Spring MVC, Thymeleaf, 인증, 인가, JWT와 Session 흐름은 변경하지 않는다.
- 기존 `home.js`가 사용하는 `data-*` 속성과 DOM 연결을 검증 없이 제거하지 않는다.
- Storybook mock을 실제 애플리케이션 코드에서 import하지 않는다.
- Backend 명세에 없는 성공 데이터, 랭킹, 보상과 사용자 상태를 만들지 않는다.
- Radix UI에는 기존 오마고치 CSS를 적용하고 외부 기본 테마를 도입하지 않는다.
- Motion은 기능을 대신하지 않으며 애니메이션 없이도 동일한 작업을 완료할 수 있어야 한다.
- `prefers-reduced-motion`을 준수한다.
- 특정 기기 모델이 아니라 가용 폭, 높이와 화면 비율을 기준으로 검증한다.
- 외부 에셋은 라이선스, 출처, 수정 여부와 사용 화면을 기록한 뒤 추가한다.
- 의존성 변경 시 `package.json`과 `package-lock.json`을 같은 변경으로 커밋한다.
- 팀원과 CI는 커밋된 lockfile을 기준으로 `npm ci`를 실행한다.
- 패키지를 전역으로 설치하거나 팀원별로 서로 다른 버전을 선택하지 않는다.
- 각 단계에서 `npm run build:home`과 `./mvnw test`를 통과해야 한다.
- Storybook 도입 후에는 `npm run build-storybook`도 통과해야 한다.

## 7. 참고 사항 (Notes)

- 2026-08-13: Storybook 10.5.7, Radix UI 1.6.7, Motion 13.1.0 개발환경 설치 완료
- 구조 문서: [Home React·Storybook 구조 가이드](../home-ui/home-react-storybook-structure.md)
- 실행 문서: [React 게임 UI 도입 실행 체크리스트](../home-ui/react-ui-adoption-checklist.md)
- 검토 문서: [게임 UI 프레임워크 도입 검토안](../home-ui/react-ui-library.md)
- 관련 ADR: `0002-home-ui-react-island-fluid-stage.md`
- 관련 React 소스: `src/main/frontend/home-react/main.jsx`
- 관련 기존 JavaScript: `src/main/resources/static/js/home.js`
- 관련 CSS: `src/main/resources/static/css/home/react-stage.css`
- 관련 Vite 설정: `vite.config.js`

### 팀 적용 방법

최초 도입 담당자인 문재민이 단계에 맞춰 패키지를 설치하고 설정한다.

```bash
# 공통 컴포넌트 분리 후
npm create storybook@latest

# Storybook 검증 후
npm install radix-ui

# Radix UI 검증 후
npm install motion
```

설치 후 변경된 `package.json`, `package-lock.json`, `.storybook` 설정과 관련 source를
커밋하고 팀에 공유한다.

팀원은 해당 변경을 Pull한 뒤 개별 패키지 설치 명령을 실행하지 않고 다음 명령만
실행한다.

```bash
npm ci
npm run build:home
```

Storybook을 확인하거나 UI 컴포넌트를 작업하는 팀원은 다음 명령을 추가로 실행한다.

```bash
npm run storybook
```

정리하면 최초 도입 담당자가 설치와 lockfile 갱신을 담당하고, 팀원은 `npm ci`로
lockfile에 기록된 동일 버전을 설치한다.
