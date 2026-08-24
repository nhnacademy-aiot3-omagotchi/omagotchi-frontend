# 통합 E2E 검증 현황 (2026-08-24)

- 상태: 검증 작업 기록
- 기준 브랜치: Frontend `feature/SystemAdmin`, Learning `feature/cohort-duplicate`
- 목적: Frontend, Gateway, Learning, Identity를 연결해 실제로 확인한 범위와 아직 완료되지 않은 범위를 구분한다.

이 문서는 구현 완료 명세가 아니다. 이후 계약이나 구현이 변경되면 현재 코드와 자동화 테스트를 우선하고, 이 문서는 당시 검증 근거로 사용한다.

## 검증 환경

| 구성 요소 | 검증 방식 | 비고 |
| --- | --- | --- |
| Frontend | `localhost:8082`, 실제 브라우저 | Spring Session과 Redis Testcontainer 사용 |
| Gateway | `localhost:8080` | Identity와 Learning 요청 라우팅 |
| Identity | `localhost:8083` | PostgreSQL Testcontainer 사용, 소스 수정 없음 |
| Learning | `localhost:8084` | PostgreSQL Testcontainer 사용 |
| Browser | 회원가입부터 Home까지 실제 화면 조작 | 브라우저 저장소에서 JWT를 직접 읽지 않음 |

검증용 비밀번호, access token, refresh token과 Testcontainer 접속 정보는 문서나 저장소에 기록하지 않는다.

## 자동화 테스트 결과

| 저장소 | 실행 결과 | 확인 범위 |
| --- | --- | --- |
| Learning | 단위 테스트 921개, Testcontainers 통합 테스트 230개 통과, 1개 skip | 기수 생성·상태 전이·관리자 기간 중복·기수 삭제·출결·퀘스트 등 |
| Learning 추가 흐름 | `SystemAdminCohortAttendanceQuestFlowIT` 통과 | SYSTEM_ADMIN 기수 생성 → 관리자 배치 → 학생 승인 → 입실 → 출석 퀘스트 완료 |
| Frontend | Spring 테스트 8개, JavaScript 테스트 6개 통과 | 인증 Route, System Admin View, BFF 및 화면 Controller 회귀 |
| Identity | 전체 94개 테스트 통과 | 회원가입·로그인·JWT·refresh·logout 및 PostgreSQL 연동 |

Learning의 Presence 단위 테스트는 Redis를 mock으로 검증한다. 실제 Redis Testcontainer와 실제 STOMP 연결을 함께 사용하는 Presence 통합 테스트는 아직 없다.

## 실제 사용자 E2E 결과

### 완료

1. Identity의 실제 회원가입 API로 일반 사용자 계정을 생성했다.
2. Frontend 로그인 화면에서 실제 로그인하고 `/character-selector`로 이동했다.
3. 캐릭터와 닉네임을 선택하고 `/check-in` 및 `/home`으로 이동했다.
4. SYSTEM_ADMIN JWT로 Learning에 검증용 기수를 생성했다.
5. 별도로 가입한 사용자 계정을 기수 `MANAGER`로 배치했다.
6. 관리자가 출결 정책을 저장하고 기수를 `ACTIVE`로 전환했다.
7. 관리자가 가입 코드를 발급했다.
8. 일반 사용자가 Home의 기수 팝업에서 가입 코드를 입력해 참가 신청했다.
9. 관리자가 실제 가입 신청을 조회하고 승인했다.
10. 사용자가 `/check-in` 화면에서 입실했다.
11. 출결 API와 Learning DB에서 입실 기록 생성을 확인했다.
12. Learning의 Home·일일 퀘스트 API와 DB에서 일일 퀘스트 5개 생성을 확인했다.
13. `ATTENDANCE` 퀘스트가 `1/1`, `COMPLETED`로 변경된 것을 확인했다.

### 부분 완료 또는 우회 검증

| 항목 | 결과 | 주의 사항 |
| --- | --- | --- |
| `test@test.com` SYSTEM_ADMIN 인증 | JWT의 `SYSTEM_ADMIN` 권한과 Learning 관리자 API 호출 성공 | Identity에 관리자 승격 API가 없어 검증용 Testcontainers DB에서 역할을 임시 변경했다. 운영 가능한 정상 흐름은 아니다. |
| 퀘스트 | Learning API와 DB에는 5개가 존재하고 출석 퀘스트가 완료됨 | Home 진행 팝업에는 `등록된 퀘스트가 없습니다.`가 표시되어 UI 표시 흐름은 미완료다. |
| 출석 상태 | 입실 시각과 출석 캘린더 기록 생성 확인 | 퇴실 전에는 화면에 최종 상태가 `기록 없음`으로 표시된다. 최종 판정 전 상태 문구를 별도로 정의할 필요가 있다. |
| Presence snapshot | `GET /api/v1/cohorts/me/presence`가 정상 응답 | WebSocket 세션이 등록되지 않아 사용자 목록은 빈 배열이었다. |

## 아직 완료되지 않은 실제 E2E

- Identity 관리자 API를 통한 실제 사용자 목록·검색
- Identity 관리자 API를 통한 `SYSTEM_ADMIN` 부여·해제
- 일반 사용자와 SYSTEM_ADMIN 역할을 구분하는 실제 Identity 관리자 정책
- `test@test.com` 브라우저 로그인부터 `/system-admin-dashboard` 기능 조작까지의 전체 흐름
- System Admin 화면에서 실제 Identity 사용자에게 기수 관리 권한을 배치하는 흐름
- 기수 관리자의 커뮤니티 게시글 작성과 Home 노출
- 관리자 대시보드에서 기수 구성원의 출결 목록 확인·상태 수정
- 퀘스트 5개를 Home 진행 팝업에 실제 렌더링하고 보상까지 수령하는 흐름
- 퇴실 후 최종 출결 판정과 `MISSING_CHECK_OUT` 자동 판정
- 실제 STOMP 연결·heartbeat·disconnect에 따른 재실 인원 증감

## Presence 재실 기능 진단

Learning에는 실시간 Presence가 구현되어 있다.

```text
WebSocket endpoint         /ws
heartbeat destination      /app/presence/heartbeat
cohort subscription topic  /topic/cohorts/{cohortId}/presence
snapshot API               /api/v1/cohorts/me/presence
```

현재 재실 UI가 0명으로 표시되는 원인은 Learning 기능 부재가 아니라 연결 경계의 누락이다.

1. [`static/js/api.js`](../../src/main/resources/static/js/api.js)는 Presence snapshot GET만 제공한다.
2. [`static/js/home/presence.js`](../../src/main/resources/static/js/home/presence.js)는 `subscribeLabPresence`가 있으면 호출하도록 작성되어 있지만 실제 구현체가 없다.
3. Gateway에는 `/api/v1/cohorts/**` REST Route는 있지만 `/ws` WebSocket Route가 없다.
4. Learning은 STOMP `CONNECT`의 Bearer JWT를 검증한 뒤에만 Redis Presence 세션을 등록한다.
5. 따라서 출석 API로 입실해도 실시간 Presence 세션이 자동으로 생성되지는 않는다.

출결의 `PresenceInterval`은 입실·퇴실 및 출결 판정을 위한 영속 기록이고, realtime `Presence`는 현재 WebSocket 접속 상태를 나타내는 Redis 세션이다. 두 개념을 같은 값으로 취급하지 않는다.

### Presence 완료 조건

- Gateway가 `/ws`를 Learning WebSocket으로 전달한다.
- BFF Session의 JWT를 Browser에 그대로 노출하지 않는 실시간 인증 방식을 확정한다.
- Frontend가 STOMP 연결, 기수 Topic 구독, heartbeat, 재연결, 화면 종료 처리를 구현한다.
- Redis Testcontainer와 실제 STOMP Client를 사용하는 통합 테스트를 추가한다.
- 두 사용자로 접속하여 `ONLINE → AWAY → OFFLINE`과 재실 인원 증감을 실제 브라우저에서 확인한다.

## Identity 연동 대기 계약

Identity는 별도 담당자의 작업 범위이므로 이번 검증에서 소스를 수정하지 않았다. Frontend가 기다리는 계약은 [`시스템-관리자-BFF-연동.md`](../prompt/시스템-관리자-BFF-연동.md)에 정리되어 있다.

최소 필요 계약은 다음과 같다.

- 관리자용 사용자 목록·검색·페이지네이션
- `GlobalRole` 조회와 변경
- `AccountStatus` 조회와 변경
- 자기 자신의 관리자 권한 해제 및 마지막 SYSTEM_ADMIN 보호 정책

Identity 계약이 전달되면 임시 DB 역할 변경을 제거하고 SYSTEM_ADMIN 전체 브라우저 E2E를 다시 수행한다.

## 다음 검증 순서

1. Identity 관리자 API 계약을 연결하고 `test@test.com` 정상 권한 흐름을 재검증한다.
2. Home 퀘스트 응답 매핑과 렌더링 실패를 수정한다.
3. Gateway·Frontend의 Presence WebSocket 연결을 구현한다.
4. 커뮤니티 작성·Home 노출과 관리자 출결 조회를 연결한다.
5. 동일한 Testcontainers 환경에서 회원가입 → 로그인 → 기수 가입 → 입실 → 퀘스트 → 퇴실까지 회귀 E2E를 수행한다.
