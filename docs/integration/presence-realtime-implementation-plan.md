# Presence 재실 현황 구현 계획 (Learning · Frontend)

> 상태: 착수 전 실행 계획 · 최종 갱신 2026-08-25
> 대상: Home 재실 현황(Presence)
> 선행 문서: [Gateway Presence 통합 검증 인계서](gateway-presence-handoff-2026-08-24.md)
> 이 문서는 인계서가 남긴 "인증 방식 3자 합의" 항목의 **결정본**이며, 그 결정에 따른
> Learning·Frontend 작업을 단계별로 정의한다.

---

## 0. 결정 변경 이력

| 일자 | 결정 | 사유 |
| --- | --- | --- |
| 2026-08-24 | 인계서 작성. 인증 방식 미정으로 Presence 차단 판정 | Browser가 Access Token을 갖지 않아 STOMP CONNECT 인증 경로가 없음 |
| 2026-08-25 (오전) | 1차 결정: **View STOMP ↔ Browser SSE** | Learning 변경 0, ticket 불필요 |
| **2026-08-25 (확정)** | **최종 결정: REST heartbeat + Learning의 기존 Redis TTL 구조 재사용** | 아래 §1 참고. **WebSocket 자체를 Presence 경로에서 제외한다** |

1차 결정을 뒤집은 이유는 §1의 "왜 STOMP+SSE를 접었는가"에 적는다. 기각한 설계의 상세는
[부록 A](#부록-a-기각한-stomp--sse-설계)에 남긴다. 나중에 채팅·실시간 알림처럼 **진짜 push가
필요한 기능**이 오면 그때 다시 꺼내 쓴다.

---

## 1. 결정 요약

### 채택: REST heartbeat + 기존 Redis TTL 재사용

```text
Browser --[POST /bff/v1/presence/heartbeat, 30초 주기, Session Cookie]--> View
View    --[POST /api/v1/cohorts/me/presence/heartbeat, Bearer]---------> Gateway --> Learning
Learning--[기존 CohortPresenceService + Redis TTL]

응답 본문 = CohortPresenceSnapshot   ← heartbeat 왕복 1회로 갱신과 조회를 동시에 끝낸다
```

**Presence 경로에서 WebSocket을 사용하지 않는다.** Learning의 STOMP 자산은 삭제하지 않고
남겨 두되, Presence는 여기에 의존하지 않는다.

### 왜 STOMP + SSE를 접었는가

| 문제 | 내용 |
| --- | --- |
| **View가 stateful이 된다** | 기존 BFF는 요청-응답으로 끝나 상태가 없었다. STOMP 커넥션을 보유하면 View 안에 유일한 stateful 영역이 생기고, 연결 수명·heartbeat 스케줄러·인스턴스 로컬 상태가 따라온다 |
| **Frontend 역할이 흐려진다** | 위 상태 관리가 화면 계층의 책임인지 불분명해진다 |
| **남의 일정에 물린다** | Gateway `/ws` Route가 선행 조건이라 Gateway 담당자 없이는 착수 자체가 막힌다 |
| **요구사항보다 큰 도구다** | 재실 현황은 초 단위 실시간성이 필요한 정보가 아니다. 15~30초 지연을 사용자가 인지하지 못한다 |
| **스케일아웃 제약** | 로그아웃 요청을 받은 인스턴스와 커넥션을 소유한 인스턴스가 달라질 수 있다 |

### 채택 근거 — 코드가 이미 REST 친화적이다

**① `heartbeat()`가 이미 self-healing이다. 별도 register 엔드포인트가 필요 없다.**

```java
// CohortPresenceService.heartbeat()
Optional<SessionPresence> sessionPresence = findSession(sessionId);
if (sessionPresence.isPresent()) {
    ... TTL 연장 ...
    return;
}
registerSession(sessionId, user);   // 없으면 알아서 등록한다
```

최초 호출은 등록, 이후 호출은 갱신으로 동작한다. 멱등한 REST 호출에 그대로 맞는 모양이다.

**② `sessionId`가 WebSocket에 묶여 있지 않다.**

`registerSession`·`heartbeat`·`disconnectSession` 모두 파라미터가 불투명한 `String`이다.
지금은 STOMP의 `simpSessionId`가 들어갈 뿐이고, View가 만든 UUID를 넣어도 동작이 같다.

**③ `snapshot()`이 disconnect 이벤트 없이도 정확하다.**

```java
// CohortPresenceService.cleanupAndSnapshotUser()
if (!hasValidSession(userId)) {
    // session hash TTL이 만료된 사용자를 조회 시점에 정리한다
    redisTemplate.opsForValue().set(userPresenceKey(userId), PresenceStatus.OFFLINE.name());
    ...
    return Optional.empty();
}
```

`SessionDisconnectEvent`는 즉시 제거를 위한 최적화일 뿐이다. 없어도 TTL 만료 후 snapshot
조회 시점에 lazy cleanup 된다.

**④ heartbeat 응답이 곧 snapshot이다.**

polling과 heartbeat를 따로 돌릴 필요가 없다. 30명이 30초 주기로 보내면 **초당 1회**다.

**⑤ TTL이 이미 환경 변수다.**

```yaml
realtime:
  presence:
    session-ttl: ${REALTIME_PRESENCE_SESSION_TTL}
```

`PresenceProperties`가 `@ConfigurationProperties`이므로 코드 변경 없이 조정할 수 있다.

**⑥ Gateway 작업이 사라진다.** `/ws` Route도, WebSocket 통합 테스트도, timeout 협의도 필요 없다.

**⑦ View가 stateless로 유지된다.** 기존 `LearningProxyBffService` 패턴 그대로 BFF 라우트 2개다.

### 기각한 방식 전체

| 방식 | 기각 이유 |
| --- | --- |
| Browser → Gateway `/ws` 직결 | Browser의 WebSocket API는 handshake에 `Authorization` 헤더를 붙일 수 없다. 토큰을 넘길 자리가 query string밖에 없다 |
| 1회용 ticket 발급 | 위 제약을 피하려는 우회책이다. Learning의 `WebSocketConnectAuthenticationInterceptor`를 고쳐야 하고 ticket 저장소 소유권을 3자가 합의해야 한다. 같은 신뢰 경계에 인증 수단이 2개가 된다 |
| Gateway가 View Session Cookie 검증 | Gateway가 View의 Redis Session 스키마에 의존하게 되어 의존 방향이 뒤집힌다 |
| **View STOMP ↔ Browser SSE** | 위 "왜 접었는가" 참고. **설계 자체는 유효하므로 부록 A에 보존한다** |

### 확인된 사실 (근거 코드)

| 사실 | 위치 |
| --- | --- |
| `heartbeat()`는 세션이 없으면 `registerSession()`을 호출한다 | `realtime/application/CohortPresenceService.java` |
| `heartbeat()`는 세션 소유자를 대조한다 (`AccessDeniedException`) | 같은 파일 |
| **`disconnectSession()`은 소유자를 대조하지 않는다** | 같은 파일 → §3 L-2에서 수정 |
| `snapshot()`이 TTL 만료 세션을 lazy cleanup 한다 | 같은 파일 `cleanupAndSnapshotUser()` |
| Presence 세션 TTL은 환경 변수 `REALTIME_PRESENCE_SESSION_TTL` | `realtime/application/PresenceProperties.java`, `application.yaml:133` |
| `GET /api/v1/cohorts/me/presence` snapshot REST가 이미 있다 | `realtime/presentation/PresenceController.java` |
| View의 `GET /bff/v1/presence` 프록시가 이미 있다 | `presence/presentation/PresenceBffController.java` |
| `/bff/v1/**`는 `.authenticated()` + CSRF 적용 | `global/security/SecurityConfig.java` |
| `navigator.sendBeacon`은 커스텀 헤더를 붙일 수 없다 → CSRF 불가 | §4 F-4 참고 |

---

## 2. 전체 그림과 소유권

```text
┌─────────┐  30초 주기 POST   ┌──────────┐   Bearer    ┌─────────┐        ┌──────────┐
│ Browser │──────────────────►│   View   │────────────►│ Gateway │───────►│ Learning │
│         │◄──── snapshot ────│  (8082)  │◄────────────│ (8080)  │◄───────│  (8084)  │
└─────────┘   Session Cookie  └──────────┘             └─────────┘        └──────────┘
                                                                              │
                                4장 F 작업            변경 없음            3장 L 작업
                                                                              │
                                                                        Redis TTL 120s
```

| 구간 | 프로토콜 | 자격증명 | 소유 |
| --- | --- | --- | --- |
| Browser ↔ View | HTTP POST (JSON) | HttpOnly Session Cookie + CSRF | Frontend |
| View ↔ Gateway | HTTP POST | `Authorization: Bearer` + `X-Presence-Session` | Frontend |
| Gateway ↔ Learning | 기존 `/api/v1/cohorts/**` Route | 하류 전달 | **변경 없음** |
| Learning 내부 | Redis TTL | JWT 사용자 | Learning |

**핵심 원칙: View는 stateless 프록시로 유지하고, 상태는 전부 Learning의 Redis가 소유한다.**

### `presenceSessionId`의 신뢰 경계

Browser는 이 값을 **보지도 보내지도 않는다.** View가 최초 요청 시 UUID를 만들어 Spring
Session에 저장하고, 하류 호출 헤더에만 실어 보낸다. `LearningCohortContext`가 `cohortId`를
다루는 방식과 같은 자리다.

- 같은 브라우저의 여러 탭 → 같은 Session → 같은 `presenceSessionId` → **재실 1명**
- 다른 기기 → 다른 Session → 다른 id → 각각 세션 (Redis의 `presence:user:{id}:sessions` set이 흡수)
- 로그아웃 → Session 무효화 → id 소멸 → heartbeat 중단 → TTL 만료로 OFFLINE

---

## 3. Learning 작업

> 변경 범위: `realtime` 패키지 Controller 1개 + Service 3줄 + 환경 변수 1개.
> **선행 확인:** `realtime` 패키지를 직접 수정할 수 있는 영역인지 확인한다(§9-1).

### L-1. REST heartbeat·leave 엔드포인트 추가

`realtime/presentation/PresenceController.java`에 추가한다. `CohortPresenceService`는 그대로 쓴다.

```java
public static final String PRESENCE_SESSION_HEADER = "X-Presence-Session";

/**
 * REST heartbeat. 최초 호출은 세션 등록, 이후 호출은 TTL 연장으로 동작한다.
 * 응답으로 현재 snapshot을 함께 반환해 별도 polling 왕복을 없앤다.
 */
@PostMapping("/heartbeat")
public CohortPresenceSnapshot heartbeat(
        JwtAuthenticationToken authentication,
        @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
) {
    AuthenticatedUser user = AuthenticatedUser.from(authentication);
    presenceService.heartbeat(presenceSessionId, user);
    return presenceService.currentUserSnapshot(user.userId());
}

/** 로그아웃·이탈 시 TTL을 기다리지 않고 즉시 제거한다. */
@DeleteMapping
public ResponseEntity<Void> leave(
        JwtAuthenticationToken authentication,
        @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
) {
    AuthenticatedUser user = AuthenticatedUser.from(authentication);
    presenceService.disconnectSession(presenceSessionId, user.userId());
    return ResponseEntity.noContent().build();
}
```

주의:

- `presenceSessionId`를 요청자가 실어 보내므로 L-2의 소유자 대조가 **반드시 함께** 들어가야 한다.
- `heartbeat()` + `currentUserSnapshot()`가 membership을 각각 조회한다(요청당 2회).
  30명 규모에서는 무시할 수준이지만, 부하가 커지면 `heartbeat`가 snapshot을 직접 반환하도록
  Service에 메서드를 하나 두어 1회로 줄인다.

### L-2. `disconnectSession`에 소유자 대조 추가 (보안 갭)

```java
// heartbeat()에는 대조가 있다
if (!session.userId().equals(user.userId())) {
    throw new AccessDeniedException("WebSocket session does not belong to the authenticated user");
}

// disconnectSession()에는 없다 → REST에서는 남의 세션을 강제 종료시킬 수 있다
```

STOMP에서는 `sessionId`를 프레임워크가 넣어 줘서 드러나지 않던 문제다. REST로 열면 요청자가
값을 실어 보내므로 대조가 필요하다.

```java
public void disconnectSession(String sessionId, UUID requesterId) {
    ...
    Optional<SessionPresence> sessionPresence = findSession(sessionId);
    if (sessionPresence.isPresent()) {
        SessionPresence session = sessionPresence.get();
        // REST 경로에서는 요청자가 sessionId를 실어 보내므로 소유자 대조가 없으면
        // 남의 재실 세션을 강제로 종료시킬 수 있다. heartbeat()와 같은 규칙을 적용한다.
        // WebSocketPresenceEventListener는 requesterId를 null로 넘기므로 기존 동작은 유지된다.
        if (requesterId != null && !session.userId().equals(requesterId)) {
            throw new AccessDeniedException(
                    "Presence session does not belong to the authenticated user");
        }
        removeSession(sessionId, session.userId(), session.cohortId());
        return;
    }
    ...
}
```

`presenceSessionId`가 Browser에 노출되지 않는 설계(§2)가 1차 방어이고, 이 대조가 2차 방어다.
설계에 기대어 코드 방어를 생략하지 않는다.

### L-3. 세션 TTL 상향

| 항목 | 기존 | 변경 | 이유 |
| --- | --- | --- | --- |
| `REALTIME_PRESENCE_SESSION_TTL` | `60s` | **`120s`** | Chrome은 백그라운드 탭의 `setInterval`을 1분 이상으로 스로틀링한다. TTL 60초면 다른 탭을 보는 동안 OFFLINE으로 떨어진다 |

`.env.local`과 `.env.local.example` 양쪽을 갱신한다. 코드 변경은 없다.

**정책 판단이 필요한 지점:** "자리에 있지만 다른 탭을 보는 중"을 재실로 인정할 것인가.
인정한다면 120초, 인정하지 않는다면 60초를 유지한다. 이 문서는 **인정하는 쪽**을 전제로 한다.

### L-4. 테스트 추가

| 테스트 | 대상 |
| --- | --- |
| 최초 heartbeat가 세션을 등록하고 snapshot에 사용자가 나타난다 | `PresenceControllerTest` |
| 반복 heartbeat가 TTL을 연장한다 | `CohortPresenceServiceTest` |
| **남의 `presenceSessionId`로 leave를 호출하면 `403`** | `CohortPresenceServiceTest` |
| `X-Presence-Session` 헤더 누락 시 `400` | `PresenceControllerTest` |
| 승인 기수 없는 사용자의 heartbeat 거부 | `PresenceControllerTest` |

### Learning 완료 조건

- [ ] `POST /api/v1/cohorts/me/presence/heartbeat`가 snapshot을 반환한다.
- [ ] `DELETE /api/v1/cohorts/me/presence`가 `204`를 반환한다.
- [ ] `disconnectSession`에 소유자 대조가 있고 테스트가 이를 고정한다.
- [ ] `REALTIME_PRESENCE_SESSION_TTL`이 `120s`로 설정되어 있다.
- [ ] 기존 STOMP 경로(`WebSocketConfig`, 두 interceptor, 이벤트 리스너)를 **삭제하지 않았다.**
- [ ] Learning 전체 테스트가 통과한다.

---

## 4. Frontend(View) 작업

> View는 **stateless**를 유지한다. 커넥션 보유·스케줄러·SSE가 없다.

### 추가·변경할 파일

```text
src/main/java/site/omagotchi/frontend/presence/
├─ presentation/PresenceBffController.java      (변경) heartbeat·leave 라우트 추가
├─ application/PresenceSessionId.java           (신규) Session에 UUID 보관·조회
└─ infrastructure/PresenceHttpService.java      (신규) 하류 계약

src/main/resources/static/js/api.js             (변경) presence 어댑터 2개
src/main/resources/static/js/home/presence.js   (변경) subscribe → heartbeat 주기 호출
```

### F-1. `PresenceSessionId` — 신뢰 경계의 단일 지점

```java
/**
 * Presence 세션 식별자 확보의 단일 지점.
 *
 * <p>Browser는 이 값을 보지도 보내지도 않는다. View가 생성해 Spring Session에 보관하고
 * 하류 호출 헤더에만 싣는다. Browser 입력으로 받으면 남의 재실 세션을 조작할 수 있다.
 *
 * <p>같은 브라우저의 여러 탭은 같은 Session을 공유하므로 자연히 재실 1명으로 집계된다.
 * 로그아웃 시 Session이 무효화되어 이 값도 함께 사라진다.
 */
@Component
public class PresenceSessionId {

    private static final String SESSION_ATTRIBUTE = PresenceSessionId.class.getName();

    public String resolve(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new BusinessException(LearningBffErrorCode.SESSION_TOKEN_MISSING);
        }

        Object cached = session.getAttribute(SESSION_ATTRIBUTE);
        if (cached instanceof String presenceSessionId) {
            return presenceSessionId;
        }

        String presenceSessionId = UUID.randomUUID().toString();
        session.setAttribute(SESSION_ATTRIBUTE, presenceSessionId);
        return presenceSessionId;
    }
}
```

### F-2. `PresenceHttpService` — 하류 계약

```java
@HttpExchange("/api/v1")
public interface PresenceHttpService {

    @PostExchange("/cohorts/me/presence/heartbeat")
    JsonNode heartbeat(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
    );

    @DeleteExchange("/cohorts/me/presence")
    void leave(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
    );
}
```

`global/learning/infrastructure/LearningHttpServiceConfig`의 `types`에 추가한다.
`AttendanceHttpService`를 등록한 것과 같은 방식이다.

### F-3. BFF 라우트

```java
@PostMapping("/bff/v1/presence/heartbeat")
public JsonNode heartbeat(HttpServletRequest request) {
    String presenceSessionId = presenceSessionId.resolve(request);
    return proxy.execute(request, context -> context.service()
            .heartbeat(context.bearerToken(), presenceSessionId));
}

// sendBeacon이 아니라 fetch(keepalive)로 호출하므로 POST가 아니어도 되지만,
// 화면 의미상 "이탈 통지"이므로 POST로 통일한다.
@PostMapping("/bff/v1/presence/leave")
public ResponseEntity<Void> leave(HttpServletRequest request) { ... }
```

- `/bff/v1/**`는 `SecurityConfig`가 이미 `.authenticated()`로 잠근다. 인증 코드를 넣지 않는다.
- 기존 `GET /bff/v1/presence`(snapshot)는 그대로 둔다. 패널의 수동 새로고침이 쓴다.

### F-4. CSRF 함정 — `sendBeacon`을 쓰지 않는다

`/bff/v1/**`의 상태 변경 요청에는 CSRF 헤더가 필요하다. 그런데 **`navigator.sendBeacon`은
커스텀 헤더를 붙일 수 없어 CSRF 토큰을 실을 수 없다.**

```javascript
// 하지 않는다: CSRF 헤더를 못 붙여 403이 된다
window.addEventListener("pagehide", () => navigator.sendBeacon("/bff/v1/presence/leave"));

// 한다: keepalive는 페이지 언로드 중에도 전송되고 헤더를 붙일 수 있다
window.addEventListener("pagehide", () => {
    window.OmagotchiApi.presence.leave();   // 내부에서 fetch(..., {keepalive: true})
});
```

CSRF를 끄거나 이 경로만 예외로 여는 방식으로 우회하지 않는다.
`keepalive` 요청 본문은 64KB 제한이 있으나 이 요청은 본문이 없다.

**leave 호출이 실패해도 정확성은 유지된다.** heartbeat가 멈추면 최대 TTL(120초) 후 자동으로
OFFLINE이 된다. leave는 즉시성을 위한 최적화다.

### F-5. 화면 — heartbeat 주기 호출

`static/js/home/presence.js`의 `subscribeLabPresence` 호출부를 교체한다.

```javascript
const HEARTBEAT_INTERVAL_MS = 30_000;

function startHeartbeat() {
    const tick = async () => {
        try {
            applySnapshot(await api.sendPresenceHeartbeat());   // 응답이 곧 snapshot
        } catch {
            markRealtimeUnavailable();                          // 0명으로 표시하지 않는다
        }
    };
    tick();
    return window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
}
```

| 항목 | 값 | 이유 |
| --- | --- | --- |
| heartbeat 주기 | **30초** | TTL 120초의 1/4. 백그라운드 스로틀링(약 60초)이 걸려도 TTL 안에 들어온다 |
| 패널 상태와의 관계 | **패널이 닫혀 있어도 계속 보낸다** | heartbeat는 "내가 재실 중"을 알리는 것이므로 패널 표시 여부와 무관하다 |
| 기존 `refresh()` 버튼 | 유지 | 즉시 갱신용. `GET /bff/v1/presence`를 그대로 쓴다 |

`applySnapshot`의 상태 매핑(`ONLINE/AWAY/OFFLINE` → `present/away/offline`)은 변경하지 않는다.
응답 형태가 기존 snapshot과 같기 때문이다.

### F-6. 실패 표시 정책

**현재 화면은 빈 배열을 "0명"으로 표시한다. 이는 차단 상태를 정상 동작으로 위장하는 것이며
인계서 §6의 "동작하는 기능처럼 노출하지 않는다"를 어긴다.** F-6은 다른 단계와 독립이므로
Learning 작업 전에 먼저 반영해도 된다.

| 상황 | 화면 표시 | 하면 안 되는 것 |
| --- | --- | --- |
| heartbeat 실패 (Learning·Gateway 장애) | 인원 `—`, "실시간 재실 확인 불가" | `0명` 표시 |
| Learning Redis 장애 | 인원 `—`, "실시간 재실 확인 불가" | 마지막 값 계속 표시 |
| 승인 기수 없음 | "가입 기수 없음" (기존 동작) | heartbeat 시도 |
| **정상, 재실자 0명** | `0명` | — |

마지막 두 행이 핵심이다. **"진짜 0명"과 "연결 안 됨"을 화면에서 구분해야 한다.**

### Frontend 완료 조건

- [ ] `POST /bff/v1/presence/heartbeat`가 snapshot JSON을 반환한다.
- [ ] `presenceSessionId`가 Browser에 노출되지 않는다(개발자 도구 Network·Application 확인).
- [ ] heartbeat가 패널 상태와 무관하게 30초 주기로 나간다.
- [ ] 이탈 통지가 `sendBeacon`이 아니라 `fetch(keepalive)`로 나가고 CSRF 헤더가 붙는다.
- [ ] 같은 계정 탭 2개를 열어도 재실 인원이 1명이다.
- [ ] 연결 불가와 재실자 0명이 화면에서 구분된다.
- [ ] View에 STOMP client·SSE·스케줄러가 **없다**(stateless 유지).
- [ ] `./mvnw test`가 통과한다.

---

## 5. Gateway 작업

**없다.**

`/api/v1/cohorts/**`가 이미 `learning-service-route`에 있고, 새 엔드포인트가 그 아래
(`/api/v1/cohorts/me/presence/**`)에 들어가므로 Route 추가가 필요 없다.
`/ws` Route, WebSocket 통합 테스트, idle timeout 협의가 모두 불필요하다.

인계서 §4의 Gateway 담당자 요청 사항은 **이 결정으로 전부 철회한다.** 담당자에게 철회를
알린다(§10 체크리스트).

---

## 6. 순서와 의존성

```text
F-6 (화면 실패 표시)  ── 독립. 지금 바로 가능
        │
[선행] realtime 패키지 수정 권한 확인
        │
L-1 → L-2 → L-3 → L-4
        │
   [Gate] heartbeat REST가 curl로 200 + snapshot 반환
        │
F-1 → F-2 → F-3 → F-4 → F-5
        │
   최종 검증 (§7)
```

| 게이트 | 조건 | 통과 못 하면 |
| --- | --- | --- |
| **선행** | `realtime` 패키지를 직접 고칠 수 있다 | 부록 A(STOMP+SSE)로 되돌린다. 그 안은 Learning 변경이 0이다 |
| **Gate 1** | Learning heartbeat REST가 `200` + snapshot | Frontend를 만들어도 검증할 수 없다 |

**F-6만 게이트 밖에 있다.** Learning 작업과 무관하게 먼저 반영해 차단 상태를 정직하게 드러낸다.

### Gate 1 확인 명령

```bash
curl -i -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Presence-Session: $(uuidgen)" \
  http://localhost:8080/api/v1/cohorts/me/presence/heartbeat
```

`200`과 `{"cohortId":..., "users":[...], "generatedAt":...}`를 기대한다.

---

## 7. 최종 검증 시나리오

실행 순서: `Redis(6379) → Identity(8083) → Learning(8084) → Gateway(8080) → View(8082)`

| # | 절차 | 기대 결과 |
| --- | --- | --- |
| 1 | 계정 A 로그인 → Home | 30초 이내에 재실 목록에 A가 표시 |
| 2 | 계정 B를 다른 브라우저에서 로그인 | A 화면의 인원이 2명으로 증가 (최대 30초) |
| 3 | B가 탭을 닫음 | A 화면에서 B가 사라짐 (leave 성공 시 즉시, 실패해도 120초 이내) |
| 4 | B가 로그아웃 | Session 소멸로 heartbeat 중단 → 최대 120초 이내 사라짐 |
| 5 | A가 탭을 2개 열기 | 인원은 1명 유지 |
| 6 | A가 다른 탭으로 이동 후 3분 대기 | 여전히 재실로 표시 (TTL 120초 > 스로틀 주기 60초) |
| 7 | Learning 강제 종료 | "실시간 재실 확인 불가" 표시. `0명` 아님 |
| 8 | Learning 재기동 | 다음 heartbeat에서 자동 복구 |
| 9 | 개발자 도구 Network·Application 확인 | Access Token과 `presenceSessionId`가 **어디에도** 없음 |
| 10 | 다른 계정의 `presenceSessionId`를 추측해 leave 시도 | `403`. 값을 알 수 없으므로 애초에 시도 불가 |
| 11 | REST 회귀 (출결·기수·퀘스트·커뮤니티) | 이상 없음 |

---

## 8. 완료 판정 기준

인계서 §6을 이 결정에 맞게 갱신한 것이다.

1. Learning의 heartbeat·leave REST가 존재하고 테스트로 고정되어 있다.
2. `disconnectSession`에 소유자 대조가 있다.
3. Access Token과 `presenceSessionId`가 Browser 저장소·URL·로그에 노출되지 않는다.
4. Learning·View 전체 테스트가 통과한다.
5. 실제 Learning·Redis 환경에서 두 사용자의 등록·갱신·이탈을 확인했다.
6. Home 재실 목록에서 인원 증감이 실제로 표시된다.
7. **연결 불가와 재실자 0명이 화면에서 구분된다.**
8. 백그라운드 탭 3분 후에도 재실 상태가 유지된다.
9. View에 stateful 커넥션 관리 코드가 없다.
10. 최종 통합 SHA에서 REST 출결·기수·퀘스트 흐름에 회귀가 없다.

이 조건 전에는 Presence를 운영 범위에서 제외하거나 사용자에게 동작하는 기능처럼 노출하지 않는다.

---

## 9. 알려진 제약과 미결 사항

| # | 항목 | 현재 판단 |
| --- | --- | --- |
| 1 | **`realtime` 패키지 수정 권한** | 착수 전 확인 필요. 불가하면 부록 A로 되돌린다 |
| 2 | 실시간성이 즉시가 아니다 (최대 30초 지연) | 재실 현황에는 충분하다. 즉시성이 필요한 기능이 생기면 부록 A를 꺼낸다 |
| 3 | heartbeat 요청당 membership 조회 2회 | 30명 규모에서 무시 가능. 부하 증가 시 Service 메서드 1개로 합친다 |
| 4 | 백그라운드 탭 스로틀링 | TTL 120초 + heartbeat 30초로 흡수. "다른 탭 보는 중"을 재실로 인정하는 정책 전제 |
| 5 | 커뮤니티 실시간 알림 | 별건. `WebSocketSubscribeAuthorizationInterceptor`가 허용하는 destination은 presence topic과 `/user/queue/notifications` 둘뿐이다. 후자만 쓰면 Learning 변경이 없고, 전용 topic을 신설하면 구독 인가 규칙과 이벤트 발행이 모두 필요하다. **Presence 완료 후 착수** |
| 6 | Native App 전환 시 | 앱은 토큰을 안전하게 보관할 수 있으므로 앱 → Gateway 직결이 가능하다. REST heartbeat 방식은 그대로 재사용된다 |
| 7 | View 다중 인스턴스 | **제약 없음.** 상태를 View가 갖지 않으므로 어느 인스턴스가 받아도 동작이 같다 |

---

## 부록 A. 기각한 STOMP + SSE 설계

Presence에는 채택하지 않았으나 **채팅·실시간 알림처럼 진짜 push가 필요한 기능**이 생기면
이 설계를 다시 꺼낸다. Learning의 STOMP 자산이 그대로 남아 있으므로 재개 비용이 낮다.

### 구조

```text
Browser --[SSE + Session Cookie]--> View --[WebSocket + Bearer]--> Gateway --> Learning
```

### 핵심 제약과 해법

| 제약 | 해법 |
| --- | --- |
| Browser의 WebSocket API는 handshake에 `Authorization` 헤더를 붙일 수 없다 | 연결 주체를 Browser가 아니라 View 서버로 옮긴다. 서버는 헤더를 붙일 수 있다 |
| Learning은 STOMP CONNECT frame의 Bearer를 본다 | View가 **handshake 헤더와 CONNECT frame 양쪽**에 Bearer를 넣는다 |
| `StompHeaders`에는 `setBearerAuth()`가 없다 | `connectHeaders.set(HttpHeaders.AUTHORIZATION, bearerToken)` |
| Gateway는 `Authorization` 헤더 2개 이상을 거부한다 | handshake에 정확히 1개만 싣는다 |
| Gateway에 `/ws` Route가 없다 | `learning-service-websocket-route` 추가. `uri`는 `http://` 그대로 둔다 — `WebsocketRoutingFilter`(order `LOWEST_PRECEDENCE - 1`)가 `Upgrade: websocket`을 감지해 `http→ws`로 자동 변환한다 |

### 재개 시 필요한 작업

- Gateway: `/ws` Route 추가, 인증 없는 handshake `401` 회귀 테스트, idle timeout ≥ 90초 확인
- View: `spring-boot-starter-websocket`, STOMP client, SSE 엔드포인트, 연결 생명주기 8항목
  (SSE 종료·로그아웃·Session 만료·토큰 갱신·SSE 재연결 중복 방지·다중 탭·View 종료)
- Learning: 없음 (Presence 한정)

### 재개 시 반드시 알아야 할 것

`WebSocketConnectAuthenticationInterceptor`는 **CONNECT 시점에만** JWT를 검증한다.
`heartbeat()`도 cohort membership만 재검증하고 토큰 만료는 보지 않는다.
따라서 **View가 명시적으로 끊지 않으면 로그아웃해도 계속 ONLINE으로 남는다.**
Native App이 직접 붙는 순간에는 서버 측 방어가 필요해진다. Learning 담당자에게 공유할 사항이다.

---

## 10. 인계·공유 체크리스트

- [ ] Gateway 담당자에게 **`/ws` Route 요청 철회**를 알린다. (인계서 §4 전체)
- [ ] Learning `realtime` 패키지 담당자에게 L-1·L-2·L-3을 공유한다.
- [ ] `disconnectSession` 소유자 대조 누락은 **STOMP 경로에도 잠재된 갭**임을 함께 알린다.
- [ ] CONNECT 이후 JWT 재검증이 없다는 사실(부록 A)을 Learning 담당자에게 공유한다.
- [ ] 인계서(`gateway-presence-handoff-2026-08-24.md`) 상단에 "이 문서의 결론은
      `presence-realtime-implementation-plan.md`로 대체됨"을 명시한다.

---

## 11. 참고

| 목적 | 위치 |
| --- | --- |
| 차단 발견 경위 (결론은 이 문서로 대체) | [gateway-presence-handoff-2026-08-24.md](gateway-presence-handoff-2026-08-24.md) |
| 통합 검증 현황 | [e2e-validation-status-2026-08-24.md](e2e-validation-status-2026-08-24.md) |
| BFF 요청 흐름 원리 | [../onboarding/04-bff-request-flow.md](../onboarding/04-bff-request-flow.md) |
| 새 BFF 기능 연결 절차 | [../onboarding/07-bff-feature-quickstart.md](../onboarding/07-bff-feature-quickstart.md) |
| Presence Redis 상태 관리 | `learning: realtime/application/CohortPresenceService.java` |
| Presence TTL 정책 | `learning: realtime/application/PresenceProperties.java` |
| Session Token 추출 | `view: global/learning/application/LearningSessionAuthorization.java` |
| 승인 기수 신뢰 경계 | `view: global/learning/application/LearningCohortContext.java` |
| 화면 Presence 로직 | `view: static/js/home/presence.js` |
