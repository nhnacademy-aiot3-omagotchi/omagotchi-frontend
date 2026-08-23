# 새 기능 BFF 연결 Quick Start

> 상태: 현재 구현 가이드  
> 대상: Learning API를 Home·관리자 화면에 처음 연결하는 개발자  
> 목표: `Browser → View BFF → Gateway → Learning Service` 연결을 같은 방식으로 구현한다.

## 1. 먼저 이것만 기억한다

```text
화면 JavaScript
  └─ /bff/v1/** 호출
       └─ View의 *BffController
            └─ BFF Service
                 └─ LearningHttpService
                      └─ Gateway의 /api/v1/**
                           └─ Learning Service
```

- Browser는 Gateway·Learning 주소를 직접 호출하지 않는다.
- Browser는 Access Token을 읽거나 `Authorization` Header를 만들지 않는다.
- View BFF가 Redis Session의 Token을 내부 요청에만 전달한다.
- 화면용 주소는 `/bff/v1/**`, 하류 주소는 `LearningHttpService`의 `/api/v1/**`다.
- 최종 업무 권한은 Learning Service가 다시 검증한다.

예를 들어 출석 이력 하나에도 서로 다른 세 경로가 존재한다.

```text
화면:             /home
Browser → BFF:    GET /bff/v1/attendance/history
BFF → Gateway:    GET /api/v1/cohorts/{cohortId}/attendance-records/me
```

## 2. 연결 전에 받아야 할 API 계약

하류 담당자에게 다음 항목을 먼저 확인한다.

```text
기능명:
HTTP Method와 /api/v1 경로:
Path·Query·Request Body:
성공 Status와 응답 JSON:
빈 결과: 200 + 빈 배열 / 204 / 404 중 무엇인지:
공개 가능한 4xx code와 message:
필요 권한:
승인 기수 필요 여부:
```

이 항목이 정해지지 않았다면 임의의 필드명이나 임시 응답을 운영 계약처럼 만들지 않는다.

## 3. 구현 방식부터 선택한다

### A. 단순 전달이면 공용 Proxy를 사용한다

다음 조건이면 `LearningProxyBffService`를 사용한다.

- 하류 호출 한 번으로 화면 응답이 완성된다.
- View에서 응답을 합치거나 계산할 필요가 없다.
- 별도 필수값 검증이 필요 없다.

현재 예: 캐릭터 목록, 일일 Quest, 진행도.

```java
@GetMapping("/characters")
public JsonNode getCharacters(HttpServletRequest request) {
    return proxy.execute(request, context -> context.service()
            .getCharacters(context.bearerToken()));
}
```

### B. 화면용 조합이 필요하면 기능별 Service를 만든다

다음 중 하나라도 해당하면 `AttendanceBffService` 같은 기능별 Service를 둔다.

- 하류 API를 두 번 이상 호출한다.
- 응답의 필수 필드를 검증해야 한다.
- 화면에 맞춘 날짜·정렬·요약 계산이 필요하다.
- `204 No Content` 같은 별도 응답 정책이 필요하다.
- 여러 Controller가 같은 화면용 조합을 재사용한다.

Controller에 이 로직을 직접 쌓지 않는다. Controller는 입력을 받고 Service 결과를 반환하는
얇은 HTTP 입구로 유지한다.

## 4. 파일별 구현 순서

새 기능은 아래 순서로 연결한다.

### 4.1 요청·응답 타입을 만든다

위치:

```text
src/main/java/site/omagotchi/frontend/learning/infrastructure/request/
src/main/java/site/omagotchi/frontend/learning/infrastructure/response/
```

- 계약이 확정된 핵심 응답은 `record` 등 명시적인 타입을 우선한다.
- `JsonNode`는 계약이 자주 변하는 단순 Proxy에 제한적으로 사용한다.
- Browser에 필요 없는 내부 식별자·민감 정보는 응답 타입에 넣지 않는다.
- `@Valid`가 필요한 입력은 Request DTO에 Validation을 선언한다.

### 4.2 `LearningHttpService`에 하류 계약을 선언한다

파일:

```text
src/main/java/site/omagotchi/frontend/learning/infrastructure/LearningHttpService.java
```

이 Interface의 `@HttpExchange("/api/v1")`가 공통 Prefix다. Method에는 그 뒤의 Learning
경로를 선언한다.

```java
@GetExchange("/cohorts/{cohortId}/attendance-records/me")
AttendanceRecordPageResponse getMyAttendanceRecords(
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
        @PathVariable Long cohortId,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size
);
```

주의:

- Browser용 `/bff/v1` 경로를 여기에 쓰지 않는다.
- Learning의 Method·경로·Body·응답 타입과 정확히 맞춘다.
- Token은 첫 Parameter의 `Authorization` Header로 전달한다.
- `cohortId`가 권한 범위라면 Browser 입력을 그대로 신뢰하지 않는다.

### 4.3 BFF Service에서 Session과 승인 기수를 연결한다

#### Token만 필요한 기능

```java
return proxy.execute(request, context -> context.service()
        .getCharacters(context.bearerToken()));
```

#### 승인 기수가 필요한 기능

```java
return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
        .getProgression(
                context.bearerToken(),
                cohortId,
                aggregationDate == null ? null : aggregationDate.toString()
        ));
```

`executeWithCohort`는 Browser가 보낸 ID가 아니라 Session Token 기반 Profile의 승인 기수를
사용한다. 승인 기수가 없으면 하류 호출 전에 중단한다.

기능별 Service를 만들 때도 하류 호출은 반드시 `LearningGatewayCallExecutor`로 감싼다.

```java
LearningCohortContext.Resolved context = cohortContext.resolve(request);
return callExecutor.execute(() -> learningHttpService.checkIn(
        context.bearerToken(),
        context.cohortId()
));
```

### 4.4 `*BffController`에 Browser 계약을 만든다

위치:

```text
src/main/java/site/omagotchi/frontend/learning/presentation/
```

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/example")
public class ExampleBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/summary")
    public JsonNode getSummary(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getExampleSummary(context.bearerToken()));
    }
}
```

- BFF 경로는 화면 용어로 짧고 안정적으로 만든다.
- `Authorization`, `userId`, 승인 `cohortId`를 Browser Parameter로 받지 않는다.
- Controller에서 하류 예외를 `catch`하여 임의 문자열로 바꾸지 않는다.
- 상태 변경은 `POST`·`PATCH`·`PUT`·`DELETE` 중 실제 의미와 맞는 Method를 사용한다.

### 4.5 `api.js`에 Browser Adapter를 추가한다

파일:

```text
src/main/resources/static/js/api.js
```

```javascript
window.OmagotchiApi = {
    // ...
    example: {
        getSummary: () => request("/example/summary"),
        update: (payload) => request("/example", {
            method: "PATCH",
            body: payload
        })
    }
};
```

- 여기의 경로는 `API_BASE=/bff/v1` 뒤에 붙는 Browser BFF 경로다.
- `fetch()`를 화면 파일마다 새로 만들지 말고 공통 `request()`를 사용한다.
- 공통 Adapter가 Session Cookie, JSON, CSRF, 오류 응답을 같은 방식으로 처리한다.
- `204`는 `null`로 반환되므로 화면에서 정상 빈 결과와 장애를 구분한다.

화면에서는 다음처럼 호출한다.

```javascript
try {
    setUiState("loading");
    const summary = await window.OmagotchiApi.example.getSummary();
    renderSummary(summary);
    setUiState(summary ? "ready" : "empty");
} catch (error) {
    renderError(error.code, error.message);
    setUiState("error");
}
```

화면은 최소한 `loading`, `empty`, `ready`, `error`를 구분한다. API 실패를 Mock이나
`localStorage` 값으로 덮어 정상처럼 표시하지 않는다.

## 5. 오류 처리는 새로 만들지 말고 공통 경계를 사용한다

```text
Learning HTTP 실패
  → LearningGatewayCallExecutor
  → LearningDownstreamException 또는 공통 BusinessException
  → ApiExceptionHandler
  → Browser용 ApiErrorResponse
```

- 연결 실패는 서비스 사용 불가 오류로 변환된다.
- 잘못된 Content-Type·응답 역직렬화 실패는 하류 계약 오류로 변환된다.
- 공개가 승인된 하류 4xx code만 Browser에 전달한다.
- 하류 5xx의 원문 code·message는 서버에 기록하고 Browser에는 일반 내부 오류만 보낸다.
- Controller에서 `error.message`를 그대로 응답하거나 `console.error`만 하고 성공처럼 끝내지
  않는다.

새로운 업무 오류를 Browser에 공개해야 한다면 임의 통과시키지 말고 공개 허용 목록과 HTTP
Mapping, 테스트를 함께 갱신한다.

## 6. 보안 규칙

### Browser가 보내도 되는 값

- 검색어, 기간, Page 번호
- 사용자가 작성한 게시글 내용
- 사용자가 실제로 선택할 수 있는 공개 Resource ID

### Browser에서 받으면 안 되는 신뢰 값

- Access·Refresh Token
- 현재 사용자 `userId`
- 승인된 기수의 `cohortId`
- 관리자 여부·역할
- 서버가 계산해야 하는 XP·출석 상태·권한 결과

상태 변경 요청의 CSRF는 `api.js`가 `/bff/v1/csrf`에서 받아 처리한다. CSRF를 끄거나 Token을
HTML에 고정하여 우회하지 않는다.

## 7. 최소 검증 항목

### 자동 검증

```bash
./mvnw test
```

새 계약에는 가능한 범위에서 다음 테스트를 추가한다.

- 정상 응답과 JSON 필드 Mapping
- 필수 Body·Query Validation 실패
- Session 없음 `401`
- 상태 변경 CSRF 실패 `403`
- 승인 기수 없음
- 공개 허용된 하류 `4xx` 전달
- 하류 `5xx` 원문 은닉과 일반 오류 변환
- 빈 응답과 잘못된 하류 응답

### 로컬 통합 확인

실행 순서:

```text
Redis → Identity → Learning → Gateway → Frontend
```

Browser 개발자 도구의 Network에서 확인한다.

1. 요청이 `/bff/v1/**`로 나가는가?
2. 응답 Content-Type이 JSON인가?
3. 상태 변경 요청에 CSRF Header가 있는가?
4. Frontend 로그에 BFF Controller 도달 기록이 있는가?
5. Gateway와 Learning 로그에 같은 요청이 도달했는가?
6. 오류 응답에 하류 Stack Trace·내부 주소·기술 메시지가 노출되지 않는가?

## 8. PR 전 체크리스트

- [ ] Learning의 현재 API 계약을 확인했다.
- [ ] Browser는 `/bff/v1/**`만 호출한다.
- [ ] `LearningHttpService`에 `/api/v1/**` 하류 계약을 선언했다.
- [ ] 단순 전달과 화면용 조합 중 알맞은 Service 방식을 선택했다.
- [ ] 모든 하류 호출을 `LearningGatewayCallExecutor` 경계로 통과시켰다.
- [ ] Token·userId·승인 cohortId를 Browser 입력으로 받지 않는다.
- [ ] `api.js` 공통 `request()`를 사용한다.
- [ ] Loading·Empty·Ready·Error 화면을 구분했다.
- [ ] 4xx 공개와 5xx 은닉을 검증했다.
- [ ] 상태 변경 CSRF와 Session 만료를 검증했다.
- [ ] `./mvnw test`를 통과했다.

## 9. 현재 코드에서 볼 예시

| 목적 | 참고 파일 |
| --- | --- |
| 단순 Proxy와 승인 기수 분기 | `learning/application/LearningProxyBffService.java` |
| 화면용 날짜·빈 결과 조합 | `learning/application/AttendanceBffService.java` |
| Browser BFF Route | `learning/presentation/AttendanceBffController.java` |
| 내부 Gateway HTTP 계약 | `learning/infrastructure/LearningHttpService.java` |
| 하류 호출 오류 변환 | `learning/infrastructure/LearningGatewayCallExecutor.java` |
| Session Token 추출 | `learning/application/LearningSessionAuthorization.java` |
| 승인 기수의 신뢰 경계 | `learning/application/LearningCohortContext.java` |
| Browser 공통 Adapter | `static/js/api.js` |
| BFF JSON 오류 응답 | `global/web/ApiExceptionHandler.java` |

더 자세한 원리와 전체 요청 흐름은
[BFF 실제 요청 흐름](04-bff-request-flow.md), Spring 선언형 HTTP Client의 역할은
[BFF와 Learning HTTP Interface 경계](06-bff-http-interface-boundary.md)를 참고한다.
