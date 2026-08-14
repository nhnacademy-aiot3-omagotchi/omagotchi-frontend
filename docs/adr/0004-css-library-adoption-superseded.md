# [ADR] CSS 라이브러리 추가 도입 검토 폐기

## 1. 상태 (Status)

- [ ] 제안됨 (Proposed)
- [ ] 수용됨 (Accepted)
- [ ] 거절됨 (Rejected)
- [x] 폐기됨/대체됨 (Deprecated/Superseded)

대체 방안: 표준 CSS와 프로젝트 자체 디자인 시스템을 유지한다. 동작과 접근성이 필요한
컴포넌트에는 Radix UI를, React 상태 기반 전환에는 Motion을 제한적으로 사용한다.

## 2. 배경 및 맥락 (Context)

Home React UI와 Storybook Pattern이 늘어나면서 색상, 간격, 반응형과 컴포넌트 스타일을
더 빠르고 일관되게 작성하기 위한 CSS 라이브러리 도입 가능성을 검토했다.

검토 시점의 프로젝트에는 다음 구조가 이미 존재한다.

- 기존 Home 화면은 여러 Vanilla JavaScript Controller와 다수의 전역 CSS를 사용한다.
- React Island는 기존 `data-*` DOM 계약을 유지하면서 점진적으로 UI를 전환한다.
- `src/main/resources/static/css/ui/design-system.css`에 색상 Token과 공통 UI 규칙이 있다.
- Storybook에서 공통 Button, Card, Field, Dialog, Tabs와 화면 Pattern을 검증한다.
- Radix UI는 스타일을 강제하지 않고 Dialog와 Tabs의 접근성 동작만 제공한다.
- Motion은 Dialog 등장·퇴장처럼 제한된 전환에만 사용한다.

이 상황에서 Tailwind CSS, Bootstrap, CSS-in-JS 또는 Sass를 추가하면 생산성이 향상될 수
있지만, 기존 CSS와 신규 작성 방식이 동시에 존재해 스타일 책임과 우선순위가 더
복잡해질 가능성도 있다. 따라서 별도 CSS 라이브러리가 현재 단계에 필요한지 검토했다.

## 3. 고려한 대안 (Alternatives)

### Tailwind CSS 도입

Utility class를 조합해 컴포넌트 스타일과 반응형 규칙을 빠르게 작성한다.

새 React 컴포넌트 작업 속도는 높일 수 있지만 기존 Thymeleaf, Vanilla JavaScript와 전역
CSS를 함께 유지하는 동안 같은 화면에 두 가지 작성 규칙이 혼재한다. 기존 오마고치
Token과 클래스 기반 CSS를 Tailwind 설정으로 다시 옮기는 비용도 발생한다.

### Bootstrap 또는 완성형 UI CSS 도입

미리 제공되는 Grid, Button, Modal과 Form 스타일을 사용한다.

초기 화면 제작은 빠르지만 외부 기본 디자인을 제거하거나 덮어써야 하며, 현재 픽셀 아트와
초록색 중심의 오마고치 디자인을 유지하려면 상당한 재정의가 필요하다. 전역 스타일이 기존
Home CSS와 충돌할 가능성도 있다.

### styled-components 또는 Emotion 도입

React 컴포넌트와 스타일을 JavaScript 안에서 함께 관리하고 동적 props 기반 스타일을
작성한다.

컴포넌트 단위 격리는 가능하지만 Thymeleaf와 Vanilla JavaScript 화면에서는 같은 방식을
사용하기 어렵다. 런타임 또는 빌드 설정과 추가 의존성이 생기고, 현재 CSS와 스타일
Token의 위치도 이중화된다.

### CSS Modules 또는 Sass 도입

CSS Modules로 클래스 충돌을 막거나 Sass의 중첩, 함수와 파일 분할 기능을 사용한다.

표준 CSS와 가까운 장점이 있지만 Vite가 생성하는 React Bundle과 Spring 정적 CSS의 빌드
경로를 함께 조정해야 한다. 현재 필요한 CSS 변수, Grid, Flex, Container·Media Query는
표준 CSS만으로 구현할 수 있어 즉시 얻는 효과가 제한적이다.

### 표준 CSS와 자체 디자인 시스템 유지

CSS Custom Properties를 Token으로 사용하고 컴포넌트·Pattern별 CSS를 프로젝트 내부에서
관리한다. 파일이 커지면 역할별 파일로 분리하되 새로운 스타일 프레임워크는 추가하지
않는다.

## 4. 결정 사항 및 사유 (Decision & Rationale)

**CSS 라이브러리를 추가 도입하는 안은 폐기하고, 표준 CSS 기반 자체 디자인 시스템으로
대체한다.**

현재 `design-system.css`에 존재하는 Token과 공통 규칙을 기준으로 다음 영역을 관리한다.

- 색상, Font, 간격, Border, Shadow Token
- Button, Card, Field, Dialog와 Tabs의 시각 표현
- 출석부, 인증 화면과 Home 메뉴 Pattern
- 가용 폭과 높이를 기준으로 한 반응형 Layout
- `prefers-reduced-motion`, Focus와 Scroll 같은 접근성 보조 규칙

CSS 파일이 커질 경우 아래와 같이 책임별로 분리할 수 있지만, 이는 표준 CSS 구조 정리이며
새 라이브러리 도입을 의미하지 않는다.

```text
src/main/resources/static/css/ui/
├── tokens.css
├── primitives.css
├── dialog.css
├── tabs.css
├── patterns.css
└── utilities.css
```

이 결정을 선택한 이유는 다음과 같다.

- 기존 Thymeleaf, Vanilla JavaScript와 React Island가 같은 Token을 사용할 수 있다.
- 새로운 전역 Reset이나 Utility 규칙으로 인한 기존 Home CSS 충돌을 피할 수 있다.
- 오마고치 디자인이 외부 Theme나 클래스 규칙에 종속되지 않는다.
- Radix UI의 동작과 자체 CSS의 표현을 명확히 분리할 수 있다.
- 새로운 빌드 설정과 팀 학습 비용을 지금 추가하지 않아도 된다.
- 현재 필요한 반응형과 상태 표현은 표준 CSS 기능으로 구현할 수 있다.

## 5. 결과 및 영향 (Consequences)

### 장점 (Positive)

- 기존 화면과 React 컴포넌트가 동일한 CSS Token을 공유할 수 있다.
- 외부 Theme와 전역 스타일 충돌 위험이 증가하지 않는다.
- 번들 의존성과 빌드 설정을 추가하지 않는다.
- 디자인 변경 사유와 클래스 책임을 프로젝트 내부에서 직접 추적할 수 있다.
- Radix UI를 스타일 라이브러리가 아닌 접근성 Primitive로 사용할 수 있다.

### 단점 (Negative)

- Utility class나 완성형 컴포넌트 없이 스타일을 직접 작성해야 한다.
- 공통 규칙을 지키지 않으면 CSS 중복과 선택자 우선순위 문제가 다시 늘어날 수 있다.
- `design-system.css`가 커지기 전에 책임별 파일 분리가 필요하다.
- Token, Focus, 반응형과 reduced motion 규칙을 팀이 직접 관리해야 한다.

## 6. 규정 준수 (Compliance)

- 신규 색상과 간격은 기존 CSS Custom Properties를 우선 사용한다.
- React 컴포넌트만을 위한 값이라도 공통으로 재사용한다면 UI Token에 정의한다.
- 특정 기기 이름이 아니라 가용 폭, 높이와 Layout 조건으로 반응형 규칙을 작성한다.
- `!important`와 과도한 선택자 중첩으로 기존 스타일을 덮어쓰지 않는다.
- Radix UI에는 외부 Theme를 적용하지 않고 프로젝트 자체 CSS를 사용한다.
- Motion이 없어도 동일한 기능을 수행할 수 있어야 하며 `prefers-reduced-motion`을 준수한다.
- Storybook에서 기본, Focus, Disabled, 긴 Text와 모바일 상태를 확인한다.
- CSS 구조를 변경한 뒤 `npm run build:home`, `npm run build-storybook`과 관련 Story Test를
  실행한다.
- CSS 라이브러리를 다시 검토할 경우 해결할 문제, Migration 범위와 기존 CSS 제거 계획을
  포함한 새로운 ADR을 작성한다.

## 7. 참고 사항 (Notes)

- 대체 결정: [React 게임 UI 도구의 단계적 도입](0003-react-game-ui-tools-incremental-adoption.md)
- 공통 CSS: `src/main/resources/static/css/ui/design-system.css`
- 구조 문서: [Home React·Storybook 구조 가이드](../home-ui/home-react-storybook-structure.md)
- 작업 기록: [Storybook 공통 UI·화면 Pattern 리팩토링 기록](../home-ui/storybook-ui-pattern-refactor.md)
- 현재 CSS 라이브러리 추가 설치 없음
- 향후 프로젝트 규모와 CSS 유지보수 비용이 크게 증가하면 CSS Modules 등 Build-time
  격리 방식을 새 ADR에서 다시 검토할 수 있다.
