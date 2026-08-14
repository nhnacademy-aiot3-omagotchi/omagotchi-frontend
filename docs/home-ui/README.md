# Home UI 문서 안내

- 상태: Home UI 문서 인덱스

이 디렉터리는 모바일 전용 화면 문서가 아니라 `/home` 단일 화면의 React Island,
반응형 레이아웃, Storybook과 UI 도구 도입 문서를 보관한다.

## 현재 개발 가이드

| 문서 | 용도 |
| --- | --- |
| [Home React·Storybook 구조 가이드](home-react-storybook-structure.md) | 소스·Story·CSS·Controller와 빌드 산출물의 경로·책임 |
| [공통 UI 디자인 시스템·Storybook 가이드](ui-design-system.md) | 기준색, 공통 컴포넌트, 출석·인증 시안과 실제 적용 순서 |
| [React 게임 UI 도입 실행 체크리스트](react-ui-adoption-checklist.md) | 설치, 팀 적용과 단계별 검증 기준 |
| [백엔드 연동 전 Frontend 완료 체크리스트](pre-backend-frontend-checklist.md) | API 준비 전 완료 범위와 백엔드·AI 작업 보호 경계 |

## 검토 문서

| 문서 | 용도 |
| --- | --- |
| [게임 UI 프레임워크 도입 검토안](react-ui-library.md) | Storybook, Radix UI, Motion과 외부 도구 검토 |

검토 문서는 도구 후보와 판단 근거다. 현재 적용 상태는 구조 가이드와 실행 체크리스트를
우선한다.

## Home UI 작업 기록

| 문서 | 성격 |
| --- | --- |
| [Home UI 전환 검토 기록](home-ui-decision-history.md) | 모바일 Route 분리 대신 `/home` React Island를 선택한 과정 |
| [Home UI React Island 리팩토링 기록](mobile-view-research.md) | 초기 React Island 리팩토링 범위와 조사 기록 |
| [Home 반응형 레이아웃 리팩토링 기록](home-responsive-layout-refactor.md) | 반응형·overlay 변경 이력 |
| [Home 하단 HUD 반응형 리팩토링 기록](home-bottom-hud-refactor.md) | 하단 HUD와 빠른 실행 영역 변경 이력 |
| [Storybook 공통 UI·화면 Pattern 리팩토링 기록](storybook-ui-pattern-refactor.md) | 디자인 토큰, 출석·인증·메뉴 Story와 반응형 검증 작업 기록 |
| [백엔드 연동 전 UI 통합 리팩토링 기록](pre-backend-ui-integration-2026-08-14.md) | 실제 View 연결, 상태 처리, 반응형·테스트 결과와 남은 통합 검증 |

파일명에 `mobile`이 남은 `mobile-view-research.md`는 당시 조사 범위를 보존한 작업 기록이다.
신규 문서는 특정 기기 이름보다 `home`, `responsive`, `component`, `storybook`처럼 실제
책임을 나타내는 이름을 사용한다.

## 문서 추가 기준

- 현재 구현 방법은 이 디렉터리의 가이드에 작성한다.
- 구조적 결정은 `docs/adr/`에 ADR로 작성하고 여기에서 연결한다.
- 일회성 변경 과정은 `*-history.md` 또는 `*-refactor.md` 작업 기록으로 남긴다.
- 파일을 추가하거나 이동하면 이 인덱스와 `docs/README.md`를 함께 갱신한다.
- 경로는 저장소 기준 상대 경로로 작성하고 `docs/mobile/` 경로를 새로 만들지 않는다.
