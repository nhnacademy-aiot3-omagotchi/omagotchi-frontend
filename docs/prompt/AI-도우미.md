# Home AI 도우미 구현 Prompt

- 상태: 연결 전 구현 규칙
- 적용 대상: Home 하단 AI 도우미 UI를 작업하는 사람과 AI Agent
- 선행 문서: [Backend Integration AI 공통 보호 규칙](공통-보호규칙.md)
- MCP 연동 문서: [MCP 기반 AI 도우미 연동 Prompt](MCP-연동.md)

## 목적

실시간 채팅이 사용하던 Home 하단 자리를 MCP 기반 AI 도우미로 전환한다. 현재 구현은
창의 위치, 열림·닫힘과 `준비 중` 상태만 제공한다. 실제 질문 전송, 답변 생성, 도구 실행과
대화 저장은 아직 구현하지 않는다.

이 문서의 규칙은 기존 Home UI를 보호하고 AI 도우미의 화면 상태와 접근성 계약을 정한다.
MCP Server, Tool, 권한, 개인정보와 Stream 계약은 별도 MCP 연동 문서를 따른다.

## 현재 구현 기준선

```text
src/main/frontend/home-react/components/AiAssistantPanel.jsx
src/main/frontend/home-react/components/AiAssistantPanel.stories.jsx
src/main/frontend/home-react/components/ActionDock.jsx
src/main/frontend/home-react/components/HomeStage.jsx
src/main/resources/static/css/home/ui/character-chat.css
src/main/resources/static/css/home/home-quick-panels.css
src/main/resources/static/js/home.js
```

- Home 하단 버튼에는 기존 `commu.png` 픽셀 에셋과 `AI` 라벨을 사용한다.
- `AiAssistantPanel`은 최종 배치 검증을 위한 입력창, 모델 선택 자리와 전송 버튼을 표시하지만
  MCP 연결 전에는 모두 비활성화한다.
- 답변 영역은 Home의 `data-home-character`와 `data-character-name`을 관찰해 현재 선택 캐릭터를
  그대로 표시한다. 별도의 기본 캐릭터 경로를 Source of Truth로 만들지 않는다.
- 준비·생각 중 상태는 현재 캐릭터의 부유 애니메이션과 말풍선 안의 움직이는 점 3개로 표현한다.
- AI 메시지 패널은 데스크톱에서 화면 오른쪽 Drawer, 모바일에서 안전 여백을 둔 전체폭 Drawer로 표시한다.
- `home-chat-toggle` CSS 이름은 기존 하단 Dock 호환을 위해 버튼에만 내부 훅으로 남아 있다.
- 사용자에게 보이는 문구, 접근성 이름과 Storybook 이름에는 `채팅`을 사용하지 않는다.
- `omagotchi:home-ai-close` 이벤트로 BGM, 출석부, 재실 인원, Home 오버레이와 상호 배타적으로 닫힌다.

호환용 `home-chat-*` 클래스 이름만 보고 실시간 채팅 기능이 남아 있다고 판단하거나 관련
GLOBAL·COHORT 탭과 메시지 입력창을 복원하지 않는다. 클래스 이름 정리는 Home 하단 반응형
레이아웃을 별도로 검증하는 리팩터링에서만 수행한다.

## 제품 범위

### 현재 단계에서 허용

- AI 도우미 버튼과 준비 화면의 PC·모바일 표시
- Dock 버튼으로 열기·닫기, 오른쪽 스와이프로 닫기와 다른 Home 패널 간 닫힘 동작
- Loading, Ready, Empty, Error, Offline 같은 화면 상태의 Storybook 설계
- 아직 연결되지 않았음을 정확히 알리는 문구

### MCP 계약 확정 후 구현

- 질문 입력과 전송
- 답변 스트리밍, 중단과 다시 시도
- 허용된 도구 목록과 도구 실행 결과 표시
- 사용자 확인이 필요한 작업의 승인 Dialog
- 대화 이력 조회·삭제 정책

### 별도 승인 없이는 구현 금지

- 실시간 사용자 간 채팅 또는 GLOBAL·COHORT 채팅방
- AI가 임의로 출석, 타이머, 프로필, 기수, 공간 데이터를 변경하는 기능
- Browser에서 MCP Server 또는 Domain Service를 직접 호출하는 기능
- 사용자의 세션 쿠키, JWT, 이메일 등 인증 정보를 Prompt에 포함하는 기능
- 대화 내용을 `localStorage`나 `sessionStorage`에 영구 데이터처럼 저장하는 기능

## MCP 연결 경계

실제 질문 전송, 답변 생성 또는 Tool 실행을 구현할 때는
[MCP 기반 AI 도우미 연동 Prompt](MCP-연동.md)를 반드시 함께 읽는다. Browser의
`/bff/v1/ai/**` 경계, Tool allowlist, 쓰기 승인, 개인정보, Stream Event와 오류 공개
정책을 UI 작업자가 임의로 축약하거나 다시 정의하지 않는다.

## UI 상태 계약

| 상태 | 화면 동작 |
| --- | --- |
| `preparing` | 최종 입력 배치는 보이되 입력·모델 선택·전송을 모두 비활성화하고 준비 중임을 표시 |
| `ready` | 입력과 전송을 활성화하고 지원 범위를 짧게 안내 |
| `submitting` | 중복 전송을 막고 요청 중임을 표시 |
| `streaming` | 답변을 점진적으로 표시하고 중단 버튼 제공 |
| `empty` | 대화가 없음을 오류처럼 표현하지 않고 예시 질문 제공 |
| `offline` | 연결할 수 없음과 다시 시도 제공, 가짜 답변을 생성하지 않음 |
| `forbidden` | 권한 부족 안내, 로그인·권한 판정을 Browser에서 추측하지 않음 |
| `error` | 일반 사용자 문구와 요청 ID만 표시, 내부 오류는 서버 로그에 기록 |

- 응답이 없거나 실패했을 때 성공 예시와 Mock 답변을 실제 화면에 표시하지 않는다.
- 전송 버튼은 요청 중 중복 실행되지 않아야 한다.
- 패널을 닫아도 진행 중 요청을 유지할지 취소할지는 계약으로 명시한다. 임의로 선택하지 않는다.
- 새 메시지가 와도 사용자가 과거 답변을 읽고 있다면 스크롤을 강제로 아래로 이동시키지 않는다.

## 접근성·반응형 규칙

- 버튼의 접근성 이름은 `AI 도우미 열기`와 `AI 도우미 닫기`로 상태에 맞게 바꾼다.
- 패널은 버튼의 `aria-controls`와 연결하고 열림 상태는 `aria-expanded`로 전달한다.
- 준비 중 화면의 입력창과 버튼은 반드시 네이티브 `disabled` 상태로 제공해 실행 가능한 것처럼
  오해하게 만들지 않는다.
- 캐릭터 부유·점 애니메이션은 `prefers-reduced-motion`에서 정지한다.
- 스트리밍 전체를 매 글자마다 Live Region으로 읽지 않는다. 문장 또는 응답 완료 단위로 알린다.
- 키보드만으로 열기, 입력, 전송, 중단, 닫기가 가능해야 한다.
- 모바일 안전 영역과 가상 키보드 높이를 고려하고, 입력창이 화면 밖으로 밀려나지 않게 한다.
- 320px 폭과 모바일 가로 화면에서도 Home의 출석·BGM·재실 버튼을 가리지 않아야 한다.
- 새 픽셀 에셋은 투명 배경, 실제 렌더 크기와 라이선스를 확인한 뒤 추가한다.

## Storybook과 테스트

최소 Story는 다음 상태를 독립적으로 검증한다.

```text
Preparing
Ready
Submitting
Streaming
Empty
Offline
Error
Mobile
```

- Storybook Mock을 실제 Home 코드에서 import하지 않는다.
- 버튼 클릭 시 `aria-expanded`와 패널 표시가 함께 바뀌는지 검사한다.
- BGM, 출석부, 재실 인원, Home 오버레이를 열면 AI 패널이 닫히는지 검사한다.
- 긴 한글 질문, 긴 영문 URL, 줄바꿈, 모바일 가상 키보드와 스크롤을 검사한다.
- Prompt Injection 문구가 Tool allowlist와 사용자 확인 단계를 우회하지 못하는 서버 테스트를 추가한다.
- 4xx 공개 오류와 5xx 비공개 오류가 분리되는 BFF 테스트를 추가한다.

## 구현 전 확인할 계약

실제 연결에 필요한 Endpoint, DTO, Stream Event, Tool, 승인, 저장과 오류 계약은
[MCP 기반 AI 도우미 연동 Prompt](MCP-연동.md)의 `구현 전 확정할 계약`을 사용한다.

## 완료 보고

1. 연결한 BFF와 MCP Endpoint
2. 사용한 Request·Response·Stream Event 계약
3. AI에 전달하는 사용자 Context Field
4. 허용한 Tool과 쓰기 승인 방식
5. Loading·Streaming·Offline·Error 처리
6. 개인정보 마스킹과 로그 정책
7. PC·모바일·키보드·스크린리더 검증 결과
8. 아직 준비 상태 또는 Mock으로 남은 부분
