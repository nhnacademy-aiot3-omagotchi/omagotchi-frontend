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

## 이번 작업에서 변경하지 않은 범위

- Spring Security, JWT, Redis Session과 Identity Service 연동
- Java 로그인·회원가입 Controller
- `login.html`, `register.html`과 실제 인증 Form
- 실제 Home 출석 Controller와 `data-attendance-*` 계약
- 실제 Home 메뉴의 `home.js` HTML·이벤트 위임
- Radix UI와 Motion의 실제 화면 적용

`AuthScreen`, `AttendanceBook`, `HomeMenuPanel`은 현재 Storybook 시안이다. 실제 서비스가
자동으로 이 컴포넌트를 사용하는 상태는 아니다.

## 다음 작업

1. `AttendanceBook`을 기존 출석 Controller와 서버 응답에 연결한다.
2. 인증 로직은 유지하고 `AuthScreen` 디자인만 기존 Thymeleaf Form에 적용한다.
3. Home 메뉴는 `설정 → 내 정보 → 기수 → 학습 기록 → 공간 → 커뮤 → 진행` 순서로 한
   화면씩 연결한다.
4. 실제 화면 연결 뒤 Radix Dialog, Radix Tabs와 Motion을 별도 변경으로 검토한다.

화면별 보존 계약과 완료 기준은
[React 게임 UI 도입 실행 체크리스트](react-ui-adoption-checklist.md#구현-순서)를 따른다.
