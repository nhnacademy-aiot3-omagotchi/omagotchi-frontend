# Frontend ↔ Backend 기능별 연결 지도

- 상태: Frontend 연결 준비 완료, Backend BFF·Domain 계약 연결 대기
- 기준일: 2026-08-14
- Browser API 경계: 같은 Origin의 `/bff/v1/**`

## 연결 원칙

Backend 담당자는 UI를 다시 만들지 않는다. `window.OmagotchiApi`의 기능 adapter와 기존
Controller의 응답 mapping만 연결한다. Domain Service의 `/api/v1/**`, `/api/v2/**`,
`/gamification/**` 경로는 Browser 코드에 직접 작성하지 않고 View BFF가 흡수한다.

```text
React·Thymeleaf DOM
  → 기존 data-* 계약
  → 기능별 Controller
  → window.OmagotchiApi
  → /bff/v1/**
  → View BFF
  → Domain Service
```

## 기능별 변경 지점

| 기능 | Browser adapter | 상태·mapping 소유자 | 보존할 UI 계약 | 현재 Backend 대기 항목 |
| --- | --- | --- | --- | --- |
| 인증 | Thymeleaf Form 제출 | Spring Security·Identity 연동 | Form action·field·서버 오류 | 실제 로그인·회원가입 종단 회귀 |
| 캐릭터 선택 | `OmagotchiApi.character` | `characterSelector.js` | `data-character-*`, `data-color-*`, `data-enter-button` | 목록·대표 캐릭터 DTO, assetKey 매핑 |
| 출석 | `OmagotchiApi.attendance` | `attendanceState.js`, `home/attendance.js` | 출석 시간·달력·`data-ui-state` | cohortId, 날짜·상태 enum, 이력 DTO |
| 재실 | `OmagotchiApi.presence` | `home/presence.js` | `data-presence-*`, 검색·새로고침 | Snapshot 우선 여부, 상태 enum, WebSocket 시점 |
| 학습 기록 | `OmagotchiApi.studyRecords` | `home/studyRecords.js` | `data-study-record-*`, 기간 이동 | 이번 Handoff 포함 여부와 기록 DTO |
| 기수 신청 | `OmagotchiApi.cohort` | `home.js` | `data-home-cohort-*` | 신청 응답·오류 DTO |
| 커뮤니티 | `OmagotchiApi.community` | `home.js` | `data-community-*` | 목록·검색·페이지·작성 BFF 계약 |
| 진행·통계 | 추가 adapter 필요 | `home.js` 진행 Overlay mapping | `data-overlay-tab`, `data-overlay-panel` | progression·quest 응답과 BFF 경로 |
| 랭킹 | 추가 adapter 필요 | `home.js` 랭킹 목록 mapping | `data-empty-ranking`, 목록 구조 | Study ranking 응답과 개인정보 표시 범위 |
| 내 정보 | 추가 adapter 필요 | `renderPersonalOverlay()` | 프로필 DL·실제 사용자 값 | Profile DTO와 approvedCohort |
| 업적 | 연결하지 않음 | 준비 중 빈 상태 | `data-overlay-panel="achievements"` | 기능·API가 확정된 뒤 별도 연결 |
| 설정 | 기존 Form·정적 상태 | `home.js` | `data-logout-form`, `data-logout` | 비밀번호 변경·Telegram 기능 확정 시 연결 |
| BGM | Backend 대상 아님 | `home/bgm.js` | 재생·목록·음량 상태 | 정적 `bgm.json`과 브라우저 재생 설정 유지 |

## 기능별 UI 상태 계약

| 상태 | 처리 |
| --- | --- |
| `loading` | 중복 조작을 막고 로딩 안내를 표시한다. |
| `empty` | 정상 빈 응답이며 가짜 사용자·순위·업적을 만들지 않는다. |
| `ready` | 검증된 Backend 응답만 표시한다. |
| `error` | 내부 예외 원문 대신 사용자용 문구를 표시한다. |
| `unauthorized` | 로그인 흐름으로 위임하며 임시 사용자로 대체하지 않는다. |
| `forbidden` | 권한 부족을 빈 데이터처럼 숨기지 않는다. |

출석 로컬 이력처럼 현재 남아 있는 Prototype은 `data-ui-source="local-prototype"` 또는
`[API-REPLACE]`로 추적한다. BFF가 정상 응답하고 회귀 검증을 통과하기 전에는 제거하지
않지만, API 실패를 Prototype 성공 상태로 표시해서도 안 된다.

## Backend 담당자의 작업 단위

기능 하나당 다음 순서로만 진행한다.

1. 실제 Domain Endpoint와 DTO를 확인한다.
2. View BFF Controller·Client·DTO를 구현한다.
3. `api.js`의 해당 adapter가 `/bff/v1/**`만 호출하도록 연결한다.
4. 기존 Controller에 순수 response mapping을 추가한다.
5. Loading·Empty·Ready·Error·권한 상태를 확인한다.
6. 해당 기능의 `[API-REPLACE]`만 제거한다.
7. 보존한 `data-*`와 테스트 결과를 완료 보고에 남긴다.

경로·Method·DTO 중 하나라도 확정되지 않았으면 추측하지 않고 중단한다. 상세 보호 범위는
[공통 보호 규칙](../prompt/공통-보호규칙.md), 작업 입력 형식은
[기능 연동 Prompt Template](../prompt/기능-연동-템플릿.md)을 사용한다.

## 현재 완료 기준

Frontend는 다음 상태까지 준비되어 있다.

- Storybook에서 공통 UI와 로딩·빈 값·오류·비활성 상태 확인 가능
- 실제 Home의 Dialog·Tabs·모바일 Layout과 `data-*` 계약 고정
- Browser 네트워크 요청은 `api.js` 한 곳을 통과
- BGM 정적 JSON 외 기능 코드의 직접 `fetch` 없음
- Backend 미연결 기능은 가짜 성공 데이터 대신 빈 상태 또는 오류 상태 표시
- Backend 담당자 수정 범위와 Frontend 보호 경로 문서화

남은 작업은 확정된 API 계약을 기능별 adapter와 View BFF에 연결하고 실제 서비스 조합에서
종단 회귀를 수행하는 것이다.
