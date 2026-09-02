# 문서 안내

- 상태: 문서 인덱스

이 디렉터리는 Frontend의 현재 동작, 제품 요구사항, 구현 계획, 작업 기록을 함께 보관한다.
문서의 성격이 서로 다르므로 아래 분류와 우선순위를 기준으로 읽는다.

## 먼저 읽을 문서

1. [프로젝트 README](../README.md) — 실행 방법과 시스템 경계
2. [Frontend 동작 흐름](onboarding/README.md) — 요청, 인증, Session, 오류 처리
3. [Frontend 구현 명세](specifications/frontend-implementation-spec.md) — 화면별 구현 기준
4. [기능 연동 개발 가이드](onboarding/05-feature-integration-guide.md) — BFF와 Backend 연동 절차

실제 동작이 문서와 다르면 `src/main`과 회귀 테스트를 우선한다. 요구사항 문서는 구현
완료를 의미하지 않으며, 작업 기록은 현재 규칙보다 당시의 판단 과정을 설명하는 자료다.

## 기술 결정

| 문서 | 용도 |
| --- | --- |
| [Frontend ADR](adr/README.md) | 구조적 결정 목록과 작성 규칙 |
| [ADR 0003: React 게임 UI 도구의 단계적 도입](adr/0003-react-game-ui-tools-incremental-adoption.md) | Storybook, Radix UI와 Motion의 도입 순서 및 범위 |
| [Frontend 디렉터리 구조와 파일 소유권](architecture/frontend-directory-map.md) | 전체 경로 지도와 변경 목적별 소유권 |

## 현재 동작과 개발 가이드

| 문서 | 용도 |
| --- | --- |
| [Frontend 동작 흐름](onboarding/README.md) | 온보딩 문서의 시작점과 현재 구현 상태 |
| [Servlet Container와 Spring Container](onboarding/00-servlet-container-and-spring-container.md) | 애플리케이션 기동과 요청 처리 경계 |
| [요청·Page·JavaScript 흐름](onboarding/01-request-page-and-browser-flow.md) | Route, View, Browser 코드의 책임 |
| [Session 인증 흐름](onboarding/02-session-authentication-flow.md) | Signup, Login, Logout, Redis Session |
| [오류·장애 흐름](onboarding/03-error-and-failure-flow.md) | HTML·JSON 오류와 외부 장애 처리 |
| [팀원 누구나 이해하는 BFF 실제 요청 흐름](onboarding/04-bff-request-flow.md) | Browser·BFF·Gateway·Learning의 역할과 실제 요청 예시 |
| [기능 연동 개발 가이드](onboarding/05-feature-integration-guide.md) | Prototype을 실제 BFF/API로 전환하는 기준 |
| [BFF와 Learning HTTP Interface 경계](onboarding/06-bff-http-interface-boundary.md) | Browser·View·Learning의 의존 범위와 Spring `@HttpExchange`·`@GetExchange` 선언형 Client 설명 |
| [새 기능 BFF 연결 Quick Start](onboarding/07-bff-feature-quickstart.md) | 새 Learning 기능을 Browser·View BFF에 연결하는 파일별 순서와 복사 가능한 예시·검증표 |
| [Frontend 도구·라이브러리 역할 가이드](guides/frontend-toolchain-guide.md) | React, Vite, Storybook, Vitest, Playwright, Radix UI와 Motion의 역할·실행 방법 |
| [Home UI 문서 인덱스](home-ui/README.md) | Home React Island, 반응형, Storybook 문서 분류 |
| [Home React·Storybook 구조 가이드](home-ui/01-guides/home-react-storybook-structure.md) | React 소스, Story, CSS, Controller와 빌드 산출물의 경로·책임 |
| [공통 UI 디자인 시스템·Storybook 가이드](home-ui/01-guides/ui-design-system.md) | 공통 색상·컴포넌트와 출석·인증 Story의 적용 기준 |
| [백엔드 연동 전 Frontend 완료 체크리스트](home-ui/02-checklists/pre-backend-frontend-checklist.md) | API 준비 전 완료 범위와 백엔드·AI 작업 보호 경계 |
| [관리자 대시보드 패널 작성 가이드](guides/manager-dashboard-panel-guide.md) | 관리자 패널의 구조와 확장 규칙 |
| [관리자 대시보드 패널 작성 예시](examples/manager-dashboard-panel-example.md) | 신규 패널 구현 예시 |

## 요구사항과 계획

아래 문서는 목표와 협의 내용을 기록한다. 현재 구현 여부는 코드와 테스트에서 별도로
확인한다.

| 문서 | 용도 |
| --- | --- |
| [Frontend 구현 명세](specifications/frontend-implementation-spec.md) | 관리자·사용자 화면 구현 방식 |
| [인증·회원 요구사항](requirements/auth-requirements.md) | 인증, 회원, 출결 관련 요구사항 |
| [게이미피케이션 요구사항](requirements/gamification-requirements.md) | 캐릭터, EXP, 보상, 퀘스트 정책 |
| [MVP 로드맵](roadmaps/mvp-roadmap.md) | MVP 범위와 우선순위 |
| [Backend 연동 협의 정리](integration/backend-integration-todo.md) | API 후보와 Backend 협의 항목 |
| [Frontend ↔ Backend 기능별 연결 지도](integration/frontend-backend-connection-map.md) | 기능별 adapter·Controller·UI 계약과 Backend 대기 항목 |
| [통합 E2E 검증 현황 (2026-08-24)](integration/e2e-validation-status-2026-08-24.md) | 실제 브라우저·Testcontainers 검증 범위, 우회 검증과 미완료 항목 |
| [Gateway Presence 통합 검증 인계서](integration/gateway-presence-handoff-2026-08-24.md) | Gateway `/ws` 통합 차단 원인, 담당자 요청 사항과 완료 조건 |
| [AI 추천 퀘스트 완료 연동 인계서](integration/ai-quest-completion-handoff.md) | `handleLlmQuestCompleted` 호출부 미연결, 호출 시점 결정과 검증 절차 |
| [React Island 학습·작업 로드맵](roadmaps/react-island-learning-roadmap.md) | 점진 이전 순서와 학습 범위 |
| [게임 UI 프레임워크 도입 검토안](home-ui/03-research/react-ui-library.md) | UI 도구와 외부 에셋 검토 초안 |
| [React 게임 UI 도입 실행 체크리스트](home-ui/02-checklists/react-ui-adoption-checklist.md) | 설치 순서, 선행 작업과 검증 기준 |

## Home UI 작업 기록

이 문서들은 현재 규칙의 배경과 변경 이력을 설명한다. 새 구현 기준은
[Frontend 구현 명세](specifications/frontend-implementation-spec.md)와 코드에서 확인한다.

| 문서 | 용도 |
| --- | --- |
| [Home UI 전환 검토 기록](home-ui/04-work-records/home-ui-decision-history.md) | 모바일 Route 분리 대신 React Island를 선택한 이유 |
| [Home UI React Island 리팩토링 기록](home-ui/04-work-records/home-react-island-refactor.md) | 초기 React Island 적용 범위와 레이아웃 변경 이력 |
| [홈 반응형 레이아웃 리팩터링 기록](home-ui/04-work-records/home-responsive-layout-refactor.md) | 반응형·오버레이 변경 이력 |
| [Home 하단 HUD 반응형 리팩토링 기록](home-ui/04-work-records/home-bottom-hud-refactor.md) | 하단 HUD 변경 이력 |
| [Storybook 공통 UI·화면 Pattern 리팩토링 기록](home-ui/04-work-records/storybook-ui-pattern-refactor.md) | 공통 UI, 화면 Pattern과 반응형 검증 변경 이력 |
| [백엔드 연동 전 UI 통합 리팩토링 기록](home-ui/04-work-records/pre-backend-ui-integration-2026-08-14.md) | 출석·인증·Home 메뉴의 실제 View 연결과 검증 결과 |
| [AI 도우미 메신저 레이아웃·모델 선택 리팩토링 기록](home-ui/04-work-records/home-ai-assistant-messenger-refactor.md) | 캐릭터 아바타 메신저 형식 전환, 모델 선택 활성화, Enter 전송·자동 스크롤 변경 이력 |

## 작업용 Prompt

아래 문서는 구현 명세가 아니라 Backend 연동 작업을 시작할 때 사용하는 작업 지시문이다.

- [Backend Integration AI 공통 보호 규칙](prompt/공통-보호규칙.md)
- [기능별 Backend 연동 Prompt Template](prompt/기능-연동-템플릿.md)
- [Timer Backend 연동 Prompt](prompt/타이머.md)
- [Space·Team Backend 연동 Prompt](prompt/공간-팀.md)
- [관리자 공간·센서 Chart.js 연동 가이드](prompt/센서-차트.md)
- [System Admin BFF 연동 가이드](prompt/시스템-관리자-BFF-연동.md)
- [Home AI 도우미 구현 Prompt](prompt/AI-도우미.md)
- [AI 도우미 연동 Prompt](prompt/AI-연동.md)

## 라이선스

- [Audio Licenses](licenses/audio-license.md)

새 외부 에셋을 추가할 때는 원본 주소, 제작자, 라이선스, 수정 여부를 함께 기록한다.

## 디렉터리 구조

```text
docs/
├── adr/             기술 선택과 변경 결정을 기록하는 ADR
├── architecture/    현재 소스 구조와 파일 소유권
├── examples/        가이드에서 참조하는 구현 예시
├── guides/          반복 작업에 사용하는 구현 가이드
├── home-ui/         Home React Island, Storybook, 반응형 UI 문서
├── integration/     Backend·외부 서비스 연동 협의와 작업 항목
├── licenses/        외부 에셋과 라이브러리 라이선스
├── onboarding/      요청·인증·오류 등 현재 동작 흐름
├── prompt/          Backend 연동 시 사용하는 AI 작업 지시문
├── requirements/    제품 및 기능 요구사항
├── roadmaps/        단계별 구현·학습 계획
└── specifications/  현재 구현이 따라야 할 상세 명세
```

문서가 여러 성격을 가질 때는 현재 구현의 기준이면 `specifications`, 목표 상태를 설명하면
`requirements`, 순서와 우선순위를 설명하면 `roadmaps`, 반복 가능한 절차이면 `guides`에 둔다.

## 문서 관리 기준

- 새 문서에는 목적과 상태(현재 구현, 요구사항, 초안, 작업 기록 중 하나)를 밝힌다.
- 파일을 추가하거나 이름을 바꾸면 이 인덱스와 관련 문서 링크도 함께 갱신한다.
- 파일 경로를 본문에 적을 때는 저장소 기준 상대 경로를 사용한다.
- 구현이 바뀐 경우 관련 온보딩 문서와 테스트를 같은 변경에서 갱신한다.
- 더 이상 유효하지 않은 문서는 삭제하기보다 작업 기록으로 표시하고 대체 문서를 연결한다.
