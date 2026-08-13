# 문서 안내

- 상태: 문서 인덱스

이 디렉터리는 Frontend의 현재 동작, 제품 요구사항, 구현 계획, 작업 기록을 함께 보관한다.
문서의 성격이 서로 다르므로 아래 분류와 우선순위를 기준으로 읽는다.

## 먼저 읽을 문서

1. [프로젝트 README](../README.md) — 실행 방법과 시스템 경계
2. [Frontend 동작 흐름](onboarding/README.md) — 요청, 인증, Session, 오류 처리
3. [Frontend 구현 명세](frontend-implementation-spec.md) — 화면별 구현 기준
4. [기능 연동 개발 가이드](onboarding/05-feature-integration-guide.md) — BFF와 Backend 연동 절차

실제 동작이 문서와 다르면 `src/main`과 회귀 테스트를 우선한다. 요구사항 문서는 구현
완료를 의미하지 않으며, 작업 기록은 현재 규칙보다 당시의 판단 과정을 설명하는 자료다.

## 기술 결정

| 문서 | 용도 |
| --- | --- |
| [Frontend ADR](adr/README.md) | 구조적 결정 목록과 작성 규칙 |
| [ADR 0003: React 게임 UI 도구의 단계적 도입](adr/0003-react-game-ui-tools-incremental-adoption.md) | Storybook, Radix UI와 Motion의 도입 순서 및 범위 |

## 현재 동작과 개발 가이드

| 문서 | 용도 |
| --- | --- |
| [Frontend 동작 흐름](onboarding/README.md) | 온보딩 문서의 시작점과 현재 구현 상태 |
| [Servlet Container와 Spring Container](onboarding/00-servlet-container-and-spring-container.md) | 애플리케이션 기동과 요청 처리 경계 |
| [요청·Page·JavaScript 흐름](onboarding/01-request-page-and-browser-flow.md) | Route, View, Browser 코드의 책임 |
| [Session 인증 흐름](onboarding/02-session-authentication-flow.md) | Signup, Login, Logout, Redis Session |
| [오류·장애 흐름](onboarding/03-error-and-failure-flow.md) | HTML·JSON 오류와 외부 장애 처리 |
| [기능 연동 개발 가이드](onboarding/05-feature-integration-guide.md) | Prototype을 실제 BFF/API로 전환하는 기준 |
| [Home UI 문서 인덱스](home-ui/README.md) | Home React Island, 반응형, Storybook 문서 분류 |
| [Home React·Storybook 구조 가이드](home-ui/home-react-storybook-structure.md) | React 소스, Story, CSS, Controller와 빌드 산출물의 경로·책임 |
| [공통 UI 디자인 시스템·Storybook 가이드](home-ui/ui-design-system.md) | 공통 색상·컴포넌트와 출석·인증 Story의 적용 기준 |
| [관리자 대시보드 패널 작성 가이드](manager-dashboard-panel-guide.md) | 관리자 패널의 구조와 확장 규칙 |
| [관리자 대시보드 패널 작성 예시](examples/manager-dashboard-panel-example.md) | 신규 패널 구현 예시 |

## 요구사항과 계획

아래 문서는 목표와 협의 내용을 기록한다. 현재 구현 여부는 코드와 테스트에서 별도로
확인한다.

| 문서 | 용도 |
| --- | --- |
| [Frontend 구현 명세](frontend-implementation-spec.md) | 관리자·사용자 화면 구현 방식 |
| [인증·회원 요구사항](auth-requirements.md) | 인증, 회원, 출결 관련 요구사항 |
| [게이미피케이션 요구사항](gamification-requirements.md) | 캐릭터, EXP, 보상, 퀘스트 정책 |
| [MVP 로드맵](mvp-roadmap.md) | MVP 범위와 우선순위 |
| [Backend 연동 협의 정리](backend-integration-todo.md) | API 후보와 Backend 협의 항목 |
| [React Island 학습·작업 로드맵](react-island-learning-roadmap.md) | 점진 이전 순서와 학습 범위 |
| [게임 UI 프레임워크 도입 검토안](home-ui/react-ui-library.md) | UI 도구와 외부 에셋 검토 초안 |
| [React 게임 UI 도입 실행 체크리스트](home-ui/react-ui-adoption-checklist.md) | 설치 순서, 선행 작업과 검증 기준 |

## Home UI 작업 기록

이 문서들은 현재 규칙의 배경과 변경 이력을 설명한다. 새 구현 기준은
[Frontend 구현 명세](frontend-implementation-spec.md)와 코드에서 확인한다.

| 문서 | 용도 |
| --- | --- |
| [Home UI 전환 검토 기록](home-ui/home-ui-decision-history.md) | 모바일 Route 분리 대신 React Island를 선택한 이유 |
| [Home UI React Island 리팩토링 기록](home-ui/mobile-view-research.md) | 초기 리팩토링 범위와 레이아웃 방향 |
| [홈 반응형 레이아웃 리팩터링 기록](home-ui/home-responsive-layout-refactor.md) | 반응형·오버레이 변경 이력 |
| [Home 하단 HUD 반응형 리팩토링 기록](home-ui/home-bottom-hud-refactor.md) | 하단 HUD 변경 이력 |

## 작업용 Prompt

아래 문서는 구현 명세가 아니라 Backend 연동 작업을 시작할 때 사용하는 작업 지시문이다.

- [Timer Backend 연동 Prompt](prompt/타이머.md)
- [Space·Team Backend 연동 Prompt](prompt/공간-팀.md)

## 라이선스

- [Audio Licenses](audio-license.md)

새 외부 에셋을 추가할 때는 원본 주소, 제작자, 라이선스, 수정 여부를 함께 기록한다.

## 문서 관리 기준

- 새 문서에는 목적과 상태(현재 구현, 요구사항, 초안, 작업 기록 중 하나)를 밝힌다.
- 파일을 추가하거나 이름을 바꾸면 이 인덱스와 관련 문서 링크도 함께 갱신한다.
- 파일 경로를 본문에 적을 때는 저장소 기준 상대 경로를 사용한다.
- 구현이 바뀐 경우 관련 온보딩 문서와 테스트를 같은 변경에서 갱신한다.
- 더 이상 유효하지 않은 문서는 삭제하기보다 작업 기록으로 표시하고 대체 문서를 연결한다.
