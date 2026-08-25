# Gateway Presence 통합 검증 인계서 (2026-08-24)

- 대상 저장소: `omagotchi-gateway-service`
- 확인 기준 Gateway 커밋: `b20afb5`
- 관련 기능: Home 재실 현황(Presence)
- 판정: **Gateway 자동화 테스트 실패가 아니라, WebSocket 계약과 검증이 없는 통합 차단 상태**

이 문서는 Frontend·Gateway·Learning 실제 연결 검증 중 발견한 Gateway 관련 차단 사항을
Gateway 담당자에게 전달하기 위한 기록이다. 비밀번호, JWT와 Testcontainer 접속 정보는
기록하지 않는다.

## 1. 확인된 결과

| 검증 항목 | 결과 | 판단 |
| --- | --- | --- |
| Gateway REST Learning Route | 통과 | `/api/v1/cohorts/**`가 Learning으로 전달된다. |
| Presence snapshot REST | 통과 | `GET /api/v1/cohorts/me/presence`가 Gateway를 거쳐 정상 응답했다. |
| Gateway 최근 자동화 테스트 결과 | 통과 | 저장된 Surefire 결과 기준 49개 테스트, 실패·오류·skip 0개다. |
| Gateway `/ws` Route | 미구현 | `application.yaml`의 Route 목록에 `/ws`가 없다. |
| WebSocket Gateway 통합 테스트 | 없음 | 현재 `GatewaySecurityIntegrationTest`는 HTTP Route와 Bearer 보안만 검증한다. |
| 실제 Presence E2E | 차단 | Learning WebSocket 세션이 생성되지 않아 snapshot 사용자 목록이 빈 배열이다. |

따라서 “Gateway 테스트가 깨졌다”라고 전달하면 부정확하다. 현재 HTTP 회귀 테스트는
통과하지만, **Presence에 필요한 WebSocket Route와 보안 계약이 테스트 범위에 없어서 실제
통합 흐름이 실패한 상태**다.

## 2. 재현된 사용자 증상

1. 사용자가 Frontend에서 로그인한다.
2. 기수 가입과 승인 후 출결 입실을 완료한다.
3. `GET /bff/v1/presence` → Gateway
   `GET /api/v1/cohorts/me/presence` 요청은 성공한다.
4. 응답의 사용자 목록은 빈 배열이고 Home 재실 인원은 0명으로 표시된다.

입실 성공만으로 실시간 재실 세션이 생기지 않는 것은 정상이다. Learning의 출결
`PresenceInterval`은 영속 출결 기록이고, realtime Presence는 WebSocket 접속을 Redis에
등록한 값이다. 현재는 WebSocket 연결 자체가 완성되지 않아 snapshot에 사용자가 없다.

## 3. 코드에서 확인한 원인

Gateway 저장소의 `src/main/resources/application.yaml`에는 다음 REST Route만 있다.

- `/api/v1/cohorts/**`
- `/api/v1/cohort-memberships/**`
- 기타 Learning REST API

하지만 Learning의 STOMP handshake endpoint인 `/ws` 또는 `/ws/**` Route는 없다.
Gateway의 `SecurityConfig`는 공개 경로 외 모든 요청에 HTTP Bearer 인증을 요구한다.
반면 Learning은 HTTP handshake를 통과시킨 다음 STOMP `CONNECT` frame의
`Authorization: Bearer ...`를 검증한다.

Browser는 Frontend의 HttpOnly Session Cookie를 사용하며 Access Token을 읽지 않는다.
그러므로 단순히 Gateway에 `/ws` Route만 추가하면 끝나는 문제가 아니다. 다음 두 경계의
인증 방식을 함께 합의해야 한다.

1. Gateway가 `/ws` HTTP Upgrade handshake를 어떤 조건으로 허용할지
2. Frontend Session의 Access Token을 Learning의 STOMP `CONNECT` 인증으로 안전하게
   전달할 주체가 누구인지

Access Token을 URL query string, DOM, LocalStorage 또는 로그에 노출하는 방식은 사용하지
않는다.

## 4. Gateway 담당자 요청 사항

### 필수

1. `/ws`·필요 시 `/ws/**`를 Learning WebSocket endpoint로 전달하는 전용 Route를 정의한다.
2. REST Route와 분리해 WebSocket handshake 보안 정책을 명시한다.
3. Gateway가 `Upgrade`, `Connection`, WebSocket frame과 close status를 정상 전달하는지
   실제 Netty downstream으로 검증한다.
4. 허용되지 않은 Origin, 잘못된 endpoint와 인증되지 않은 STOMP 연결의 거부 책임을
   Frontend·Learning 담당자와 합의한다.
5. 운영 환경의 `ws`/`wss`, reverse proxy와 timeout 설정을 확인한다.

### Frontend·Learning과 계약 합의 필요

다음 중 하나를 선택해 소유자를 명확히 해야 한다.

- Frontend 서버가 Session을 인증한 뒤 STOMP 연결을 대신 소유하고 Browser에는 SSE 등
  same-origin stream만 제공한다.
- 짧은 수명의 1회용 WebSocket ticket을 발급해 Gateway/Learning이 검증한다.
- Access Token을 Browser에 노출하지 않는 다른 동등한 보안 설계를 합의한다.

Gateway 담당자 단독으로 인증 우회 경로를 만들지 않는다. 특히 `/ws` handshake를
무조건 공개하고 하류 검증 여부를 테스트하지 않는 상태는 운영 완료로 판정하지 않는다.

## 5. 추가할 Gateway 테스트

| 테스트 | 기대 결과 |
| --- | --- |
| `/ws` Upgrade Route | Learning WebSocket downstream으로 원본 path와 Upgrade가 전달된다. |
| 일반 HTTP `/ws` 요청 | 정한 계약에 따라 명시적으로 거부하거나 Upgrade만 허용한다. |
| 잘못된 `/ws-*`, `/api/ws` 경로 | `404`로 라우팅하지 않는다. |
| 허용되지 않은 Origin | 합의한 상태 코드로 거부한다. |
| STOMP 인증 실패 | 연결이 성립한 것처럼 보이지 않고 명시적으로 종료된다. |
| 정상 CONNECT·SUBSCRIBE | `/topic/cohorts/{cohortId}/presence` message가 왕복한다. |
| heartbeat·disconnect | 연결 유지와 종료가 Learning까지 전달된다. |
| REST 회귀 | 기존 49개 Gateway 테스트가 계속 통과한다. |

Mock Route 확인만으로 완료하지 않고 실제 Gateway port, WebSocket client와 테스트용
Learning WebSocket downstream을 연결하는 통합 테스트가 필요하다.

## 6. 완료 판정 기준

다음 조건을 모두 만족해야 Gateway Presence 차단을 해제한다.

1. Gateway `/ws` Route와 보안 정책이 코드와 문서에 존재한다.
2. Access Token이 Browser 저장소, URL과 로그에 노출되지 않는다.
3. Gateway WebSocket 통합 테스트와 기존 전체 테스트가 통과한다.
4. 실제 Gateway·Learning·Redis 환경에서 두 사용자의 접속·heartbeat·disconnect를
   확인한다.
5. Home 재실 목록에서 `ONLINE → AWAY → OFFLINE`과 인원 증감이 실제로 표시된다.
6. 최종 통합 SHA에서 REST 출결·기수·퀘스트 흐름에 회귀가 없다.

이 조건 전에는 Presence를 운영 범위에서 제외하거나 사용자에게 동작하는 기능처럼
노출하지 않는다.
