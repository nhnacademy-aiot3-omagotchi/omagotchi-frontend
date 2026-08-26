# Home AI 도우미 구현 Prompt

- 상태: 연결 완료 (날씨 조회 도구 기준), 추가 Tool·기능 확장 시 구현 규칙
- 적용 대상: Home 하단 AI 도우미 UI를 작업하는 사람과 AI Agent
- 선행 문서: [Backend Integration AI 공통 보호 규칙](공통-보호규칙.md)
- 연동 문서: [AI 도우미 연동 Prompt](AI-연동.md)

## 목적

실시간 채팅이 사용하던 Home 하단 자리를 AI 도우미로 전환했다. 현재는 실제로 질문을
전송하고, `learning-service`가 스트리밍으로 보내는 답변을 받아 표시한다 (날씨 조회
도구 기준으로 연결 확인됨). 이 문서의 규칙은 기존 Home UI를 보호하고 AI 도우미의
화면 상태와 접근성 계약을 정한다. 연동 경계, 인증, 개인정보와 오류 공개 규칙은 별도
연동 문서를 따른다.

## 현재 구현 기준선

```text
src/main/frontend/home-react/components/AiAssistantPanel.jsx
src/main/frontend/home-react/components/aiAssistantClient.js
src/main/frontend/home-react/components/AiAssistantPanel.stories.jsx
src/main/frontend/home-react/components/ActionDock.jsx
src/main/frontend/home-react/components/HomeStage.jsx
src/main/resources/static/css/home/ui/character-chat.css
src/main/resources/static/css/home/home-quick-panels.css
src/main/resources/static/js/home.js
```

- Home 하단 버튼에는 기존 `commu.png` 픽셀 에셋과 `AI` 라벨을 사용한다.
- `AiAssistantPanel`은 입력창과 전송 버튼이 활성화되어 있다. 모델 선택 자리는 현재
  모델이 하나뿐이라 표시만 하고 비활성화 상태를 유지한다 (여러 모델을 지원하게 되면
  그때 활성화한다).
- 답변 영역은 Home의 `data-home-character`와 `data-character-name`을 관찰해 현재 선택
  캐릭터를 그대로 표시한다. 별도의 기본 캐릭터 경로를 Source of Truth로 만들지 않는다.
- 캐릭터 아바타와 "답변 준비 중" 말풍선(점 3개 애니메이션)은 답변을 기다리는 동안에만
  표시하고, 평소에는 캐릭터만 항상 보이도록 유지한다. 캐릭터를 조건부로 숨기지 않는다.
- 사용자 메시지와 AI 답변은 `home-ai-message`에 각각 `is-user`/`is-assistant`
  class를 붙여 좌우로 구분해 표시한다 (`character-chat.css`의 `.home-ai-message.is-user`).
- AI 메시지 패널은 데스크톱에서 화면 오른쪽 Drawer, 모바일에서 안전 여백을 둔 전체폭 Drawer로 표시한다.
- `home-chat-toggle` CSS 이름은 기존 하단 Dock 호환을 위해 버튼에만 내부 훅으로 남아 있다.
- 사용자에게 보이는 문구, 접근성 이름과 Storybook 이름에는 `채팅`을 사용하지 않는다.
- `omagotchi:home-ai-close` 이벤트로 BGM, 출석부, 재실 인원, Home 오버레이와 상호 배타적으로 닫힌다.

호환용 `home-chat-*` 클래스 이름만 보고 실시간 채팅 기능이 남아 있다고 판단하거나 관련
GLOBAL·COHORT 탭과 메시지 입력창을 복원하지 않는다. 클래스 이름 정리는 Home 하단 반응형
레이아웃을 별도로 검증하는 리팩터링에서만 수행한다.

## 창 크기·배치 변경 가이드

현재 기준은 데스크톱의 오른쪽 Drawer와 모바일의 안전 여백을 둔 전체폭 Drawer다. 현재 CSS는
`src/main/resources/static/css/home/ui/character-chat.css`의 `.home-ai-drawer`에서 관리한다.

```text
일반 PC: 480px × 최대 700px
넓은 PC(1200px × 780px 이상): 520px × 최대 740px
모바일(600px 이하): 화면 네 방향에 약 12px 안전 여백을 둔 크기
```

위 수치는 절대적인 제품 계약이 아니다. 실제 대화 길이, Tool 승인 UI, 첨부 영역 또는 모델
선택 기능 때문에 공간이 부족하다면 구현 담당자가 PC 폭과 높이를 더 늘릴 수 있다. 다만
고정 높이를 무조건 크게 만들지 말고 `min()`, `calc(100dvh - 여백)`처럼 현재 Viewport 안에
머물도록 제한한다. 대화 영역만 스크롤되고 Header와 입력 Composer는 계속 접근 가능해야 한다.

제품 요구가 오른쪽 보조 패널보다 집중형 대화에 가깝다면 중앙 오버레이로 바꿀 수도 있다.
그 경우 다음 원칙을 지킨다.

- 패널을 `position: fixed`인 화면 전체 Backdrop 안에서 가로·세로 중앙 정렬한다.
- PC에서는 적절한 `max-width`와 `max-height`를 두고, 모바일에서는 안전 영역을 제외한 거의
  전체 화면을 사용한다.
- 배경 클릭으로 닫을지 여부를 명시하고, 패널 내부 클릭이 닫힘으로 전파되지 않게 한다.
- 열릴 때 패널 또는 입력창으로 Focus를 이동하고, 닫을 때 원래 AI Dock 버튼으로 Focus를 돌린다.
- `Escape`, 닫기 버튼, `omagotchi:home-ai-close`의 결과가 모두 동일한 닫기 경계를 사용하게 한다.
- 열린 동안 배경 Home 조작을 막고 필요한 경우 Body Scroll을 잠근다. 닫을 때 잠금 Class를 반드시
  제거한다.
- `role="dialog"`, `aria-modal`, 제목 연결과 `aria-controls`·`aria-expanded` 계약을 유지한다.
- BGM, 출석부, 재실 인원과 다른 Home 오버레이의 상호 배타적 닫힘 동작을 유지한다.

Drawer를 오버레이로 바꾸더라도 `AiAssistantPanel`의 메시지 상태, 요청 계약이나 캐릭터
Source of Truth까지 함께 바꾸지 않는다. 배치 변경은 CSS와 열림·닫힘 경계에 한정하고, 새로운
별도 AI 화면으로 복제하지 않는다.

변경 후 Storybook의 `Home/AiAssistantPanel`에서 최소한 `Desktop`, `Mobile`, `Preparing`,
`Closed`를 확인한다. 320px 모바일, 모바일 가로, 1440×900 PC, 낮은 높이의 노트북 화면에서
잘림·배경 조작·Focus 복귀·내부 스크롤을 검증한 뒤 실제 `/home`에서도 다른 패널과 함께 확인한다.

## 제품 범위

### 연결 완료

- 질문 입력과 전송
- 답변 스트리밍 표시 (청크 단위로 도착하는 대로 반영)
- AI 도우미 버튼과 준비 화면의 PC·모바일 표시
- Dock 버튼으로 열기·닫기, 오른쪽 스와이프로 닫기와 다른 Home 패널 간 닫힘 동작

### 아직 구현하지 않음 (별도 Tool·계약 확정 후)

- 답변 중단, 재시도
- 허용된 도구 목록과 도구 실행 결과의 별도 시각적 표시 (현재는 도구 실행 결과가 답변
  텍스트에 자연스럽게 녹아 나올 뿐, UI가 "어떤 도구를 썼다"를 구분해서 보여주지 않는다)
- 사용자 확인이 필요한 쓰기 작업의 승인 Dialog (현재 등록된 Tool은 날씨 조회뿐이며 전부
  읽기 전용이라 승인 절차가 필요한 사례가 아직 없다)
- `empty`/`offline`/`forbidden` 상태의 세분화된 화면 (현재는 요청 실패 시 전부 `error`
  상태의 일반 문구로 처리된다)
- 대화 이력 조회·삭제 정책 (서버는 Caffeine 캐시로 1시간 미사용 시 자동 삭제하지만,
  사용자가 직접 삭제하는 기능은 없다)

### 별도 승인 없이는 구현 금지

- 실시간 사용자 간 채팅 또는 GLOBAL·COHORT 채팅방
- AI가 임의로 출석, 타이머, 프로필, 기수, 공간 데이터를 변경하는 기능
- Browser에서 `learning-service` 또는 다른 Domain Service를 직접 호출하는 기능
- 사용자의 세션 쿠키, JWT, 이메일 등 인증 정보를 Prompt에 포함하는 기능
- 대화 내용을 `localStorage`나 `sessionStorage`에 영구 데이터처럼 저장하는 기능

## 연동 경계

질문 전송, 답변 생성 또는 Tool 실행 관련 작업을 할 때는
[AI 도우미 연동 Prompt](AI-연동.md)를 반드시 함께 읽는다. Browser의
`/bff/v1/ai/**` 경계, Tool 목록, 쓰기 승인, 개인정보, Stream 계약과 오류 공개
정책을 UI 작업자가 임의로 축약하거나 다시 정의하지 않는다.

## UI 상태 계약

| 상태 | 화면 동작 | 구현 여부 |
| --- | --- | --- |
| `ready` | 입력과 전송을 활성화하고 지원 범위를 짧게 안내 | 구현됨 |
| `submitting` | 중복 전송을 막고 요청 중임을 표시 | 구현됨 |
| `streaming` | 답변을 점진적으로 표시 | 구현됨 (중단 버튼은 아직 없음) |
| `error` | 일반 사용자 문구 표시, 내부 오류는 서버 로그에 기록 | 구현됨 |
| `empty` | 대화가 없음을 오류처럼 표현하지 않고 예시 질문 제공 | 미구현 (지금은 빈 대화 목록에 안내 문구만 고정 표시) |
| `offline` | 연결할 수 없음과 다시 시도 제공, 가짜 답변을 생성하지 않음 | 미구현 (`error`로 뭉뚱그려짐) |
| `forbidden` | 권한 부족 안내, 로그인·권한 판정을 Browser에서 추측하지 않음 | 미구현 (`error`로 뭉뚱그려짐) |

- 응답이 없거나 실패했을 때 성공 예시와 Mock 답변을 실제 화면에 표시하지 않는다.
- 전송 버튼은 요청 중 중복 실행되지 않아야 한다.
- 패널을 닫으면 진행 중인 요청은 취소한다 (`AbortController` 사용, 현재 정책).
- 새 메시지가 와도 사용자가 과거 답변을 읽고 있다면 스크롤을 강제로 아래로 이동시키지 않는다.

## 접근성·반응형 규칙

- 버튼의 접근성 이름은 `AI 도우미 열기`와 `AI 도우미 닫기`로 상태에 맞게 바꾼다.
- 패널은 버튼의 `aria-controls`와 연결하고 열림 상태는 `aria-expanded`로 전달한다.
- 캐릭터 부유·점 애니메이션은 `prefers-reduced-motion`에서 정지한다.
- 스트리밍 전체를 매 글자마다 Live Region으로 읽지 않는다. 문장 또는 응답 완료 단위로
  알린다 (현재 구현은 "답변 준비 중" 상태만 Live Region으로 안내하고, 스트리밍되는
  본문 텍스트 자체는 아직 문장 단위 안내를 하지 않는다 — 개선 필요).
- 키보드만으로 열기, 입력, 전송, 닫기가 가능해야 한다.
- 모바일 안전 영역과 가상 키보드 높이를 고려하고, 입력창이 화면 밖으로 밀려나지 않게 한다.
- 320px 폭과 모바일 가로 화면에서도 Home의 출석·BGM·재실 버튼을 가리지 않아야 한다.
- 새 픽셀 에셋은 투명 배경, 실제 렌더 크기와 라이선스를 확인한 뒤 추가한다.

## Storybook과 테스트

최소 Story는 다음 상태를 독립적으로 검증한다.

```text
Closed
Preparing (Ready)
Desktop
Mobile
```

- Storybook은 실제 BFF/`learning-service`가 없는 환경이라 전송 시 요청이 실패하는 게
  정상이다. 이 환경에서는 입력·전송·상태 전환(제출 중 잠금, 실패 시 오류 문구)이
  올바르게 도는지만 확인한다.
- Storybook Mock을 실제 Home 코드에서 import하지 않는다.
- 버튼 클릭 시 `aria-expanded`와 패널 표시가 함께 바뀌는지 검사한다.
- BGM, 출석부, 재실 인원, Home 오버레이를 열면 AI 패널이 닫히는지 검사한다.
- 긴 한글 질문, 긴 영문 URL, 줄바꿈, 모바일 가상 키보드와 스크롤을 검사한다.
- 4xx 공개 오류와 5xx 비공개 오류가 분리되는 BFF 테스트를 추가한다.

## 연동 전 확인할 계약

새 Tool 추가, 인증 컨텍스트 확장 등 연동 범위를 넓힐 때 필요한 Endpoint, DTO, Tool,
승인, 저장과 오류 계약은 [AI 도우미 연동 Prompt](AI-연동.md)의 `연동 전 확정할 계약`을
사용한다.

## 완료 보고

1. 연결한 BFF와 `learning-service` Endpoint
2. 사용한 Request·Response·Stream 계약
3. AI에 전달하는 사용자 Context Field
4. 등록된 Tool과 쓰기 승인 방식 (현재는 날씨 조회 하나, 읽기 전용)
5. Loading·Streaming·Error 처리와 아직 세분화하지 않은 상태
6. 개인정보 마스킹과 로그 정책
7. PC·모바일·키보드·스크린리더 검증 결과
8. 아직 준비 상태 또는 Mock으로 남은 부분
