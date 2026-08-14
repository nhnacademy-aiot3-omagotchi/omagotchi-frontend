# Storybook 공통 UI·화면 Pattern 리팩토링 기록

- 작성일: 2026-08-13
- 상태: 작업 기록
- 작업 브랜치: `feature/mobile-ui`
- 관련 커밋: `26e2987`, `7f5c66c`

## 목적

Home에 누적된 UI를 실제 기능 코드와 분리해 상태별로 검토하고, 출석·인증·Home 메뉴에
공통으로 사용할 색상과 기초 컴포넌트를 정리했다. 특정 기기별 CSS 보정을 늘리는 대신
Storybook에서 데스크톱·태블릿·모바일 상태를 먼저 검증할 수 있는 기반을 만드는 것이
이번 작업의 목적이다.

## 작업 전 문제

- 실제 Home을 실행해야 컴포넌트 외형을 확인할 수 있었다.
- 짙은 초록 배경이 넓게 사용돼 정보 영역의 구분이 약했다.
- 출석, 인증과 메뉴 내부 화면의 로딩·오류·빈 값·모바일 상태를 독립적으로 보기 어려웠다.
- 화면 폭이 바뀔 때 일부 Grid의 최소 폭이 외곽 패널보다 커질 수 있었다.
- Home 전용 UI와 여러 화면에서 재사용할 공통 UI의 경로 구분이 없었다.

## 변경 내용

### 1. 공통 디자인 토큰

기준 초록 `#2FC47C`을 주요 행동과 완료 상태에 사용하고, 넓은 정보 영역은 다음 보조색으로
분리했다.

| 역할 | 색상 |
| --- | --- |
| Primary | `#2FC47C` |
| Deep green | `#176B4A` |
| Mint | `#DDF8EA` |
| Cream | `#FFF8E7` |
| Peach | `#FFC9A8` |
| Sky | `#D8EFFF` |
| Lilac | `#E9E1FF` |
| Ink | `#17342A` |

토큰과 공통 외형은 `src/main/resources/static/css/ui/design-system.css`에 분리했다.

### 2. 공통 UI

`src/main/frontend/ui/`에 다음 표현 컴포넌트와 Story를 추가했다.

- `GameButton`: primary, secondary, soft, danger, loading, disabled
- `GameCard`: mint, cream, sky, peach, lilac
- `GameField`: 기본, 안내, 오류, 비밀번호
- `DesignTokens`: 색상과 사용 원칙

### 3. 화면 Pattern

실제 서버 상태와 분리된 Storybook 검증용 Pattern을 추가했다.

| Pattern | Story 상태 |
| --- | --- |
| `AttendanceBook` | 입실 전, 학습 중, 퇴실 완료, 로딩, 빈 기록, 모바일 |
| `AuthScreen` | 로그인, 오류, 로딩, 회원가입, 필드 오류, 모바일 |
| `HomeMenuPanel` | 진행, 내 정보, 기수, 학습 기록, 공간, 커뮤, 설정, 모바일 |

인증 화면의 서비스 특징은 배지 형태를 제거하고 `#집중타이머`, `#출석기록`,
`#캐릭터성장` 해시태그 텍스트로 정리했다.

출석부는 2×2 대형 요약 카드 대신 `항목 → 값` 세로 목록으로 변경하고, 데스크톱에서
달력이 더 넓은 열을 사용하도록 조정했다.

### 4. 반응형 수정

공통 UI에 `box-sizing: border-box`, `min-width: 0`, `max-width: 100%` 규칙을 적용했다.

초기에는 760px 이하에서만 출석부가 단일 열로 전환됐다. 768px 화면에서는 다음 최소 폭이
외곽 흰색 패널의 실제 내부 폭보다 커져 헤더, 달력과 연속 출석 영역이 오른쪽으로
이탈했다.

```text
출석 목록 최소 250px + 달력 최소 440px + 열 간격 + 패널 내부 여백
```

단일 열 전환 기준을 840px로 조정해 태블릿 경계를 포함하고, 출석부·인증·Home 메뉴
Pattern이 좁은 화면에서 한 열 구조를 사용하도록 수정했다.

## 경로 구조

```text
src/main/frontend/
├── home-react/components/              실제 Home 전용 컴포넌트·Story
└── ui/                                 공통 UI·검증용 Pattern·Story

src/main/resources/static/css/
├── home/                               Home 전용 CSS
└── ui/design-system.css                공통 토큰·Pattern CSS
```

Storybook은 `.storybook/preview.jsx`에서 Home CSS 다음에 `design-system.css`를 읽는다.
Story 검색 범위는 `src/main/frontend/**/*.stories.*`이며 정적 이미지와 폰트는 기존
`src/main/resources/static`을 함께 사용한다.

## 검증 결과

```bash
npm run build:home
npm run build-storybook
./node_modules/.bin/vitest run
```

- Storybook 정적 build 성공
- Vitest Story 파일 19개 통과
- 전체 Story 74개 통과
- 출석부 1440, 1024, 840, 768, 390, 320px 외곽 이탈·가로 넘침 없음
- Home 메뉴 7종 768, 390, 320px 총 21개 조합에서 패널·본문 넘침 없음
- 로그인·회원가입 768, 390, 320px 총 6개 조합에서 패널·입력창 넘침 없음

정적 build의 폰트·이미지 경로 경고는 Storybook이 `/fonts`, `/images` 절대 경로를 build
시점에 번들링하지 않고 `staticDirs`에서 실행 시점에 제공하기 때문에 발생하며 build
실패는 아니다.

## 최초 Storybook 작업에서 변경하지 않은 범위

- Spring Security, JWT, Redis Session과 Identity Service 연동
- Java 로그인·회원가입 Controller
- `login.html`, `register.html`과 실제 인증 Form
- 실제 Home 출석 Controller와 `data-attendance-*` 계약
- 실제 Home 메뉴의 `home.js` HTML·이벤트 위임
- Radix UI와 Motion의 실제 화면 적용

이 절은 최초 Storybook 시안 작성 시점의 범위를 기록한다. 2026-08-14 후속 작업에서 세
Pattern의 디자인을 실제 화면에 연결했으며 연결 방식은 아래 절과
[백엔드 연동 전 UI 통합 기록](pre-backend-ui-integration-2026-08-14.md)에 정리했다.

## 다음 작업

아래 항목은 2026-08-14 후속 작업에서 완료했다.

1. `AttendanceBook` 디자인을 기존 출석 Controller DOM에 연결
2. 인증 로직을 유지한 채 `AuthScreen` 디자인을 Thymeleaf Form에 적용
3. Home 메뉴 실제 내용을 공통 표현 어댑터에 연결
4. 도움말·설정 Dialog와 진행 Tabs를 Radix·Motion에 연결

다음 작업은 Identity·View·필요 Domain Service를 함께 실행한 실제 `/home` 통합 회귀다.

화면별 보존 계약과 완료 기준은
[React 게임 UI 도입 실행 체크리스트](react-ui-adoption-checklist.md#구현-순서)를 따른다.

## 2026-08-14 후속 작업 — 백엔드 비의존 UI

백엔드 API 버전과 Gateway route가 확정되기 전에도 진행 가능한 UI 작업을 별도 범위로
분리했다. 이번 후속 작업은 API 경로, JWT, Session, Identity Service와 기존 Home의
`data-*` 계약을 변경하지 않는다.

### 추가한 공통 동작 컴포넌트

| 컴포넌트 | 기반 | 검증 범위 |
| --- | --- | --- |
| `GameDialog` | Radix Dialog, Motion | 포커스 이동·복귀, Esc·배경 닫기, 모바일 내부 스크롤, reduced motion |
| `GameTabs` | Radix Tabs | 방향키 이동, 선택 탭·패널 일치, 긴 이름과 모바일 가로 스크롤 |

- `AttendanceBook`은 `embedded` 상태를 지원해 Storybook Dialog 안에서 검증할 수 있다.
- `HomeMenuPanel`의 진행 시안은 `GameTabs`로 퀘스트·업적·랭킹·통계를 전환한다.
- Radix `asChild`가 버튼 ref를 전달할 수 있도록 `GameButton`을 `forwardRef`로 변경했다.
- Dialog 등장·퇴장에만 Motion을 사용하고 `useReducedMotion()`을 따른다.

### 브라우저 검증 결과

- Dialog가 열리면 닫기 버튼으로 포커스 이동
- Esc로 닫은 뒤 열기 버튼으로 포커스 복귀
- Tabs에서 오른쪽 방향키 입력 시 선택 탭과 콘텐츠가 함께 변경
- 모바일 Dialog에서 가로 넘침 없음
- 화면 높이를 넘는 콘텐츠는 Dialog 내부에서만 세로 스크롤

### 실제 Home 적용과 오버레이 후속 보정

- 실제 `home.html`에서도 Storybook과 같은 `ui/design-system.css`를 로드하도록 연결했다.
- 도움말과 설정은 `GameDialog`를 기존 `[data-home-overlay-root]` 안에 유지해 기존 이벤트
  위임과 포커스 복귀 계약을 보존했다.
- 일반 Overlay와 Radix Dialog Overlay 모두 뷰포트의 가로·세로 중앙을 기준으로 배치한다.
- Radix가 접근성 이름으로 사용하는 숨김 제목과 설명은 컴포넌트 내부의 시각적 숨김
  스타일도 함께 적용한다. 공통 CSS가 늦게 로드되거나 누락되어도 제목·설명이 화면 상단에
  중복 노출되지 않는다.
- 도움말과 설정은 화면에 보이는 제목이 각각 한 번만 렌더링되고, Dialog의 접근성 이름은
  유지되는 것을 Storybook 독립 화면에서 확인했다.
- 최종 검증은 `npm run build:home`, 전체 Storybook 21개 파일·80개 Story 테스트와
  `git diff --check`를 통과했다.

### Pattern의 실제 화면 연결

- `AttendanceBook`: 실제 `home.html` 출석부에 공통 class를 적용했다. 달력과 스트릭은 기존
  Vanilla Controller가 계속 갱신하며 `data-calendar-*`, `data-check-*-time` 계약을 보존한다.
- `AuthScreen`: React 시안을 인증 페이지에 마운트하지 않고 Thymeleaf Form에 디자인만
  적용했다. `method`, `th:action`, `th:field`, `name`, 오류 출력과 비밀번호 토글은 유지한다.
- `HomeMenuPanel`: Storybook mock Panel을 가져오지 않는다. `HomeMenuLiveContent`가
  `home.js`의 실제 내부 템플릿만 감싸 공통 색상·간격·반응형 규칙을 제공한다.
- 출석과 재실 Controller는 API 부재·실패를 빈 성공 상태로 처리하지 않고 UI 상태를 구분한다.

5개 뷰포트의 Storybook 정적 검사에서 `document.body.scrollWidth`가 viewport 폭을 넘지 않았고,
도움말·설정의 화면상 제목이 각각 하나만 존재함을 확인했다.

### 계속 대기하는 백엔드 연동 범위

- `/bff/v1/**` 출석·학습 기록 endpoint와 실제 응답 DTO
- 기수 승인과 입실 가능 여부의 서버 판정
- Prototype `localStorage` fallback 제거
- Gateway의 Domain API v1·v2 route 반영
- Storybook mock을 실제 서비스 데이터로 교체하는 작업

공통 컴포넌트는 현재 Storybook에서 동작을 검증하는 단계다. 실제 Home Overlay에 적용할
때는 `window.OmagotchiHomeOverlay`, `[data-home-overlay-root]`와 기존 이벤트 위임을 먼저
보존해야 한다.
