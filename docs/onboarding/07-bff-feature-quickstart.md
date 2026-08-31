# 새 기능 BFF 연결 Quick Start

> 상태: 현재 구현 가이드
> 대상: Learning API를 Home·관리자 화면에 처음 연결하는 개발자
> 목표: `Browser → View BFF → Learning Service` 직접 연결을 같은 방식으로 구현한다.
> 소요: 계약이 확정되어 있으면 기능 1개당 30~60분.

이 문서는 "무엇을 하라"가 아니라 "어느 파일의 어느 줄에 무엇을 쓰고, 안 쓰면 무슨 증상이 나오는지"까지
적는다. 판단이 필요한 곳에는 판단 기준을 같이 둔다.

---

## 0. 30초 요약: 새 기능 1개 = 기본 파일 5개 + 조건부 공통 파일 1개

| # | 파일 | 하는 일 | 빠뜨리면 나오는 증상 |
| --- | --- | --- | --- |
| 1 | `src/main/java/site/omagotchi/frontend/{feature}/infrastructure/response/*.java` | 하류 응답 타입 | 응답이 `JsonNode`로 떠서 화면에서 필드 오타를 못 잡는다 |
| 2 | `src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningHttpService.java` | Learning으로 나가는 `/api/v1` 계약 | 컴파일은 되는데 하류가 `400`을 준다 |
| 3 | `src/main/java/site/omagotchi/frontend/{feature}/application/*BffService.java` | Session Token·승인 기수 결합 | `cohortId`를 Browser에서 받게 되어 다른 기수 조회가 뚫린다 |
| 4 | `src/main/java/site/omagotchi/frontend/{feature}/presentation/*BffController.java` | Browser용 `/bff/v1` 경로 | 화면에서 `404` |
| 5 | `src/main/resources/static/js/api.js` | Browser Adapter | 화면 파일마다 `fetch`가 복제된다 |
| 6 | `src/main/java/site/omagotchi/frontend/global/web/ApiExceptionHandler.java` | 공개 4xx 허용 목록 | **가장 많이 빠뜨린다.** 정상 업무 오류가 화면에 "연결된 서비스의 응답이 올바르지 않습니다"로 뜬다 |

6번은 "새 업무 오류를 화면에 보여줘야 할 때만" 필요하다. 나머지 5개는 항상 필요하다.

---

## 1. 먼저 이것만 기억한다

```text
화면 JavaScript
  └─ /bff/v1/** 호출
       └─ View의 *BffController
            └─ BFF Service
                 └─ LearningHttpService
                      └─ Learning Service의 /api/v1/**
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
BFF → Learning:   GET /api/v1/cohorts/{cohort-id}/attendance-records/me
```

### 이 경로들이 어디에 설정되어 있는지

새로 만들 필요가 없다. 이미 다음 위치에 고정되어 있다.

| 값 | 위치 | 현재 값 |
| --- | --- | --- |
| Browser Prefix `/bff/v1` | `src/main/java/site/omagotchi/frontend/global/web/BffApiPaths.java`의 `PREFIX` | `/bff/v1` |
| Browser Prefix (JS) | `src/main/resources/static/js/api.js`의 `API_BASE` | `/bff/v1` |
| 하류 Prefix `/api/v1` | `LearningHttpService`의 Type 레벨 `@HttpExchange` | `/api/v1` |
| Learning 주소 | `application.yaml` → `spring.http.serviceclient.learning-service.base-url` | `${LEARNING_SERVICE_BASE_URL}` (`.env.local`) |
| HTTP Client Timeout | `spring.http.clients.connect-timeout` / `read-timeout` | `${HTTP_CLIENT_CONNECT_TIMEOUT}` / `${HTTP_CLIENT_READ_TIMEOUT}` |

### `/bff/v1/**`의 인증은 이미 걸려 있다

`src/main/java/site/omagotchi/frontend/global/security/SecurityConfig.java`가 `/bff/v1/**` 전체를 `.authenticated()`로 잠근다.
따라서 새 Controller에 `@PreAuthorize`나 Session 검사 코드를 **추가하지 않는다.**
Session이 없으면 Controller에 도달하기 전에 `BffApiSecurityErrorHandler`가 JSON `401`을 만든다.

---

## 2. 연결 전에 받아야 할 API 계약

하류 담당자에게 다음 항목을 먼저 확인한다. 빈칸으로 두지 말고 값을 적어서 받는다.

```text
기능명:
HTTP Method와 /api/v1 경로:
Path·Query·Request Body:
  각 Query의 필수 여부(required=true/false):
  각 Query의 타입(String / Long / Enum이면 Enum 상수 목록):
성공 Status와 응답 JSON:
빈 결과: 200 + 빈 배열 / 204 / 404 중 무엇인지:
공개 가능한 4xx code와 message:
필요 권한:
승인 기수 필요 여부:
```

### 채워진 예시 (출석 이력)

```text
기능명: 내 출석 이력 조회
HTTP Method와 /api/v1 경로: GET /api/v1/cohorts/{cohort-id}/attendance-records/me
Path·Query·Request Body:
  path  cohortId : Long, 필수
  query from     : String(yyyy-MM-dd), 선택
  query to       : String(yyyy-MM-dd), 선택
  query page     : Integer, 선택(기본 0)
  query size     : Integer, 선택(기본 20)
  body           : 없음
성공 Status와 응답 JSON: 200 / { "items": [...], "page": { "page":0,"size":20,"totalElements":0,"totalPages":0 } }
빈 결과: 200 + items 빈 배열
공개 가능한 4xx code와 message:
  ATTENDANCE_RECORD_NOT_FOUND 404 "출석 기록을 찾을 수 없습니다."
  COHORT_ACCESS_DENIED        403 "해당 기수에 접근할 수 없습니다."
필요 권한: 로그인 사용자 본인
승인 기수 필요 여부: 필요 (ACTIVE membership)
```

이 항목이 정해지지 않았다면 임의의 필드명이나 임시 응답을 운영 계약처럼 만들지 않는다.
확정 전에 화면을 먼저 만들어야 한다면, 화면에서 로딩·빈 상태만 구현하고 BFF Route는 만들지 않는다.

---

## 3. 구현 방식부터 선택한다

### 판단표

| 질문 | 예 | 아니오 |
| --- | --- | --- |
| 하류를 2번 이상 호출하는가? | B | 다음 질문 |
| 응답의 필수 필드를 View가 검증해야 하는가? | B | 다음 질문 |
| 날짜·정렬·요약을 View가 계산하는가? | B | 다음 질문 |
| 빈 결과를 `204`로 바꾸는 등 응답 정책이 별도인가? | B | 다음 질문 |
| 여러 Controller가 같은 조합을 재사용하는가? | B | **A** |

### A. 단순 전달이면 공용 Proxy를 사용한다

`LearningProxyBffService`를 Controller에 바로 주입한다. **별도 Service 클래스를 만들지 않는다.**

현재 예: 캐릭터 목록, 일일 Quest, 진행도, 랭킹.

```java
@GetMapping("/characters")
public JsonNode getCharacters(HttpServletRequest request) {
    return proxy.execute(request, context -> context.service()
            .getCharacters(context.bearerToken()));
}
```

### B. 화면용 조합이 필요하면 기능별 Service를 만든다

`src/main/java/site/omagotchi/frontend/{feature}/application/`에 `XxxBffService`를 만들고 `LearningHttpService`,
`LearningGatewayCallExecutor`, `LearningCohortContext`를 직접 주입한다.

현재 예: `AttendanceBffService`(오늘 기록 1건 추출 + 4시 하루 경계 계산 + 빈 결과 `204`),
`ProfileBffService`.

Controller에 이 로직을 직접 쌓지 않는다. Controller는 입력을 받고 Service 결과를 반환하는
얇은 HTTP 입구로 유지한다.

### 헷갈릴 때의 기본값

애매하면 **A로 시작한다.** 조합 요구가 실제로 생겼을 때 B로 옮긴다.
쓰지 않을 Service 클래스를 미리 만들지 않는다.

---

## 4. 파일별 구현 순서

새 기능은 아래 순서로 연결한다. 순서를 바꾸면 컴파일이 계속 깨진다.

### 4.1 요청·응답 타입을 만든다

위치:

```text
src/main/java/site/omagotchi/frontend/{feature}/infrastructure/request/
src/main/java/site/omagotchi/frontend/{feature}/infrastructure/response/
```

- 계약이 확정된 핵심 응답은 `record` 등 명시적인 타입을 우선한다.
- 필드명은 하류 JSON key와 **철자까지 동일하게** 쓴다. 다르게 쓰려면 `@JsonProperty`를 명시한다.
- Page 응답은 이미 있는 `PageInfo`를 재사용한다. 새로 만들지 않는다.
- `JsonNode`는 계약이 자주 변하는 단순 Proxy에 제한적으로 사용한다.
- Browser에 필요 없는 내부 식별자·민감 정보는 응답 타입에 넣지 않는다.
- `@Valid`가 필요한 입력은 Request DTO에 Validation을 선언한다.

```java
public record AttendanceRecordPageResponse(
        List<AttendanceRecordResponse> items,
        PageInfo page
) {
}
```

`record`와 `JsonNode` 중 고르는 기준:

| 상황 | 선택 |
| --- | --- |
| 화면이 특정 필드를 읽어 계산·검증한다 | `record` |
| View가 그대로 흘려보내기만 한다 | `JsonNode` |
| 하류 계약이 아직 흔들린다 | `JsonNode`로 시작하고 확정되면 `record`로 바꾼다 |

### 4.2 `LearningHttpService`에 하류 계약을 선언한다

파일:

```text
src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningHttpService.java
```

이 Interface의 `@HttpExchange("/api/v1")`가 공통 Prefix다. Method에는 그 뒤의 Learning
경로를 선언한다.

```java
@GetExchange("/cohorts/{cohort-id}/attendance-records/me")
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
- Token은 첫 Parameter의 `Authorization` Header로 전달한다.
- `cohortId`가 권한 범위라면 Browser 입력을 그대로 신뢰하지 않는다.

#### 계약 대조는 눈으로 4가지를 본다

Learning의 Controller Signature를 열어 놓고 한 줄씩 비교한다. 실제로 어긋났던 항목들이다.

| 대조 항목 | 어긋나면 | 실제 사례 |
| --- | --- | --- |
| **경로 변수의 의미** | 존재하는 ID인데 `404`가 난다 | Quest 수령 경로가 Quest 정의 ID가 아니라 사용자별 일일 Quest 인스턴스 ID(`userDailyQuestId`)였다 |
| **`required` 여부** | View가 더 엄격해서 정상 요청을 View가 먼저 막는다 | `aggregationDate`는 Learning에서 선택인데 View가 필수로 선언했었다 |
| **Parameter 타입** | 잘못된 날짜가 Learning까지 갔다가 하류 `400`으로 돌아온다 | 기간별 Ranking 경로의 날짜를 `LocalDate`·`YearMonth`로 먼저 검증한다 |
| **선택 값의 기본값** | 화면이 기대한 개수와 다른 결과가 온다 | `maxRank`는 선택 값이므로 `required = false`로 두고 기본값은 하류에 맡긴다 |

원칙: **View는 하류가 허용하는 정상 요청을 막지 않으면서 경로 타입은 먼저 검증한다.**
Ranking처럼 하류가 `today/daily/weekly/monthly` 경로를 분리하면 View도 같은 경로 구조를
유지하고, 날짜·월 형식만 `LocalDate`·`YearMonth`로 검증한다.

### 4.3 BFF Service에서 Session과 승인 기수를 연결한다

호출 방식은 3가지뿐이고 선택 기준은 다음과 같다.

| 상황 | 사용할 것 |
| --- | --- |
| Token만 필요 + 단순 전달 | `proxy.execute(...)` |
| 승인 기수 필요 + 단순 전달 | `proxy.executeWithCohort(...)` |
| 기능별 Service 안 (A/B의 B) | `cohortContext.resolve(request)` + `callExecutor.execute(...)` |

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
사용한다. 승인 기수가 없으면 하류 호출 전에 `LEARNING_APPROVED_COHORT_REQUIRED`로 중단한다.

`LearningCohortContext`는 **하나의 BFF HTTP 요청 안에서만** Profile을 최대 1회 조회하고
Request Attribute에 캐시한다. Browser가 한 화면에서 승인 기수 기반 BFF API를 5개 호출하면
서로 다른 HTTP 요청 5개이므로 Profile 조회도 최대 5회 발생할 수 있다. 화면 전체의 왕복을 줄여야
한다면 집계 BFF Endpoint 또는 별도 서버 캐시를 설계한다. 같은 요청 안에서는 직접
`getMyProfile()`을 호출해 이 캐시를 우회하지 않는다.

#### 기능별 Service를 만들 때

하류 호출은 반드시 `LearningGatewayCallExecutor`로 감싼다.

```java
LearningCohortContext.Resolved context = cohortContext.resolve(request);
return callExecutor.execute(() -> learningHttpService.checkIn(
        context.bearerToken(),
        context.cohortId()
));
```

`callExecutor`를 빼면 하류 `409`가 `RestClientResponseException` 그대로 올라가
`ApiExceptionHandler`의 마지막 `Exception` 처리기에 걸려 **모두 `500`이 된다.**
"출석은 이미 했습니다" 같은 정상 업무 오류가 화면에서 서버 장애로 보인다.

`callExecutor`가 하는 변환:

| 하류 상황 | 변환 결과 |
| --- | --- |
| 연결 실패·Timeout (`ResourceAccessException`) | `COMMON_SERVICE_UNAVAILABLE` |
| 하류가 4xx·5xx 응답 (`RestClientResponseException`) | `LearningDownstreamException` (원문 code 보존) |
| Content-Type 이상·역직렬화 실패 | `COMMON_DOWNSTREAM_INVALID_RESPONSE` |

### 4.4 `*BffController`에 Browser 계약을 만든다

위치:

```text
src/main/java/site/omagotchi/frontend/{feature}/presentation/
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

#### 승인 기수는 경로에서 뺀다

```java
// 하지 않는다: Browser가 cohortId를 고를 수 있게 된다
@RequestMapping("/bff/v1/cohorts/{cohort-id}/study-rankings")

// 한다: cohortId는 Session에서 나온다
@RequestMapping("/bff/v1/study-rankings")
```

`RankingBffController`가 이 형태로 바뀐 이유다. BFF 경로에 `{cohort-id}`가 보이면 설계가 틀린 것이다.

#### 빈 결과를 `204`로 줄 때만 `ResponseEntity`를 쓴다

```java
@GetMapping("/today")
public ResponseEntity<AttendanceRecordResponse> getToday(HttpServletRequest request) {
    return attendanceBffService.getToday(request)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
}
```

그 외에는 반환 타입을 그대로 쓴다. 의미 없이 `ResponseEntity`로 감싸지 않는다.

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

- 여기의 경로는 `API_BASE=/bff/v1` 뒤에 붙는 Browser BFF 경로다. `/bff/v1`을 다시 쓰지 않는다.
- `fetch()`를 화면 파일마다 새로 만들지 말고 공통 `request()`를 사용한다.
- 공통 Adapter가 Session Cookie, JSON, CSRF, 오류 응답을 같은 방식으로 처리한다.
- `body`는 객체 그대로 넘긴다. `JSON.stringify`는 `request()`가 한다.
- `204`는 `null`로 반환되므로 화면에서 정상 빈 결과와 장애를 구분한다.

#### Query String은 `withQuery`를 쓴다

직접 문자열을 이어붙이면 `undefined`가 그대로 붙는다.

```javascript
// 하지 않는다
getTodayRankings: (maxRank) => request(`/study-rankings/today?maxRank=${maxRank}`)

// 한다: null·undefined·""는 자동으로 빠진다
getTodayRankings: ({maxRank} = {}) =>
    request(withQuery("/study-rankings/today", {maxRank}))
```

#### 파일 업로드는 `FormData`를 그대로 넘긴다

`request()`가 `FormData`를 감지하면 `Content-Type`을 붙이지 않는다(Boundary는 Browser가 만든다).
직접 `Content-Type: multipart/form-data`를 지정하지 않는다.

```javascript
create: (post, attachments) => request("/community/posts", {
    method: "POST",
    body: communityFormData(post, attachments)
})
```

#### 화면에서 호출하는 형태

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

`error`는 `ApiRequestError`이고 `status`, `code`, `path`, `requestId`를 가진다.
화면 분기는 `error.message` 문자열이 아니라 **`error.code`로** 한다.

화면은 최소한 `loading`, `empty`, `ready`, `error`를 구분한다. API 실패를 Mock이나
`localStorage` 값으로 덮어 정상처럼 표시하지 않는다.

### 4.6 새 업무 오류를 화면에 보여줘야 하면 허용 목록에 등록한다

**이 단계를 가장 많이 빠뜨린다.**

파일:

```text
src/main/java/site/omagotchi/frontend/global/web/ApiExceptionHandler.java
```

`PUBLIC_LEARNING_DOWNSTREAM_ERRORS`는 "하류 code + 하류 status"가 **둘 다** 일치할 때만
원문 code와 HTTP status를 Browser에 전달한다. 하류의 원문 `message`는 허용된 code라도
전달하지 않고, View가 status에 따라 정한 안전한 고정 문구로 바꾼다. 원문은 민감 정보를
제거한 서버 로그나 진단 정보에서만 확인한다.

```java
private static final Map<String, Integer> PUBLIC_LEARNING_DOWNSTREAM_ERRORS = Map.ofEntries(
        // ...
        Map.entry("DAILY_QUEST_ALREADY_CLAIMED", 409),   // ← 새 code를 이 형식으로 추가한다
        Map.entry("INVALID_CHARACTER_NICKNAME", 400)
);
```

등록하지 않으면 어떻게 되는가:

```text
Learning: 409 DAILY_QUEST_ALREADY_CLAIMED "이미 수령한 퀘스트입니다."
  → 허용 목록에 없음
  → 서버 로그에 "Learning 하류 오류 은닉" ERROR 기록
  → Browser는 COMMON_DOWNSTREAM_INVALID_RESPONSE "연결된 서비스의 응답이 올바르지 않습니다."
```

사용자는 정상 업무 상황인데 장애 메시지를 본다. 개발자는 코드가 아니라 네트워크를 의심하게 된다.

Status를 틀리게 적어도 같은 증상이 난다. `409`인데 `400`으로 등록하면 일치하지 않아 은닉된다.
등록 전에 하류의 실제 응답 Status를 반드시 확인한다.

등록해도 되는 것과 안 되는 것:

| 등록한다 | 등록하지 않는다 |
| --- | --- |
| 사용자가 행동을 바꿔 해결할 수 있는 4xx | 모든 5xx |
| 이미 수령함·중복 닉네임·기수 접근 거부 | 내부 ID·SQL·Stack Trace가 message에 섞인 code |
| 하류 담당자가 "공개해도 된다"고 확인한 code | 확인 안 된 code (임시로 열어두지 않는다) |

등록했으면 `ApiExceptionHandlerTest`에 통과 케이스 1개를 같이 추가한다.

---

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
- 공개가 승인된 하류 4xx code만 Browser에 전달한다(§4.6).
- 하류 5xx의 원문 code·message는 서버에 기록하고 Browser에는 일반 내부 오류만 보낸다.
- Controller에서 `error.message`를 그대로 응답하거나 `console.error`만 하고 성공처럼 끝내지
  않는다.

### View 자체 업무 오류가 필요할 때

하류 호출 전에 View가 판단해서 막아야 하는 경우(예: 승인 기수 없음)에는
`src/main/java/site/omagotchi/frontend/global/learning/application/LearningBffErrorCode.java`에 상수를 추가하고 `BusinessException`을 던진다.
`ErrorType`이 HTTP Status로 자동 변환되므로 Controller에서 Status를 직접 지정하지 않는다.

```java
throw new BusinessException(LearningBffErrorCode.APPROVED_COHORT_REQUIRED);
```

Browser가 받는 응답:

```json
{
  "code": "LEARNING_APPROVED_COHORT_REQUIRED",
  "message": "승인된 기수에 가입한 뒤 이용할 수 있습니다.",
  "path": "/bff/v1/attendance/today",
  "requestId": "..."
}
```

---

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

판단이 애매하면 이 질문을 한다.
**"이 값을 사용자가 개발자 도구에서 바꿔 보내면, 남의 데이터가 보이거나 남의 상태가 바뀌는가?"**
그렇다면 Browser에서 받지 않는다.

상태 변경 요청의 CSRF는 `api.js`가 `/bff/v1/csrf`에서 받아 처리한다. CSRF를 끄거나 Token을
HTML에 고정하여 우회하지 않는다. `request()`는 `403` 응답 중 오류 code가
`AUTH_CSRF_INVALID`인 경우에만 CSRF Token을 1회 다시 받아 재시도한다.
`COHORT_ACCESS_DENIED` 같은 업무상 권한 거부 `403`은 재시도하지 않고 즉시 호출자에게 전달한다.
화면에서는 별도 CSRF 재시도 코드를 만들지 않는다.

---

## 7. 최소 검증 항목

### 자동 검증

```bash
./mvnw test
```

새 계약에는 가능한 범위에서 다음 테스트를 추가한다.

| 검증 대상 | 참고 테스트 |
| --- | --- |
| 하류 계약 Signature 고정 | `src/test/java/site/omagotchi/frontend/global/learning/infrastructure/LearningHttpServiceContractTest.java` |
| 공개 4xx 전달·5xx 은닉 | `src/test/java/site/omagotchi/frontend/global/web/ApiExceptionHandlerTest.java` |
| Session 없음 `401`, CSRF `403` | `src/test/java/site/omagotchi/frontend/auth/presentation/AuthenticationSecurityMvcTest.java` |
| 하류 오류 변환 | `src/test/java/site/omagotchi/frontend/global/http/RestClientCallExecutorTest.java` |

최소한 다음은 확인한다.

- 정상 응답과 JSON 필드 Mapping
- 필수 Body·Query Validation 실패
- Session 없음 `401`
- 상태 변경 CSRF 실패 `403`
- 승인 기수 없음
- 공개 허용된 하류 `4xx` 전달
- 하류 `5xx` 원문 은닉과 일반 오류 변환
- 빈 응답과 잘못된 하류 응답

### 로컬 통합 확인

포트와 실행 순서:

```text
Redis(6379) → Identity(8083) → Learning(8084) → View(8082)
```

각 저장소에 `.env.local`이 있어야 한다(`.env.local.example` 복사). View에서 확인할 값:

```text
LEARNING_SERVICE_BASE_URL   Learning 주소. 여기가 틀리면 Learning BFF가 COMMON_SERVICE_UNAVAILABLE이 된다.
GATEWAY_SERVICE_BASE_URL    AI Chat이 후속 전환 전까지 사용하는 Gateway 주소다.
IDENTITY_SERVICE_BASE_URL   로그인 자체가 실패한다.
SESSION_REDIS_HOST/PORT     Session이 저장되지 않아 매 요청이 401이 된다.
HTTP_CLIENT_CONNECT_TIMEOUT / HTTP_CLIENT_READ_TIMEOUT
```

DB 없이 Testcontainers로 띄우려면 각 저장소의 `Test*Application`을 사용한다.

```bash
./mvnw spring-boot:test-run
```

Property 이름은 `spring-boot.run.main-class`(하이픈)다. `mainClass`(카멜)는 인식되지 않는다.
`pom.xml`에 넣을 때는 `<properties>`의 `<spring-boot.run.main-class>`에 넣는다.
Plugin `<configuration>`의 `<mainClass>`에 넣으면 운영 JAR의 Start-Class가
test scope 클래스로 바뀌어 배포가 깨진다.

Browser 개발자 도구의 Network에서 확인한다.

1. 요청이 `/bff/v1/**`로 나가는가?
2. 응답 Content-Type이 JSON인가?
3. 상태 변경 요청에 CSRF Header가 있는가?
4. Frontend 로그에 BFF Controller 도달 기록이 있는가?
5. Learning 로그에 같은 요청이 도달했는가?
6. 오류 응답에 하류 Stack Trace·내부 주소·기술 메시지가 노출되지 않는가?

---

## 8. 증상별 원인 찾기

막혔을 때 이 표부터 본다.

| 증상 | 먼저 의심할 것 | 확인 위치 |
| --- | --- | --- |
| 화면에서 `404` | BFF Route 미등록 또는 `api.js`에 `/bff/v1`을 중복으로 씀 | `*BffController`의 `@RequestMapping`, `api.js`의 경로 |
| 매 요청 `401` | Session 없음 또는 Redis 미기동 | Redis 연결, `SESSION_REDIS_*` |
| 상태 변경만 `403` | CSRF Header 누락. `fetch`를 직접 씀 | `api.js`의 `request()`를 쓰는지 |
| 정상 상황인데 "연결된 서비스의 응답이 올바르지 않습니다" | **`PUBLIC_LEARNING_DOWNSTREAM_ERRORS` 미등록** | 서버 로그의 `Learning 하류 오류 은닉` |
| 업무 오류가 전부 `500` | `LearningGatewayCallExecutor`를 안 거침 | BFF Service의 하류 호출부 |
| `COMMON_SERVICE_UNAVAILABLE` | Learning 미기동 또는 `LEARNING_SERVICE_BASE_URL` 오타 | `.env.local` |
| `LEARNING_APPROVED_COHORT_REQUIRED` | 계정에 승인된 기수가 없음. 코드 문제가 아님 | 기수 가입 승인 |
| 하류가 `400`인데 값은 맞아 보임 | `required`·타입 불일치 | §4.2 계약 대조표 |
| 존재하는 ID인데 `404` | 경로 변수의 의미가 다름(정의 ID vs 인스턴스 ID) | 하류 Controller Signature |
| 화면이 계속 로딩 | `catch`에서 상태 전환을 안 함 | 화면 JS의 `catch` 블록 |

---

## 9. PR 전 체크리스트

- [ ] Learning의 현재 API 계약을 확인했다.
- [ ] `required`·타입·경로 변수 의미를 하류 Signature와 1:1로 대조했다.
- [ ] Browser는 `/bff/v1/**`만 호출한다.
- [ ] `LearningHttpService`에 `/api/v1/**` 하류 계약을 선언했다.
- [ ] 단순 전달과 화면용 조합 중 알맞은 Service 방식을 선택했다.
- [ ] 모든 하류 호출을 `LearningGatewayCallExecutor` 경계로 통과시켰다.
- [ ] Token·userId·승인 cohortId를 Browser 입력으로 받지 않는다.
- [ ] BFF 경로에 `{cohort-id}`가 없다.
- [ ] 새 공개 4xx code를 `PUBLIC_LEARNING_DOWNSTREAM_ERRORS`에 등록했다(필요한 경우).
- [ ] `api.js` 공통 `request()`를 사용한다.
- [ ] Loading·Empty·Ready·Error 화면을 구분했다.
- [ ] 화면 분기를 `error.message`가 아니라 `error.code`로 한다.
- [ ] 4xx 공개와 5xx 은닉을 검증했다.
- [ ] 상태 변경 CSRF와 Session 만료를 검증했다.
- [ ] `./mvnw test`를 통과했다.

---

## 10. 현재 코드에서 볼 예시

| 목적 | 참고 파일 |
| --- | --- |
| 단순 Proxy와 승인 기수 분기 | `src/main/java/site/omagotchi/frontend/global/learning/application/LearningProxyBffService.java` |
| 화면용 날짜·빈 결과 조합 | `src/main/java/site/omagotchi/frontend/attendance/application/AttendanceBffService.java` |
| Browser BFF Route | `src/main/java/site/omagotchi/frontend/attendance/presentation/AttendanceBffController.java` |
| 승인 기수를 경로에서 제거한 Route | `src/main/java/site/omagotchi/frontend/ranking/presentation/RankingBffController.java` |
| Study Record·Timer Route | `src/main/java/site/omagotchi/frontend/study/presentation/` |
| 내부 Learning HTTP 계약 | `src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningHttpService.java` |
| HTTP Interface 등록 | `src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningHttpServiceConfig.java` |
| 하류 호출 오류 변환 | `src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningGatewayCallExecutor.java` |
| 하류 오류 보존 타입 | `src/main/java/site/omagotchi/frontend/global/learning/infrastructure/LearningDownstreamException.java` |
| Session Token 추출 | `src/main/java/site/omagotchi/frontend/global/learning/application/LearningSessionAuthorization.java` |
| 승인 기수의 신뢰 경계 | `src/main/java/site/omagotchi/frontend/global/learning/application/LearningCohortContext.java` |
| View 자체 업무 오류 | `src/main/java/site/omagotchi/frontend/global/learning/application/LearningBffErrorCode.java` |
| Browser 공통 Adapter | `src/main/resources/static/js/api.js` |
| BFF JSON 오류 응답·공개 허용 목록 | `src/main/java/site/omagotchi/frontend/global/web/ApiExceptionHandler.java` |
| BFF Prefix 상수 | `src/main/java/site/omagotchi/frontend/global/web/BffApiPaths.java` |
| `/bff/v1/**` 인증·CSRF 설정 | `src/main/java/site/omagotchi/frontend/global/security/SecurityConfig.java` |

더 자세한 원리와 전체 요청 흐름은
[BFF 실제 요청 흐름](04-bff-request-flow.md), Spring 선언형 HTTP Client의 역할은
[BFF와 Learning HTTP Interface 경계](06-bff-http-interface-boundary.md)를 참고한다.
