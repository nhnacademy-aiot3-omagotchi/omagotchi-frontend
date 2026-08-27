# Home UI 문서 안내

- 상태: Home UI 문서 인덱스

이 디렉터리는 모바일 전용 화면 문서가 아니라 `/home` 단일 화면의 React Island,
반응형 레이아웃, Storybook과 UI 도구 도입 문서를 보관한다.

## 읽는 순서

```text
01-guides → 02-checklists → 03-research → 04-work-records
현재 규칙      실행·완료 확인     판단 배경       과거 변경 이력
```

```text
home-ui/
├── README.md         문서 진입점과 분류 기준
├── 01-guides/        현재 구현과 신규 작업이 따라야 할 규칙
├── 02-checklists/    설치·실행 순서와 완료 조건
├── 03-research/      도구·구조 후보 검토와 초기 조사
└── 04-work-records/  완료된 리팩토링, 변경 내역과 검증 결과
```

새 작업을 시작할 때는 `01-guides`와 `02-checklists`를 먼저 읽는다. `03-research`는 도구와
구조를 선택한 배경이며, `04-work-records`는 당시 실제로 바꾼 내용과 검증 결과다.

## 1. 현재 개발 가이드 — `01-guides/`

| 문서 | 용도 |
| --- | --- |
| [Home React·Storybook 구조 가이드](01-guides/home-react-storybook-structure.md) | 소스·Story·CSS·Controller와 빌드 산출물의 경로·책임 |
| [공통 UI 디자인 시스템·Storybook 가이드](01-guides/ui-design-system.md) | 기준색, 공통 컴포넌트, 출석·인증 시안과 실제 적용 순서 |
| [Frontend 도구·라이브러리 역할 가이드](../guides/frontend-toolchain-guide.md) | React, Vite, Storybook, Vitest, Playwright, Radix UI와 Motion의 역할과 명령 |

가이드는 현재 구현과 새 작업이 따라야 할 기준이다. 과거 기록과 충돌하면 코드, 테스트와
이 가이드를 우선한다.

## 2. 실행 체크리스트 — `02-checklists/`

| 문서 | 용도 |
| --- | --- |
| [React 게임 UI 도입 실행 체크리스트](02-checklists/react-ui-adoption-checklist.md) | 설치, 팀 적용과 단계별 검증 기준 |
| [백엔드 연동 전 Frontend 완료 체크리스트](02-checklists/pre-backend-frontend-checklist.md) | API 준비 전 완료 범위와 백엔드·AI 작업 보호 경계 |

체크리스트는 현재 진행 상태와 완료 조건을 확인할 때 사용한다. 설계 설명보다 실제 실행과
검증 항목에 초점을 둔다.

## 3. 검토·조사 자료 — `03-research/`

| 문서 | 용도 |
| --- | --- |
| [게임 UI 프레임워크 도입 검토안](03-research/react-ui-library.md) | Storybook, Radix UI, Motion과 외부 도구 검토 |

검토 문서는 도구 후보와 판단 근거다. 현재 적용 상태는 구조 가이드와 실행 체크리스트를
우선한다.

## 4. 리팩토링·변경 기록 — `04-work-records/`

| 문서 | 성격 |
| --- | --- |
| [Home UI 전환 검토 기록](04-work-records/home-ui-decision-history.md) | 모바일 Route 분리 대신 `/home` React Island를 선택한 과정 |
| [Home UI React Island 리팩토링 기록](04-work-records/home-react-island-refactor.md) | 초기 React Island 적용 범위와 반응형 레이아웃 변경 이력 |
| [Home 반응형 레이아웃 리팩토링 기록](04-work-records/home-responsive-layout-refactor.md) | 반응형·overlay 변경 이력 |
| [Home 하단 HUD 반응형 리팩토링 기록](04-work-records/home-bottom-hud-refactor.md) | 하단 HUD와 빠른 실행 영역 변경 이력 |
| [Storybook 공통 UI·화면 Pattern 리팩토링 기록](04-work-records/storybook-ui-pattern-refactor.md) | 디자인 토큰, 출석·인증·메뉴 Story와 반응형 검증 작업 기록 |
| [백엔드 연동 전 UI 통합 리팩토링 기록](04-work-records/pre-backend-ui-integration-2026-08-14.md) | 실제 View 연결, 상태 처리, 반응형·테스트 결과와 남은 통합 검증 |
| [AI 도우미 메신저 레이아웃·모델 선택 리팩토링 기록](04-work-records/home-ai-assistant-messenger-refactor.md) | 캐릭터 아바타를 메신저 형식으로 전환, 모델 선택(Gemini/Ollama) 활성화, Enter 전송·자동 스크롤 변경 이력 |

신규 문서는 특정 기기 이름보다 `home`, `responsive`, `component`, `storybook`처럼 실제
책임을 나타내는 이름을 사용한다.

## 문서 추가 기준

- 현재 구현 방법은 `01-guides/`에 작성한다.
- 실행 순서와 완료 조건은 `02-checklists/`에 작성한다.
- 후보 비교와 사전 조사는 `03-research/`에 작성한다.
- 완료한 리팩토링과 검증 결과는 `04-work-records/`에 작성한다.
- 구조적 결정은 `docs/adr/`에 ADR로 작성하고 여기에서 연결한다.
- 일회성 변경 과정은 `04-work-records/`에 `*-history.md` 또는 `*-refactor.md`로 남긴다.
- 파일을 추가하거나 이동하면 이 인덱스와 `docs/README.md`를 함께 갱신한다.
- 경로는 저장소 기준 상대 경로로 작성하고 `docs/mobile/` 경로를 새로 만들지 않는다.
