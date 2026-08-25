# MCP 기반 AI 도우미 연동 Prompt

- 상태: 연동 전 보호 규칙 및 계약 초안
- 적용 대상: View BFF, AI Orchestrator, MCP Client·Server와 Tool 연동을 작업하는 사람과 AI Agent
- 선행 문서: [Backend Integration AI 공통 보호 규칙](공통-보호규칙.md)
- UI 문서: [Home AI 도우미 구현 Prompt](AI-도우미.md)

## 목적

Home AI 도우미가 MCP 도구를 안전하게 사용할 수 있도록 Browser, View BFF, AI Orchestrator와
MCP Server의 책임을 구분한다. 이 문서는 AI 창의 디자인을 정하지 않는다. 질문이 서버에
전달된 뒤 어떤 사용자 Context와 Tool을 사용할 수 있는지, 어떤 작업에 사용자 승인이
필요한지와 오류를 어디까지 공개할지를 규정한다.

MCP Server와 실제 Tool 계약이 확정되기 전에는 현재 `준비 중` UI를 실제 입력창으로
전환하지 않는다.

## 필수 요청 경계

```text
AiAssistantPanel
  → AI 전용 Browser adapter
  → View /bff/v1/ai/**
  → 인증·인가·입력·요청 크기 검증
  → AI Orchestrator 또는 MCP Client
  → allowlist에 등록된 MCP Server와 Tool
  → Domain Service
```

- Browser는 MCP Server, LLM Provider 또는 Domain Service를 직접 호출하지 않는다.
- Browser 코드에 MCP 인증키, Provider API Key와 내부 MCP 주소를 작성하지 않는다.
- React 컴포넌트에 `fetch`를 직접 추가하지 않고 AI 전용 adapter를 사용한다.
- Browser는 같은 Origin의 `/bff/v1/ai/**`만 호출한다.
- View BFF는 HttpOnly Session으로 현재 사용자를 확인하고 서버에서 권한을 판정한다.
- MCP Server가 Browser Cookie나 JWT 원문을 받게 하지 않는다.
- Domain API의 Version과 내부 Gateway Route를 Browser 응답 계약에 노출하지 않는다.

## 계층별 책임

### Browser와 React UI

- 사용자의 질문, 승인 또는 취소 의사만 전달한다.
- 답변·도구 실행·오류 상태를 서버 Event 계약에 따라 표시한다.
- Tool 이름이나 Domain Endpoint를 조합해 임의 요청하지 않는다.
- AI 응답을 출석, 타이머, 프로필과 기수의 최종 상태로 간주하지 않는다.

### View BFF

- 로그인 사용자, 권한, CSRF, 요청 크기와 입력 형식을 검증한다.
- Browser DTO를 내부 AI 요청 DTO로 변환한다.
- AI에 필요한 공개 가능 Field만 Context로 매핑한다.
- 4xx 공개 오류와 5xx 비공개 오류를 구분한다.
- 하류 5xx 원본 예외와 `requestId`는 서버 로그에 기록하고 Browser에는 일반 오류만 반환한다.
- 사용자가 승인한 쓰기 요청인지 서버에서 다시 검증한다.

### AI Orchestrator와 MCP Client

- 모델이 요청한 Tool이 allowlist에 있는지 확인한다.
- Tool Schema에 따라 인자를 검증하고 허용되지 않은 Field를 제거한다.
- 읽기 Tool과 쓰기 Tool의 실행 정책을 분리한다.
- Timeout, 취소, 재시도와 최대 Tool 호출 횟수를 제한한다.
- 모델 출력만으로 사용자의 승인 상태를 만들지 않는다.

### MCP Server와 Tool

- 하나의 Tool은 하나의 명확한 목적과 최소 권한을 가진다.
- Domain Service의 권한과 업무 규칙을 우회하지 않는다.
- Tool 성공 응답은 화면에 필요한 최소 Field만 반환한다.
- 내부 예외, SQL, Stack Trace, JWT와 개인 식별 정보를 결과에 포함하지 않는다.
- 상태 변경은 멱등성 또는 중복 요청 방지 방식을 계약에 명시한다.

## Tool 분류와 승인 규칙

| 분류 | 예시 | 실행 조건 |
| --- | --- | --- |
| 읽기 | 내 학습 기록 조회, 오늘 출석 상태 조회 | 로그인·조회 권한 확인 후 실행 |
| 제안 | 학습 계획 초안, 질문 예시 생성 | 사용자 데이터 변경 없이 결과만 표시 |
| 쓰기 | 타이머 종료, 닉네임 변경, 가입·탈퇴 | 실행 직전 명시적 사용자 승인 필수 |
| 금지 | 권한 변경, 임의 출석 생성, 관리자 기능 우회 | Tool로 등록하지 않음 |

- 쓰기 승인 화면에는 수행 작업, 대상, 변경되는 값과 취소 방법을 표시한다.
- 이전 메시지에서 받은 승인을 다음 요청에 재사용하지 않는다.
- 자연어만으로 승인 여부를 추측하지 않는다. 서버가 발급한 일회성 승인 ID와 대상 Tool·인자가 일치해야 한다.
- 출석 가능 여부, 기수 승인, 타이머 상태와 닉네임 정책은 각 Domain Service가 최종 판정한다.

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
- 대화 저장 여부, 보관 기간과 삭제 방식이 확정되기 전에는 대화를 영구 저장하지 않는다.
- 대화 내용을 `localStorage`나 `sessionStorage`에 Source of Truth로 저장하지 않는다.

## Prompt Injection과 출력 보호

- 사용자 입력, MCP Resource와 Tool 결과는 모두 신뢰할 수 없는 데이터로 취급한다.
- Resource 본문에 적힌 명령이 System 규칙, 권한 또는 allowlist를 변경하게 하지 않는다.
- 모델이 만들어 낸 Endpoint, Tool 이름과 인자를 검증 없이 실행하지 않는다.
- AI가 생성한 HTML을 `innerHTML` 또는 `dangerouslySetInnerHTML`로 직접 삽입하지 않는다.
- Markdown Link와 URL은 허용 Scheme을 검사하고 외부 이동임을 사용자에게 알린다.
- Tool 결과와 AI 설명을 시각적으로 구분해 사용자가 실제 실행 결과를 알아볼 수 있게 한다.

## 전송과 Stream Event 계약

SSE, WebSocket 또는 일반 HTTP 중 하나를 계약으로 확정한 뒤 구현한다. 전송 방식을
혼합하거나 Browser에서 임의로 fallback하지 않는다.

최소 Event 후보는 다음과 같다.

```text
message.accepted
answer.delta
answer.completed
tool.approval-required
tool.started
tool.completed
tool.failed
request.cancelled
error
```

- 모든 Event에는 `requestId`와 순서 판정을 위한 식별자를 둔다.
- `answer.delta`가 중복되거나 순서가 뒤바뀌었을 때의 처리 방식을 정한다.
- 패널을 닫았을 때 요청을 유지할지 취소할지 서버와 Browser가 동일한 정책을 사용한다.
- 재연결 시 이미 완료된 쓰기 Tool을 다시 실행하지 않는다.
- 전송 중복 방지, 최대 질문 크기, 최대 응답 크기와 Timeout을 서버에서 강제한다.

## 오류 공개 규칙

| 종류 | Browser 표시 | Server 처리 |
| --- | --- | --- |
| 입력 오류 | 공개 승인된 문구와 Field 오류 | 검증 실패 기록 |
| 인증·권한 오류 | 로그인 또는 권한 안내 | 사용자·요청 ID 기록 |
| Tool 업무 거절 | Domain이 승인한 공개 Code와 문구 | 원본 업무 Code 기록 |
| MCP·Provider·Domain 5xx | 일반 실패 문구와 `requestId` | 원본 예외와 하류 상태 기록 |
| Timeout·취소 | 다시 시도 또는 취소 완료 안내 | 실행 중 Tool 상태 확인 |

- 하류 `statusCode`, 기술적 `code`, 원문 `message`를 Browser에 그대로 전달하지 않는다.
- 실패한 쓰기 Tool을 성공처럼 설명하거나 화면 상태를 낙관적으로 변경하지 않는다.
- 재시도 가능한 오류와 재시도하면 안 되는 업무 거절을 구분한다.

## 구현 전 확정할 계약

다음 항목이 비어 있으면 실제 MCP 연결을 시작하지 않는다.

```text
Browser BFF Endpoint:
전송 방식: 일반 HTTP / SSE / WebSocket
질문 Request DTO:
Response·Stream Event DTO:
대화 ID와 requestId 생성 주체:
사용 가능한 모델 목록·기본 모델·사용자 선택 허용 범위:
AI Orchestrator 위치와 책임:
MCP Server 목록과 소유 서비스:
허용 Tool 이름·설명·Input·Output Schema:
읽기·쓰기 Tool 분류:
쓰기 Tool 승인 DTO와 만료 시간:
AI에 전달 가능한 Context Field:
대화 저장 여부·기간·삭제 방식:
요청·응답·Tool 결과 최대 크기:
Timeout·재시도·취소·중복 방지 정책:
공개 가능한 오류 Code:
감사 로그와 개인정보 마스킹 정책:
```

## 필수 테스트

- 인증되지 않은 Browser 요청이 MCP까지 전달되지 않는지 검사한다.
- 다른 사용자의 식별자를 요청에 넣어도 서버가 현재 사용자 기준으로 판정하는지 검사한다.
- allowlist에 없는 Tool과 Schema가 다른 인자를 거부하는지 검사한다.
- Prompt Injection 문구가 Tool allowlist와 승인 단계를 우회하지 못하는지 검사한다.
- 쓰기 Tool이 승인 없이 실행되지 않고 승인 ID를 재사용할 수 없는지 검사한다.
- 동일 요청 재전송 시 쓰기 작업이 중복 실행되지 않는지 검사한다.
- 4xx 공개 오류와 5xx 비공개 오류, Timeout과 취소를 각각 검사한다.
- Stream Event의 중복·역순·연결 종료를 처리하는지 검사한다.
- 민감 정보가 응답, Prompt, Tool 결과와 일반 로그에 나타나지 않는지 검사한다.

## 반드시 멈추고 질문할 조건

- MCP Server와 Tool Schema가 문서마다 다르다.
- Browser가 MCP 또는 LLM Provider를 직접 호출해야 한다는 요구가 들어온다.
- JWT, Session Cookie, 이메일 또는 내부 ID를 Prompt에 넣어야만 구현할 수 있다.
- 쓰기 Tool인데 사용자 승인 방식이나 중복 방지 정책이 없다.
- 대화 저장 위치, 보관 기간 또는 삭제 책임이 정해지지 않았다.
- Domain Service의 권한 판정을 View나 모델이 대신해야 한다.
- 하류 오류 원문을 사용자에게 공개해야 한다는 요구가 들어온다.

## 완료 보고

1. 연결한 Browser BFF·Orchestrator·MCP Server 경로
2. 사용한 Request·Response·Stream Event 계약
3. 등록한 Tool과 읽기·쓰기 분류
4. 사용자 승인과 중복 방지 방식
5. AI에 전달한 Context Field와 제외한 개인정보
6. 오류 공개·서버 로그·마스킹 정책
7. Timeout·재시도·취소와 재연결 정책
8. 실행한 보안·계약·UI Test 결과
9. 아직 Mock 또는 미확정으로 남은 부분
