# AI 도우미 메신저 레이아웃·모델 선택 리팩토링 기록

- 상태: 작업 기록

## 목적

`AiAssistantPanel`의 캐릭터 아바타 표시 방식을 메신저 형식(카카오톡·디스코드처럼
assistant 말풍선마다 프로필처럼 붙는 형태)으로 바꾸고, 그동안 비활성화 상태였던 모델
선택(Gemini/Ollama)을 실제로 동작하게 만든다. 여기에 딸려 있던 Enter 전송, 자동
스크롤, 대화 목록 구조 변경까지 같은 작업 범위로 묶는다.

## 문제

- 캐릭터 아바타가 `home-ai-character-reply`라는 별도 블록으로 대화 목록 맨 위에
  고정돼 있었다. 말풍선은 그 아래로 텍스트만 계속 쌓였고, 아바타는 하나뿐이라 "캐릭터가
  말하는" 느낌이 약했다.
- 모델 선택 버튼(`<button disabled>`)이 "연결 후 선택"이라는 고정 문구만 보여주고
  실제로는 아무 것도 하지 않았다. 백엔드(`learning-service`)는 이미 `model` 파라미터를
  받을 수 있었지만, View BFF(`AiBffController`, `AiChatGatewayClient`)가 그 파라미터를
  아예 안 받고 있어서 중간에 끊겨 있었다.
- Enter로 메시지를 보낼 수 없었다 (`<textarea>`는 Enter가 기본적으로 줄바꿈이라 폼
  제출을 안 시킨다).
- 대화가 패널 높이를 넘어가도 자동으로 스크롤되지 않았다.

## 구현 방향

### 메신저형 아바타 레이아웃

- `home-ai-character-reply`(고정 블록)를 제거하고, `messages.map()` 안에서 assistant
  메시지마다 `home-ai-message-row` + `home-ai-message-avatar`를 렌더링하도록 바꿨다.
- 아바타 부유 애니메이션(`is-active`)은 **가장 최근 assistant 답변**(또는 질문 전
  기본 안내 문구)에만 준다. 스트리밍 여부와 무관하게 "최신 답변인가"로 판단한다 —
  스트리밍 중에만 애니메이션을 주면 평소(대기 상태)에 캐릭터가 계속 정지해 있는
  회귀가 생기기 때문이다. 과거로 스크롤된 답변들은 정지 상태로 둬서 여러 아바타가
  동시에 움직여 산만해지는 것을 막는다.
- 사용자 메시지는 아바타 없이 `home-ai-message-row.is-user`로 오른쪽 정렬한다.

### 모델 선택 활성화

- `<button disabled>` → `<select>` (값: `GEMINI`/`OLLAMA`, 대문자 — `learning-service`의
  `ChatModelType`이 대소문자를 구분한다).
- `aiAssistantClient.js`의 `streamAiChat(question, { signal, model })`에 `model`
  파라미터 추가, 기본값 `"GEMINI"`.
- `AiBffController.chat()`에 `@RequestParam(defaultValue = "GEMINI") String model`
  추가, 검증 없이 `AiChatGatewayClient.streamChat()`으로 그대로 전달한다 (검증은
  `learning-service`가 이미 하므로 중복하지 않는다).
- `AiChatGatewayClient.streamChat(bearerToken, question, model)`에 `model`을
  쿼리파라미터로 추가.

### Enter 전송

- `textarea`에 `onKeyDown` 추가: `Enter && !shiftKey && !isComposing`이면
  `preventDefault()` 후 `handleSubmit()` 호출. Shift+Enter는 줄바꿈으로 남긴다.
- `!event.nativeEvent.isComposing` 체크가 핵심이다 — 한글은 자모 조합 중 Enter로
  음절을 확정하는데, 이 체크가 없으면 조합 중 확정 키 입력이 메시지 전송으로
  오인된다.

### 자동 스크롤

- 첫 구현은 `messages`/`status`가 바뀔 때마다 무조건 `scrollTop = scrollHeight`로
  내렸는데, 이러면 사용자가 과거 답변을 읽으려고 위로 스크롤해도 새 청크가 올 때마다
  강제로 끌려 내려갔다.
- 이를 고치려고 "이미 맨 아래 근처일 때만 따라 내려간다"는 조건을 넣었는데, 처음
  버전은 `scrollHeight`(이펙트 시점에 이미 새 내용이 반영된 값)와 `scrollTop`(갱신
  전 위치)을 비교해서 "예전 위치가 새로 커진 바닥에서 얼마나 먼가"를 재는 꼴이 됐다.
  맨 아래에 완벽히 있었어도 새 답변이 80px보다 크면(문단 하나면 쉽게 넘음) 매번
  "멀다"고 오판해 전혀 안 내려가는 회귀가 생겼다.
- 최종 구현: `onScroll` 이벤트로 "지금 맨 아래 근처인가"를 별도 `stickToBottomRef`에
  실시간으로 기록해두고, `messages`/`status` 변경 이펙트는 콘텐츠가 바뀌기 **전**
  시점의 그 값만 본다.

## 지킨 계약

- `data-home-character`, `data-character-name` 관찰 방식(캐릭터 Source of Truth)은
  그대로 유지했다.
- `AiAssistantPanel`의 props(`open`, `setOpen`, `characterImage`, `characterName`)는
  바뀌지 않았다.
- `home-chat-toggle` 등 기존 Dock 호환용 CSS 훅 이름은 건드리지 않았다.

## 발견한 것 — AiBffController 응답 인코딩

`AiBffControllerTest`를 `standaloneSetup`(Spring Boot 자동설정 없음)으로 짜다가, SSE
응답에서 한글이 `?`로 깨지는 것을 바이트 단위로 확인했다. `produces`에
`;charset=UTF-8`을 붙이는 것만으로는 해결되지 않았고, `response.setCharacterEncoding
("UTF-8")`을 컨트롤러에서 직접 호출해야 했다.

다만 같은 진단을 `learning-service`의 `ChatControllerTest`(`@WebMvcTest`, Spring
Boot 자동설정 포함)로 해보면 한글이 깨지지 않는다. 즉 이건 `standaloneSetup`이
Spring Boot의 기본 인코딩 필터(`HttpEncodingAutoConfiguration`)를 안 붙여서 생긴
테스트 환경의 한계일 가능성이 높고, 실제 운영 서버(내장 톰캣)에서도 같은 문제가
있었는지는 확정하지 못했다. 다만 고치는 비용이 거의 없고 명시적으로 안전한 방식이라
`AiBffController`에는 반영해서 유지했다. `learning-service` 쪽은 이미 정상 동작이
확인됐으므로 같은 수정을 퍼뜨리지 않았다.

## 검증 기준

- Storybook `Home/AiAssistantPanel`의 `Preparing`, `Desktop`, `Mobile`에서 메신저형
  아바타 배치, 모델 드롭다운, Enter 전송(한글 조합 포함), 자동 스크롤(맨 아래 근처일
  때만 따라 내려가는지, 위로 스크롤한 상태에서 안 끌려 내려가는지)을 확인했다.
- `AiBffControllerTest`(신규, 7개) — question/model 전달, model 기본값, Bearer 토큰
  조합, question 누락 400, 세션 없을 때 예외 전파, 응답 UTF-8 인코딩, 청크 순서 보존.
- Java 전체 테스트(192개) 회귀 없음 확인.
- JSX/CSS 문법은 esbuild로, Java는 `mvn compile`/`mvn test`로 각각 확인했다 (이
  세션에서는 이 저장소에 Node.js가 새로 설치된 상태라 `npm run storybook` 실행
  자체도 처음 확인한 것이었다).

## 완료한 것

- `npx vite build`로 `home-app.js` 번들을 다시 만들어 실제 `/home` 페이지에 반영했다.
- `homeBootstrap.js`의 `home-app.js` 임포트 캐시 무효화 쿼리스트링과, `home.html`이
  `homeBootstrap.js` 자체를 가리키는 쿼리스트링을 둘 다 빌드 날짜(`?v=20260827-1`)로
  갱신했다. `homeBootstrap.js` 내용이 바뀌면 그걸 가리키는 참조도 같이 올리는 게 이
  저장소의 기존 관행이다.
- `omagotchi-gateway-service`의 `/api/v1/chat` 라우팅 PR이 머지됐다.

## 다음 작업

- 게이트웨이 라우팅이 머지됐으니, 실제 `/home` 페이지에서 브라우저 → Frontend BFF →
  게이트웨이 → `learning-service`까지 전 구간이 끝까지 동작하는지 아직 확인 못 했다.
  이번 세션에서 검증한 건 각 구간을 개별적으로(Storybook, 스탠드얼론 하니스, MockMvc)
  본 것뿐이라, 실제 왕복 자체는 처음 확인하는 것이다.
- Ollama 모델 선택은 배선은 됐지만 실제 응답을 받아본 적이 없다 (응답이 느려서 이
  세션에서도 검증하지 못함).