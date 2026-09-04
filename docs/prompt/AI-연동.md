# AI 도우미 연동 Prompt

- 상태: 연동 완료 (날씨 + 학습 계열 Tool 여섯 개, 운영 확인됨), 계약 확장 시 보호 규칙
- 적용 대상: View BFF와 `learning-service`(ChatClient·Tool) 연동을 작업하는 사람과 AI Agent
- 선행 문서: [Backend Integration AI 공통 보호 규칙](공통-보호규칙.md)
- UI 문서: [Home AI 도우미 구현 Prompt](AI-도우미.md)

## 목적

Home AI 도우미가 `learning-service`의 Tool을 안전하게 사용할 수 있도록 Browser, View
BFF와 `learning-service`의 책임을 구분한다. 이 문서는 AI 창의 디자인을 정하지 않는다.
질문이 서버에 전달된 뒤 어떤 사용자 Context와 Tool을 사용할 수 있는지, 어떤 작업에
사용자 승인이 필요한지와 오류를 어디까지 공개할지를 규정한다.

Tool을 별도로 배포하거나 중계하는 서버는 존재하지 않는다. `learning-service` 하나가
Spring AI `ChatClient`로 Gemini 또는 Ollama를 호출하고, 같은 프로세스 안의 `@Tool` 메서드(로컬
함수 호출)를 직접 실행한다. Tool을 배포하거나 등록하는 별도 인프라는 없다 — 새 Tool은
`learning-service`의 해당 feature 패키지에 `@Tool` 메서드를 추가하고
`AiToolProvider` 마커 인터페이스를 구현하면 자동으로 `ChatClient`에 등록된다.

## 필수 요청 경계

```text
AiAssistantPanel (React)
  → aiAssistantClient.js (fetch + ReadableStream, AI 전용 adapter)
  → View /bff/v1/ai/chat (AiBffController)
  → 세션 인증 확인 (LearningSessionAuthorization)
  → AiChatBffService
  → LearningAiChatClient (WebClient 기반 HTTP Service Client, SSE 스트리밍)
     ※ Discovery(lb://learning-service) 직접 호출. Gateway를 거치지 않는다
     ※ 이 그룹만 읽기 타임아웃 30초 (전역 5초와 분리)
  → learning-service ChatController (/api/v1/chat, JWT 인증)
  → ChatClient.prompt().stream() (Spring AI, Gemini 또는 Ollama 호출 + Tool 실행)
```

- Browser는 `learning-service`, LLM Provider(Gemini) 또는 다른 Domain Service를 직접 호출하지 않는다.
- Browser 코드에 Gemini API Key와 `learning-service`의 내부 주소를 작성하지 않는다.
- React 컴포넌트에 `fetch`를 직접 추가하지 않고 AI 전용 adapter(`aiAssistantClient.js`)를 사용한다.
- Browser는 같은 Origin의 `/bff/v1/ai/**`만 호출한다.
- View BFF는 세션(`LearningSessionAuthorization`)으로 현재 사용자를 확인하고, JWT를
  `learning-service`로 전달해 서버가 다시 권한을 판정하게 한다.
- `learning-service`가 Browser Cookie 원문을 받게 하지 않는다 (BFF가 세션에서 꺼낸
  JWT Bearer Token만 전달한다).
- Domain API의 Version과 내부 게이트웨이 Route를 Browser 응답 계약에 노출하지 않는다.

## 계층별 책임

### Browser와 React UI

- 사용자의 질문 전달과 답변 표시만 담당한다.
- 답변·오류 상태를 서버 Stream 계약에 따라 표시한다.
- Tool 이름이나 Domain Endpoint를 조합해 임의 요청하지 않는다 (애초에 Browser는 Tool의
  존재를 알 필요가 없다 — Tool 선택은 전적으로 `learning-service`의 `ChatClient`가
  한다).
- AI 응답을 출석, 타이머, 프로필과 기수의 최종 상태로 간주하지 않는다.

### View BFF (`omagotchi-frontend`)

- 로그인 사용자, CSRF, 요청 크기와 입력 형식을 검증한다.
- 세션에서 꺼낸 JWT를 `Authorization` Header로 `learning-service`에 전달한다.
- 4xx 공개 오류와 5xx 비공개 오류를 구분한다.
- 하류 5xx 원본 예외는 서버 로그(`LearningAiChatClient`의 `doOnError`)에 기록하고
  Browser에는 일반 오류만 반환한다. 단, 스트리밍 응답 특성상 이미 데이터 일부가 전송된
  뒤 하류가 실패하면 상태 코드를 바꿔 보낼 수 없다 — 이 경우 연결이 그대로 끊기는 것이
  정상이며, Browser는 이를 일반 오류로 처리한다 (고쳐야 할 결함이 아니다).
- 현재 등록된 Tool은 전부 읽기 전용이라 쓰기 승인 재검증 로직은 아직 없다. 쓰기 Tool이
  추가되면 이 문서의 `Tool 분류와 승인 규칙`을 먼저 채운 뒤 구현한다.

### `learning-service` (ChatClient + Tool)

- `ChatController`가 JWT에서 사용자를 확인하고 `ChatClient.prompt().stream()`을 호출한다.
- 모델(Gemini)이 어떤 `@Tool`을 호출할지는 Spring AI가 판단한다 — Browser나 BFF가 Tool
  선택에 관여하지 않는다.
- 하나의 Tool은 하나의 명확한 목적과 최소 권한을 가진다 (예: `WeatherTools.getWeather`는
  지역명으로 날씨만 조회하고 다른 어떤 것도 하지 않는다).
- Domain Service의 권한과 업무 규칙을 우회하지 않는다. 기존 도메인 로직(출석, 랭킹 등)을
  Tool로 노출할 때는 새로 검증 로직을 만들지 않고 그 도메인이 이미 가진 서비스를 그대로
  재사용한다.
- Tool 성공 응답은 화면에 필요한 최소 Field만 반환한다.
- 내부 예외, SQL, Stack Trace, JWT와 개인 식별 정보를 Tool 결과에 포함하지 않는다.
- **`ToolContext` 배선은 구현되어 있다.** `ChatController`가
  `ChatClient.prompt().toolContext(Map.of("userId", ...))`로 JWT에서 꺼낸 `userId`를
  Tool에 전달하며, 학습 계열 Tool이 이 통로를 쓴다. 이 값은 LLM에게 보이는 Tool 스키마에
  포함되지 않는 서버 전용 통로다.
- LLM이 `@ToolParam`으로 `userId`나 `cohortId`를 직접 받게 해서는 안 된다 (다른 사용자
  사칭 위험). LLM이 채우는 인자(`periodDays` 등)도 서버가 범위를 검증하고 미지정이면
  기본값을 확정한다 — 모델이 보낸 값을 그대로 조회 조건으로 쓰지 않는다
  (`docs` 저장소 ADR `ai-assistant/0010`).

## Tool 분류와 승인 규칙

| 분류 | 예시 | 실행 조건 |
| --- | --- | --- |
| 읽기 | 날씨 조회, 학습 시간 요약, 학습 패턴, 상위권 비교, 학습 리포트, 현재 공간 환경 (여섯 개 모두 구현됨) | 로그인·조회 권한 확인 후 실행 |
| 제안 | 학습 계획 초안, 질문 예시 생성 | 사용자 데이터 변경 없이 결과만 표시 |
| 쓰기 | 타이머 종료, 닉네임 변경, 가입·탈퇴 | 실행 직전 명시적 사용자 승인 필수 |
| 금지 | 권한 변경, 임의 출석 생성, 관리자 기능 우회 | Tool로 등록하지 않음 |

등록된 Tool 여섯 개는 전부 읽기 분류다. 아래 승인 규칙은 **쓰기 Tool을 처음
추가할 때부터 적용**한다.

Tool별 상세 계약(전제조건, 기간 파라미터, 상태값, 지표 정의, 익명성 임계값, 환경
데이터의 개인정보 경계)은 `docs` 저장소의
`10-specifications/11-ai-assistant/03-학습-코칭-Tool-계약.md`가 소유한다. 이 문서에서
다시 정의하지 않는다.

- 쓰기 승인 화면에는 수행 작업, 대상, 변경되는 값과 취소 방법을 표시한다.
- 이전 메시지에서 받은 승인을 다음 요청에 재사용하지 않는다.
- 자연어만으로 승인 여부를 추측하지 않는다. 서버가 발급한 일회성 승인 ID와 대상 Tool·인자가 일치해야 한다.
- 출석 가능 여부, 기수 승인, 타이머 상태와 닉네임 정책은 각 Domain Service가 최종 판정한다.

기수 scoped 데이터를 다루는 Tool은 `CohortAccessService`(또는 해당 기능이 이미 갖고
있는 기수 권한 검증)를 반드시 거쳐야 한다. Tool이 `cohortId`를 LLM이나 Browser로부터
직접 받지 않고, 인증된 `userId`로 서버가 활성 기수를 직접 조회하게 한다 —
현재 학습 계열 Tool은 모두 `CohortAccessService.requireCurrentActiveMembership(userId)`를
거친다.

## 사용자 Context와 개인정보

기본 Context에는 기능 수행에 필요한 최소 정보만 포함한다.

### 기본적으로 허용 가능한 정보

- 화면에 이미 공개된 표시용 닉네임
- 사용자가 현재 보고 있는 기능 이름
- 서버가 공개 가능하다고 매핑한 학습·출석 요약
- Locale, Timezone처럼 응답 형식에 필요한 값

### 기본적으로 제외할 정보

- JWT, Session Cookie와 인증 Header 원문
- 이메일, 전화번호와 내부 사용자 UUID
- 기수 가입 내부 식별자와 관리자 전용 정보
- 운영 로그, Stack Trace와 하류 서비스 주소
- 다른 사용자의 원본 Profile과 Presence 정보

- 다른 사용자 검색이 필요하면 서버가 권한에 맞게 검색한 표시용 결과만 사용한다.
- Prompt와 Tool 인자를 서버 로그에 남길 때에도 민감 Field는 마스킹한다.
- 사용자의 질문 원문(`question`)은 자유 텍스트라 민감 정보가 섞일 수 있어
  `learning-service`가 `INFO`에 남기지 않는다. `DEBUG`로만 남기며, 로컬(`application-local.yaml`)
  에서만 켜서 확인한다. 이 스택에는 별도 액세스 로그나 프록시가 없어 질문이 기록되는
  지점은 이 `DEBUG` 한 줄뿐이다 (`ChatController` 참고).
- 대화는 **Redis**에 TTL 1시간으로 보관한다(키 `omagotchi:chat:memory:{userId}`).
  `learning-service`가 여러 인스턴스로 뜨므로 프로세스 메모리(과거 Caffeine)가 아니라
  인스턴스 밖 공용 저장소를 쓴다. DB나 외부 저장소에 영구 저장하지 않는다
  (`docs` 저장소 ADR `ai-assistant/0012`).
- 보관 대상에는 **Tool이 반환한 값**도 포함된다. 학습 계열 Tool을 쓴 대화라면 본인 학습
  통계와 기수 상위권 익명 집계가 최대 1시간 동안 Redis에 남는다.
- **정상적으로 끝난 턴만 저장된다.** 호출이 실패하면 그 턴은 통째로 남지 않는다 — 답 없는
  질문이 남으면 다음 턴에서 모델이 그것까지 마저 답해 버리기 때문이다
  (`docs` 저장소 ADR `ai-assistant/0013`).
- 대화 내용을 `localStorage`나 `sessionStorage`에 Source of Truth로 저장하지 않는다.

## Prompt Injection과 출력 보호

- 사용자 입력과 Tool 결과는 모두 신뢰할 수 없는 데이터로 취급한다.
- Tool 결과에 적힌 내용이 System 규칙이나 권한을 변경하게 하지 않는다.
- 모델이 만들어 낸 Endpoint, Tool 이름과 인자를 검증 없이 실행하지 않는다 (Spring AI가
  Tool 존재 여부와 Schema를 자체적으로 검증하지만, 새 Tool을 만들 때 인자 검증을
  생략하지 않는다).
- AI가 생성한 HTML을 `innerHTML` 또는 `dangerouslySetInnerHTML`로 직접 삽입하지 않는다
  (현재 `AiAssistantPanel`은 React의 기본 텍스트 렌더링만 사용하며, 이 규칙을 지키고 있다).
- **마크다운을 렌더링하지 않는다.** 답변은 평문으로 표시하므로 모델이 만든 문자열이
  링크·HTML로 해석되는 경로 자체가 없다(`docs` 저장소 ADR `ai-assistant/0015`).
  마크다운 렌더러나 링크 자동 변환을 도입하려면 그 순간 **허용 Scheme 검사와 외부 이동
  안내를 먼저 갖춰야 한다** — 지금 그 규칙이 없는 것은 대상이 없기 때문이지 면제가
  아니다.
- Tool 결과와 AI 설명을 시각적으로 구분해 사용자가 실제 실행 결과를 알아볼 수 있게 한다.

## 전송과 Stream 계약

전송 방식은 **GET + SSE(`text/event-stream`)로 확정**되어 있다 (`learning-service`의
`ChatController`가 `Flux<String>`을 `produces = text/event-stream`으로 반환). 질문은
쿼리파라미터 `question`, 사용할 모델은 `model`(`GEMINI` 또는 `OLLAMA`, 생략 시 기본값
`GEMINI`)로 전달한다. `model` 값은 대소문자를 구분한다 — `learning-service`의
`ChatModelType` enum이 소문자를 받으면 400을 반환한다. View BFF는 `model` 값을
검증하지 않고 그대로 통과시킨다 (검증은 `learning-service`가 이미 한다).

Stream은 구조화된 Event(예: `answer.delta`, `tool.started`)를 쓰지 않는다.
`data:` 프레임 하나하나가 그대로 답변 텍스트 조각이며, 완료를 알리는 별도 Event도
없다 — 서버가 스트림을 닫으면 그게 끝이다.

- SSE 프레임 안에 개행이 포함되면 `data:` 줄이 여러 개로 나뉘어 온다. Browser 쪽
  파서(`aiAssistantClient.js`)는 이를 전부 모아 원래 줄바꿈으로 복원해야 한다 (한 줄만
  읽으면 개행 이후 내용이 소실된다 — 실제로 있었던 버그). 답변의 줄바꿈을 화면에서
  살리는 것은 CSS `white-space: pre-wrap`이 맡는다 — 파서가 복원해도 CSS가 없으면
  문단이 붙어 보인다. 둘은 짝이다.
- 파서는 `\n\n`으로 프레임을 자르고 **마지막 조각은 버퍼에 남긴다.** 스트림이 끝날 때
  남은 버퍼는 흘려보내지 않으므로, 서버가 항상 `\n\n`으로 프레임을 닫는다는 데 의존한다
  (Spring의 SSE 인코딩이 그렇게 한다). 서버 쪽 응답 방식을 바꾸면 이 가정을 먼저
  확인한다.
- `EventSource`는 이 계약과 맞지 않는다. `EventSource`는 연결이 끊기면 원인과 무관하게
  자동 재연결을 시도하는데, 서버가 "완료" 신호 없이 그냥 스트림을 닫기 때문에 같은
  질문이 자동으로 재전송되는 문제가 생긴다. 그래서 Browser는 `fetch` +
  `ReadableStream`으로 직접 스트림을 읽는다. 이 전송 방식을 다른 방식(`EventSource`,
  WebSocket)으로 바꾸려면 `learning-service`의 완료 신호 계약부터 먼저 정의해야 한다.
- **진행 중에는 새 질문을 받지 않는다.** `handleSubmit`이 `submitting`·`streaming`
  상태에서 곧바로 반환하므로 요청이 겹치지 않는다 — "새 질문이 이전 요청을 취소한다"가
  아니라 애초에 전송이 잠긴다. 중단 버튼이 생기면 이 규칙을 다시 정해야 한다.
- `AbortController`로 취소하는 경우는 두 가지다: **패널을 닫을 때**와 **컴포넌트가
  언마운트될 때**. 취소는 `AbortError`로 도착하며, 이때는 오류 문구를 띄우지 않는다
  (사용자가 스스로 닫은 것이므로).
- 최대 질문 크기는 `learning-service`의 `ChatController`가 `@Size(max = 1000)`으로
  제한한다. 응답 크기 제한과 **서버 측** 응답 시간 상한은 아직 없다.
- **읽기 타임아웃은 AI 채팅만 따로 잡는다.** 모델 1차 호출 → Tool 실행 → 모델 2차 호출을
  거쳐야 첫 글자가 나오므로 그동안 읽히는 바이트가 없고, 전역 5초로는 응답이 시작되기
  전에 끊긴다(실제 운영 장애의 원인이었다). `AiChatHttpServiceConfig`가 이 그룹의
  WebClient에만 30초를 건다(`AI_CHAT_READ_TIMEOUT`).
  - **커넥터를 빈으로 노출하지 않는다.** `ClientHttpConnector` 타입 빈이 있으면 Boot의
    전역 커넥터가 물러나고 그것이 **모든** WebClient에 적용된다 — identity 등 다른
    호출까지 30초가 된다.
  - **적용 순서가 0보다 뒤여야 한다.** Boot이 order 0에서 전역 커넥터를 다시 걸기
    때문이다. `spring.http.serviceclient.<group>.read-timeout` 프로퍼티가 듣지 않는
    이유도 같다(그쪽은 order `Integer.MIN_VALUE`).
  - 이 값들은 "응답 완료 시한"이 아니라 **읽기 사이의 유휴 한도**다. 상한 체인과 근거는
    `docs` 저장소 `11-ai-assistant/01-AI-채팅-API-계약.md` §4.1이 소유한다.

## 오류 공개 규칙

| 종류 | Browser 표시 | Server 처리 |
| --- | --- | --- |
| 입력 오류 | 공개 승인된 문구와 Field 오류 | 검증 실패 기록 |
| 인증·권한 오류 | 로그인 또는 권한 안내 | 사용자·요청 ID 기록 |
| `learning-service`·Gemini 5xx | 일반 실패 문구 | 원본 예외와 하류 상태 기록 (`LearningAiChatClient`의 `doOnError`) |
| 스트리밍 중 연결 끊김 | 일반 실패 문구, 재전송 유도 | 에러 로그 기록. 이미 전송이 시작된 뒤라 상태 코드는 바꿀 수 없다 |

- 하류 `statusCode`, 기술적 `code`, 원문 `message`를 Browser에 그대로 전달하지 않는다.
- 스트리밍 응답은 시작된 뒤에는 상태 코드를 바꿀 수 없다는 HTTP의 근본 제약을 그대로
  받아들인다 — 이를 우회하려는 시도(예: 응답을 전부 버퍼링한 뒤 한 번에 보내기)는
  스트리밍의 이점을 없애므로 하지 않는다.

## 연동 전 확정할 계약

새 Tool을 추가하거나 쓰기 작업을 처음 도입할 때는 다음 항목을 먼저 정한다.

```text
새 Tool이 속할 backend feature 패키지:
Tool의 읽기·제안·쓰기 분류:
쓰기라면 승인 DTO와 만료 시간:
사용자 식별자를 Tool에 전달하는 방식 (ToolContext):
기수 scoped 데이터라면 기수 검증 경로:
AI에 전달 가능한 Context Field:
공개 가능한 오류 Code:
감사 로그와 개인정보 마스킹 정책:
```

## 필수 테스트

- 인증되지 않은 Browser 요청이 `learning-service`까지 전달되지 않는지 검사한다.
- 다른 사용자의 식별자를 요청에 넣어도 서버가 현재 사용자 기준으로 판정하는지 검사한다.
- Prompt Injection 문구가 향후 추가될 승인 단계를 우회하지 못하는지 검사한다.
- 쓰기 Tool이 추가되면: 승인 없이 실행되지 않고 승인 ID를 재사용할 수 없는지, 동일 요청
  재전송 시 중복 실행되지 않는지 검사한다.
- 4xx 공개 오류와 5xx 비공개 오류를 각각 검사한다.
- SSE 프레임 안에 개행이 포함된 응답이 소실 없이 재조립되는지 검사한다.
- 민감 정보가 응답, Prompt, Tool 결과와 일반 로그에 나타나지 않는지 검사한다.

## 반드시 멈추고 질문할 조건

- Browser가 `learning-service` 또는 LLM Provider를 직접 호출해야 한다는 요구가 들어온다.
- JWT, Session Cookie, 이메일 또는 내부 ID를 Prompt에 넣어야만 구현할 수 있다.
- 쓰기 Tool인데 사용자 승인 방식이나 중복 방지 정책이 없다.
- 기수 scoped 데이터를 다루는 Tool인데 `ToolContext`로 사용자 식별자를 전달하지 않고
  LLM이 채운 인자로 대상을 특정하려 한다.
- Domain Service의 권한 판정을 View나 모델이 대신해야 한다.
- 하류 오류 원문을 사용자에게 공개해야 한다는 요구가 들어온다.

## 완료 보고

1. 연결한 Browser BFF·`learning-service` 경로
2. 사용한 Request·Response·Stream 계약
3. 등록한 Tool과 읽기·쓰기 분류
4. 사용자 승인과 중복 방지 방식 (해당하는 경우)
5. AI에 전달한 Context Field와 제외한 개인정보
6. 오류 공개·서버 로그·마스킹 정책
7. Timeout·재시도·취소 정책
8. 실행한 보안·계약·UI Test 결과
9. 아직 Mock 또는 미확정으로 남은 부분
