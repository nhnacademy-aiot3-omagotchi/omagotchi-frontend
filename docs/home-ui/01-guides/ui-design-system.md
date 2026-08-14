# 공통 UI 디자인 시스템·Storybook 가이드

- 작성일: 2026-08-13
- 상태: Storybook 검증 및 실제 View 표현 연결 완료, 서비스 종단 검증 대기
- 대상: Home, 출석, 로그인·회원가입 등 사용자 화면을 작업하는 Frontend 팀원

## 목적

오마고치 사용자 화면에 반복되는 색상, 버튼, 카드와 입력창의 기준을 한곳에 둔다.
Storybook에서 외형·상태·반응형을 먼저 검증하고, 실제 View에는 Form·`data-*`·Controller
계약을 보존하는 표현 어댑터로 연결한다. Storybook mock 컴포넌트가 Thymeleaf 기능 DOM을
자동으로 교체하지 않는다.

## 기준 색상

기준 초록은 `#2FC47C`이다. 넓은 화면 전체를 짙은 초록으로 채우지 않고 주요 행동과 완료
상태에만 사용한다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--ui-emerald-500` | `#2FC47C` | 주요 버튼, 출석 완료, 핵심 강조 |
| `--ui-emerald-800` | `#176B4A` | 짙은 글자·배지·버튼 그림자 |
| `--ui-emerald-100` | `#DDF8EA` | 선택 배경과 약한 강조 |
| `--ui-cream` | `#FFF8E7` | 안내, 연속 출석 |
| `--ui-peach` | `#FFC9A8` | 주의가 필요한 보조 정보 |
| `--ui-sky` | `#D8EFFF` | 시간·상태 정보 |
| `--ui-lilac` | `#E9E1FF` | 독립적인 보조 콘텐츠 |
| `--ui-ink` | `#17342A` | 본문과 제목 |

토큰과 공통 스타일은 `src/main/resources/static/css/ui/design-system.css`에 있다.
Storybook의 `UI/Foundation/Palette`에서 색상과 용도를 함께 확인한다.

## 소스 구조

```text
src/main/frontend/
├── home-react/components/          Home 전용 컴포넌트와 Story
└── ui/                             화면 공통 UI와 검증용 Pattern
    ├── GameButton.jsx
    ├── GameCard.jsx
    ├── GameField.jsx
    ├── AttendanceBook.jsx
    ├── AuthScreen.jsx
    ├── HomeMenuPanel.jsx
    └── *.stories.jsx

src/main/resources/static/css/
├── home/                           Home 전용 CSS
└── ui/design-system.css            공통 토큰·컴포넌트·Pattern CSS
```

`home-react/components`는 Home의 DOM 계약과 기능에 종속된다. `ui`는 출석·인증처럼 여러
화면에서 다시 쓸 수 있는 표현 계층이다. 컴포넌트와 Story는 같은 디렉터리에 둔다.

## 현재 Storybook 범위

| 분류 | 확인할 수 있는 상태 |
| --- | --- |
| `UI/Foundation` | 기준색과 보조색 용도 |
| `UI/Button` | primary, secondary, soft, loading, disabled |
| `UI/Card` | mint, cream, sky, peach, lilac |
| `UI/Field` | 기본, 안내, 오류, 비밀번호 |
| `Patterns/AttendanceBook` | 입실 전, 학습 중, 퇴실 완료, 로딩, 빈 기록, 모바일 |
| `Patterns/AuthScreen` | 로그인, 오류, 로딩, 회원가입, 필드 오류, 모바일 |
| `Patterns/HomeMenuPanel` | 진행, 내 정보, 기수, 학습 기록, 공간, 커뮤, 설정, 모바일 |

출석일, 시간과 인증 오류는 Storybook 검증용 데이터다. 실제 서버 성공 응답이나 인증
판정으로 사용하지 않는다.

## 반응형 기준

- 컴포넌트는 고정 기기명이 아니라 가용 폭을 기준으로 줄어든다.
- 840px 이하에서 출석부는 단일 열, 인증 화면과 메뉴 Pattern은 상하 구조가 된다.
- 390px 이하에서는 출석 요약 카드도 단일 열이 된다.
- 모든 공통 UI는 `box-sizing: border-box`, `min-width: 0`, `max-width: 100%`를 기준으로
  가로 스크롤을 만들지 않는다.
- 실제 검증은 최소 320px와 데스크톱 1280px에서 수행한다.

### 현재 검증 표본

| 대상 | 확인한 폭 | 결과 |
| --- | --- | --- |
| 출석부 | 1440, 1024, 840, 768, 390, 320px | 외곽 패널 이탈·가로 넘침 없음 |
| Home 메뉴 7종 | 768, 390, 320px | 21개 조합에서 패널·본문 넘침 없음 |
| 로그인·회원가입 | 768, 390, 320px | 6개 조합에서 패널·입력창 넘침 없음 |

이 값은 특정 기기에 맞춘 구현 기준이 아니라, 데스크톱·태블릿·모바일 경계에서 회귀를
찾기 위한 QA 표본이다.

## 실제 화면 적용 순서

화면별 우선순위와 보존할 기능 계약은
[React 게임 UI 도입 실행 체크리스트의 구현 순서](../02-checklists/react-ui-adoption-checklist.md#구현-순서)를
기준으로 한다.

1. Storybook에서 기본·오류·로딩·빈 값·모바일 상태를 검토한다.
2. 팀이 외형과 문구를 확정한다.
3. Thymeleaf 또는 React Island가 요구하는 `name`, `action`, `data-*`, 오류 DOM 계약을
   확인한다.
4. 공통 컴포넌트를 실제 화면에 연결하고 Story mock 대신 서버·BFF 응답을 props로 전달한다.
5. 로그인, 회원가입, 출석 기능 회귀 테스트를 수행한다.

2026-08-14에 세 Pattern의 디자인을 실제 View에 연결했다. 다만 Storybook mock 컴포넌트를
그대로 마운트하지는 않는다. `AttendanceBook`은 실제 출석 DOM class, `AuthScreen`은
Thymeleaf Form 디자인, `HomeMenuPanel`은 실제 `home.js` 내용을 감싸는 표현 어댑터로
사용한다. 서버 요청과 인증·`data-*` 기능 계약은 기존 코드가 계속 소유한다.

## 실행과 검증

```bash
npm ci
npm run storybook
npm run build-storybook
./node_modules/.bin/vitest run
```

2026-08-14 기준 전체 21개 Story 그룹, 80개 Story가 렌더링 테스트를 통과한다.
