# Frontend 도구·라이브러리 역할 가이드

- 상태: 현재 개발 가이드
- 기준 파일: `package.json`, `vite.config.js`, `.storybook/`
- 대상: Frontend 개발자와 Backend 연동 담당자

## 1. 문서 목적

이 문서는 프로젝트에 설치된 Frontend 도구와 라이브러리가 **왜 필요한지**, **어디에서
사용되는지**, **팀원이 무엇을 실행해야 하는지**를 설명한다.

버전의 최종 기준은 이 문서가 아니라 `package.json`과 `package-lock.json`이다. 팀원은
패키지를 개별적으로 다시 설치하지 않고 프로젝트 루트에서 `npm ci`를 실행한다.

## 2. 한눈에 보는 구성

```text
React 컴포넌트
├── Radix UI: Dialog·Tabs의 접근 가능한 동작
├── Motion: Dialog의 짧은 전환 효과
└── Custom CSS: 오마고치 색상·간격·반응형 디자인
        ↓
Vite: 브라우저가 실행할 home-app.js로 빌드
        ↓
Spring Boot / Thymeleaf의 /home에서 로드

Storybook: 위 컴포넌트를 실제 페이지와 분리해 상태별로 전시
└── Vitest + Playwright: Story를 Chromium에서 렌더링하고 검증
```

## 3. 실제 화면에 포함되는 라이브러리

| 도구 | 역할 | 현재 사용 위치 | 사용하지 않는 범위 |
| --- | --- | --- | --- |
| React | UI를 컴포넌트와 상태 단위로 구성 | `src/main/frontend/` | 인증·Session·Backend 데이터 판정 |
| React DOM | React 컴포넌트를 실제 DOM에 마운트 | `home-react/main.jsx` | 서버 HTML 렌더링과 API 호출 |
| Radix UI | Dialog, Tabs의 포커스·키보드·ARIA 동작 제공 | `ui/GameDialog.jsx`, `ui/GameTabs.jsx` | 색상과 시각 테마 |
| Motion | React 상태에 맞춘 짧은 등장·퇴장 애니메이션 | `ui/GameDialog.jsx` | 데이터 처리와 필수 기능 |
| Custom CSS | 브랜드 색상, 픽셀 스타일, 간격과 반응형 담당 | `src/main/resources/static/css/` | Dialog의 접근성 로직 |

### React와 React DOM

React는 Home HUD, 오버레이와 공통 UI의 구조를 컴포넌트로 나누는 도구다. React DOM은
그 컴포넌트를 브라우저 DOM에 붙인다. Spring MVC, Thymeleaf, 로그인과 Session을 대체하지
않으며 현재는 **React Island** 영역만 담당한다.

### Radix UI

Radix UI는 디자인 완제품이 아니라 접근 가능한 동작의 뼈대다. 예를 들어 Dialog를 열었을
때 포커스를 내부로 이동하고, `Esc`로 닫고, 보조 기술에 Dialog임을 알리는 처리를 돕는다.
시각 디자인은 계속 오마고치 Custom CSS가 담당한다.

현재 적용 범위는 `GameDialog`와 `GameTabs`다. 기존 `data-*` 계약과 Vanilla JavaScript를
무시하고 모든 오버레이를 자동 전환하는 도구가 아니다.

### Motion

Motion은 Dialog가 부드럽게 나타나고 사라지는 것처럼 짧은 시각 피드백을 제공한다.
`prefers-reduced-motion`을 존중하며, 애니메이션이 꺼져도 열기·닫기 같은 기능은 동일하게
동작해야 한다.

## 4. 개발·빌드 도구

| 도구 | 역할 | 관련 파일 또는 명령 |
| --- | --- | --- |
| Vite | JSX와 의존성을 브라우저용 번들로 변환 | `vite.config.js`, `npm run build:home` |
| `@vitejs/plugin-react` | Vite가 React JSX를 처리하도록 연결 | `vite.config.js` |
| Storybook | 컴포넌트를 실제 페이지와 분리해 상태별로 확인 | `.storybook/`, `*.stories.jsx` |
| `@storybook/react-vite` | Storybook이 React와 Vite를 사용하도록 연결 | `.storybook/main.js` |
| Storybook Docs | Story와 Props를 문서 화면으로 제공 | `@storybook/addon-docs` |
| Storybook A11y | 대비, 이름, ARIA 등 접근성 문제를 탐지 | `@storybook/addon-a11y` |

### Vite

Vite는 개발 화면 자체가 아니라 **빌드 도구**다. `src/main/frontend/home-react/main.jsx`를
시작점으로 React 코드를 묶어 다음 Spring Boot 정적 리소스를 만든다.

```text
src/main/resources/static/js/home-react/home-app.js
```

이 산출물은 직접 수정하지 않는다. React source를 수정한 뒤 `npm run build:home`으로 다시
생성한다.

### Storybook

Storybook은 버튼 에셋을 그림으로 만들어 주는 툴이 아니라, 실제 React 컴포넌트를 서버와
분리해 여러 상태로 실행하는 **UI 개발·문서화 환경**이다.

다음과 같은 상태를 빠르게 비교하는 데 사용한다.

- 기본, disabled, loading, empty와 error 상태
- 긴 문구와 실제 한글 문구
- PC, 태블릿과 모바일 폭
- 출석 전·입실·퇴실 같은 화면 상태
- Controls로 Props를 바꿨을 때의 결과
- 접근성 검사 결과

Story의 mock 데이터는 검증용이며 실제 `/home`의 사용자 데이터로 사용하지 않는다.
Storybook에서 보기 좋다고 실제 View에 자동 반영되는 것도 아니다. 공통 컴포넌트 또는
실제 View가 같은 source와 CSS를 사용하도록 연결하고 `/home`에서도 다시 확인해야 한다.

## 5. 테스트 도구

| 도구 | 역할 | 이 프로젝트에서의 관계 |
| --- | --- | --- |
| Vitest | Vite 환경의 Frontend 테스트 실행기 | Storybook Story 테스트 프로젝트 실행 |
| Storybook Vitest 애드온 | 각 Story를 Vitest가 검사할 수 있게 변환 | `@storybook/addon-vitest` |
| Playwright | 실제 브라우저를 자동 조작하는 엔진 | Vitest가 headless Chromium에서 Story 렌더링 |
| Vitest Browser Playwright | Vitest와 Playwright를 연결 | `@vitest/browser-playwright` |
| V8 Coverage | 실행된 JavaScript 범위를 측정하는 기반 | `@vitest/coverage-v8`; 필요 시 커버리지 확인 |

### Vitest란 무엇인가

Vitest는 Vite 프로젝트에 맞춘 JavaScript 테스트 실행기다. 이 프로젝트에서는
`vite.config.js`의 `storybook` 테스트 프로젝트를 읽고, Storybook에 등록된 Story가 실제
브라우저에서 렌더링 가능한지 검사한다.

현재 Story 검증은 주로 다음 문제를 빠르게 발견한다.

- import 오류 또는 JSX 렌더링 실패
- 필수 Props 누락으로 인한 예외
- Storybook 설정과 정적 리소스 경로 오류
- 브라우저에서만 나타나는 컴포넌트 실행 오류

Vitest가 Spring Controller, Session, Backend API까지 검증하는 것은 아니다. 해당 영역은
`./mvnw test`의 JUnit/Spring 테스트와 실제 서비스 통합 테스트가 담당한다.

### Playwright가 함께 필요한 이유

Vitest만으로는 DOM을 흉내 낸 환경에서 테스트할 수도 있지만, 이 프로젝트의 Story는 실제
브라우저 렌더링과 CSS·접근성 동작 확인이 중요하다. 따라서 Playwright가 headless
Chromium을 실행하고 Vitest가 그 안에서 Story를 검사하도록 연결했다.

### `prop-types`

`prop-types`는 JavaScript React 컴포넌트가 받은 Props의 자료형을 개발 중 확인하는 보조
패키지다. TypeScript처럼 빌드 전에 전체 타입을 보장하지 않으며, Vitest를 대신하지도
않는다. 현재 구성에 필요한 호환 의존성으로 유지하되 신규 컴포넌트의 핵심 계약은 Story,
문서와 테스트에도 함께 남긴다.

## 6. 명령별 의미

```bash
# package-lock.json에 기록된 동일 버전을 설치
npm ci

# React source를 Spring Boot가 읽는 home-app.js로 생성
npm run build:home

# React 수정 내용을 감시하면서 home-app.js를 계속 다시 생성
npm run dev:home

# UI 작업장을 http://localhost:6006 에서 실행
npm run storybook

# 배포 가능한 정적 Storybook을 생성하고 설정 오류 확인
npm run build-storybook

# Story를 headless Chromium에서 테스트
npx vitest run

# Spring MVC, 인증, Session과 Java 단위·통합 테스트
./mvnw test
```

`6006`은 Storybook 개발 서버의 관례적인 기본 포트이며 실제 서비스 포트가 아니다.
실제 Spring Boot 화면과 인증 흐름은 프로젝트의 서비스 포트에서 별도로 확인한다.

## 7. 작업 종류별 무엇을 실행하는가

| 변경 내용 | 최소 검증 |
| --- | --- |
| React 컴포넌트 또는 공통 UI 변경 | `npm run build:home`, `npx vitest run` |
| Story만 추가·수정 | `npx vitest run`, `npm run build-storybook` |
| CSS 또는 반응형 변경 | Storybook 뷰포트 확인 + 실제 `/home` 확인 |
| Radix Dialog·Tabs 변경 | 키보드, 포커스, 닫기 동작 + 모바일 확인 |
| Motion 변경 | reduced motion 확인 + 애니메이션 없는 기능 확인 |
| Controller, 인증 또는 Session 변경 | `./mvnw test` + 실제 로그인 흐름 확인 |
| Backend API 연결 | 위 검증 + 성공·빈 값·오류·권한 만료 종단 검증 |

## 8. 팀 적용 원칙

- 패키지를 전역 설치하지 않는다.
- `package.json`만 수정하지 말고 `package-lock.json`을 함께 반영한다.
- 팀원은 개별 `npm install 패키지명` 대신 `npm ci`를 실행한다.
- Vite 산출물 `home-app.js`는 직접 고치지 않는다.
- Story mock을 실제 애플리케이션 fallback 데이터로 복사하지 않는다.
- Storybook 성공만으로 실제 `/home` 적용 완료로 판단하지 않는다.
- Radix UI와 Motion은 필요한 컴포넌트에서만 import한다.
- Backend가 없는 상태에서 랭킹, 업적, 사용자 기록을 성공 데이터처럼 만들지 않는다.

## 9. 관련 문서

- [React 게임 UI 도구의 단계적 도입 ADR](../adr/0003-react-game-ui-tools-incremental-adoption.md)
- [게임 UI 프레임워크 도입 검토안](../home-ui/react-ui-library.md)
- [React 게임 UI 도입 실행 체크리스트](../home-ui/react-ui-adoption-checklist.md)
- [Home React·Storybook 구조 가이드](../home-ui/home-react-storybook-structure.md)
- [공통 UI 디자인 시스템·Storybook 가이드](../home-ui/ui-design-system.md)

