# 백엔드 연동 전 UI 통합 리팩토링 기록

- 작업일: 2026-08-14
- 상태: Frontend 구현·자동 검증 완료, 실제 서비스 통합 회귀 대기
- 대상: 출석부, 로그인·회원가입, Home 메뉴, 공통 상태, 반응형

## 목표

Storybook에서 검증한 Pattern을 실제 View에 연결하되 아직 확정되지 않은 API URL·DTO를
추측하지 않는다. Spring Security, JWT, Redis Session, Identity Service와 기존 Home
Controller의 `data-*` 계약을 보존하는 것을 최우선 조건으로 삼았다.

## 적용 결과

### 출석부

실제 `home.html`의 출석 DOM에 `AttendanceBook`과 같은 공통 class를 적용했다. 입실·퇴실
시간, 달력, 월 이동과 연속 출석 노드는 기존 `createAttendance()`가 계속 소유한다.
오늘 출석 요약은 2×2 카드 Grid를 사용하지 않고 `항목 → 값` 한 줄씩 쌓이는 세로 목록으로
고정한다. 430px 이하의 기존 2열 보정도 이 목록 규칙을 덮어쓰지 못하도록 실제 Home
어댑터가 열 수와 줄바꿈을 소유한다.

패널 표시 상태는 `home-page.is-attendance-panel-open` class만으로 추론하지 않고 실제
`attendance-detail`의 `hidden` 속성과 함께 동기화한다. 공통 `.ui-attendance`의
`display: grid`가 기존 숨김 규칙을 덮어쓰지 않도록 `[hidden]`을 최우선으로 처리하며,
닫기 버튼·바깥 영역 클릭·`Esc`는 모두 `setAttendancePanelOpen(false)`를 사용한다. 패널
내부에 포커스가 있을 때 닫히면 출석 패널 열기 버튼으로 포커스를 되돌린다.

```text
React/Storybook: 색상, 간격, 반응형 Pattern
Thymeleaf: 실제 DOM과 data-* 계약
Vanilla Controller: 달력 셀·상태·서버 응답 갱신
```

서버 이력 요청 중에는 `loading`, 기록 없음은 `empty`, 입실 중은 `active`, 퇴실 완료는
`complete`, 서버 실패는 `error`로 구분한다. 실패 시 로컬 Prototype을 유지할 수 있지만
화면에 안내하고 `data-ui-source="local-prototype"`을 남긴다.

### 로그인·회원가입

`AuthScreen`의 밝은 민트·화이트 2열 디자인과 모바일 단일 열 규칙을 실제 Thymeleaf
템플릿에 적용했다. React 폼으로 교체하지 않았기 때문에 다음 계약은 변경되지 않았다.

- 로그인·회원가입 `POST` action
- `email`, `name`, `password` 필드명과 `th:field`
- 서버 오류 메시지와 Bean Validation 오류
- 비밀번호 표시 버튼과 기존 JavaScript
- 인증·세션·JWT 처리 코드

### Home 메뉴

`HomeMenuLiveContent`를 실제 Overlay의 표현 어댑터로 추가했다. Storybook의 성공 mock은
import하지 않고, `home.js`가 만든 실제 내용만 감싼다. 따라서 기존 `data-overlay-*`,
`data-community-*`, `data-home-cohort-*`, 학습 기록·공간 mount 지점은 유지된다.

진행·내 정보·커뮤니티·설정 내부는 서로 다른 저채도 파스텔 카드를 반복하지 않는다. 브랜드
민트 `#2FC47C`는 제목 영역에만 사용하고, 본문은 밝은 바탕과 흰색 행으로 구성한 하나의
목록 문법을 공유한다. 기본 색상 계약은 다음과 같다.

| 용도 | 색상 |
| --- | --- |
| 제목·브랜드 | `#2FC47C` |
| 선택·주요 동작 | `#176B46` |
| 본문 바탕 | `#F7FCF9` |
| 목록 행 | `#FFFFFF` |
| 보조 바탕 | `#EDF8F2` |
| 구분선 | `#C8DED2` |
| 본문 글자 | `#12382A` |
| 보조 글자 | `#597065` |

진행 화면의 퀘스트·랭킹·타임라인·통계는 같은 목록 행을 사용한다. 아직 실제 기능과 데이터가
없는 업적은 가짜 카드나 달성치를 만들지 않고 `업적 기능은 아직 준비되지 않았습니다.`라는
빈 상태만 표시한다. 랭킹과 타임라인도 데이터가 없을 때 가상의 사용자나 활동을 만들지 않는다.
Storybook의 `HomeOverlay/Progress`도 실제 Home과 같은 class와 상태 문구를 사용해 두 화면의
시안이 서로 달라지지 않도록 했다.

### Home 보조 패널 상호 배타 계약

BGM·출석부·재실 패널 또는 Overlay를 열면 이미 열린 채팅을 닫고, 채팅을 열 때는 기존
BGM·출석부·재실 패널을 닫는다. 채팅 상태는 React Island가 소유하므로 `home.js`가 React
DOM이나 class를 직접 바꾸지 않는다. 대신 `omagotchi:home-chat-close` 단방향 이벤트로
닫기만 요청한다. 이 경계는 기존 Vanilla Controller와 React 상태의 이중 소유를 막는다.

### Backend Handoff와 파일 구조

Backend 담당자가 화면을 다시 만들지 않고 API만 연결할 수 있도록
[기능별 연결 지도](../../integration/frontend-backend-connection-map.md)에 기능별 adapter,
Controller, 보존할 `data-*`, 미확정 Backend 계약을 정리했다. 전체 경로와 파일 소유권은
[Frontend 디렉터리 구조](../../architecture/frontend-directory-map.md)를 기준으로 한다.

실제 소스는 이미 `React UI → Home React Island → Vanilla 기능 Controller → Browser API`
책임으로 분리되어 있으므로 충돌을 유발하는 대규모 파일 이동은 하지 않았다. 문서는
`architecture`, `integration`, `home-ui`, `prompt`, `requirements`, `roadmaps`,
`specifications` 등 성격별 디렉터리로 분류하고 `docs/README.md`에서 진입 경로를 제공한다.

### 공통 상태

| 상태 | 표현 원칙 |
| --- | --- |
| `loading` | 조작을 잠그고 불러오는 중임을 안내 |
| `empty` | 정상 응답이지만 데이터가 없음을 안내 |
| `error` | 기존 데이터 유지 여부와 재시도 필요를 안내 |
| `disabled` | 실행 불가 이유를 label·설명으로 제공 |
| `ready` | 검증된 실제 응답만 성공 화면으로 사용 |

재실 API가 없을 때 `0명` 객체를 만들어 성공처럼 표시하던 fallback은 제거했다. 학습 기록은
기존 `loadErrorMessage`, 출석은 `data-ui-state`, Home 메뉴는 `data-ui-state` 어댑터를 사용한다.

## 파일 소유권

```text
src/main/frontend/ui/                         Storybook 공통 UI와 실제 표현 어댑터
src/main/frontend/home-react/components/      실제 Home React Island
src/main/resources/templates/pages/           Thymeleaf 실제 DOM·Form 계약
src/main/resources/static/js/home/             기능 Controller·API 상태 변환
src/main/resources/static/css/ui/              공통 디자인 토큰
src/main/resources/static/css/home/            실제 Home 배치·기능별 보정
```

`home-app.js`는 생성 산출물이므로 직접 수정하지 않고 `npm run build:home`으로 다시 만든다.

## 검증

```text
npm run build:home                         성공
npm run build-storybook                    성공
npx vitest run                             21 files / 80 tests 성공
./mvnw test                                136 tests 성공
git diff --check                           성공
```

Storybook 브라우저 확인:

| 화면 | 뷰포트 | 결과 |
| --- | ---: | --- |
| 도움말 Overlay | 1440×900 | 가로 넘침 없음, 보이는 제목 1개 |
| 설정 Overlay | 1024×768 | 가로 넘침 없음, 보이는 제목 1개 |
| 진행 Overlay | 390×844 | 퀘스트·업적 단색 목록, 가로 넘침 없음 |
| 진행 Overlay | 844×390 | 랭킹 빈 목록, 가로 넘침 없음 |
| 출석부 | 390×844 | 가로 넘침 없음 |
| Home 메뉴 | 844×390 | 가로 넘침 없음 |
| 회원가입 | 320×568 | 가로 넘침 없음 |

실제 `home.html`, 생성된 `home-app.js`, `home.js`와 실제 CSS를 함께 제공하는 정적 통합
fixture에서도 다음을 확인했다. BFF 요청은 의도적으로 `503`을 반환해 API 미연결 상태가
성공 mock으로 표시되지 않는지도 함께 검사했다.

| 실제 Home 검증 | 결과 |
| --- | --- |
| 1440×900, 1024×768, 844×390, 390×844, 320×568 | 초기 화면·출석부 열기 모두 body 가로 넘침 없음 |
| 출석부 | 5개 화면에서 열기 성공, 닫기 후 `hidden` 복원, 출석 버튼으로 포커스 복귀 |
| 도움말 Overlay | Dialog 열기, Escape 닫기, 메뉴 링크로 포커스 복귀 |
| 진행 Overlay | 퀘스트·업적·랭킹·타임라인·통계 탭 전환과 단색 목록형 내용 확인 |
| 내 정보·커뮤니티·설정 Overlay | 실제 사용자·커뮤니티·설정 DOM 계약을 유지하면서 밝은 단색 본문 적용 확인 |
| 도움말 용어 안내 | 학습 세션·완료 세션·총 학습 시간·연속 출석·재실 인원·기수의 의미와 완료 세션 FAQ 추가 |
| 재실 개인정보 경계 | 재실 목록은 닉네임만 표시·검색하고, 이메일 기반 메시지·파티 초대 검색은 별도 인증 API와 UI로 분리 |
| 캐릭터 선택 React Island | 실제 온보딩 화면과 Storybook이 같은 컴포넌트를 사용하며 기본·선택·저장 중·오류·모바일 상태를 검증 |

캐릭터·색상 선택은 React의 controlled state와 기본 버튼이 담당한다. 이 화면에는 Dialog나
Tabs가 없으므로 Radix Primitive를 형식적으로 추가하지 않는다. 향후 저장 확인 Dialog가
필요해질 때 공통 `GameDialog`를 적용한다.
| 실제 Home 390×844 | 설정·진행 Overlay 가로 넘침 없음, 타임라인 빈 상태 확인 |
| 실제 Home 844×390 | Home·출석부 가로 넘침 없음, 출석부 닫기 후 `hidden=true` 복원 |
| 채팅 → BGM·출석부·재실 | 기존 채팅이 닫히고 선택한 패널만 열림 |
| API 미연결 출석 | 오류 안내와 `data-ui-source="local-prototype"` 유지 |

실제 Home 출석 DOM만 별도로 렌더링한 추가 검사에서도 1024, 390, 320px 모두 요약 목록이
한 열이었고 값 영역 최소 폭을 유지해 `아직 입실 전`, `기록 없음`이 세로로 쪼개지지 않았다.
패널 초기 상태에는 `hidden`이 있고, 열기 때 제거·닫기 때 복원하도록 DOM·JavaScript·CSS
계약을 교차 확인했다. 변경 전 정적 파일 캐시가 남지 않도록 실제 Home의 `home.js`와
`home-app.js`와 `home.js`는 `20260814-3`, `design-system.css`는 `20260814-2`,
`home-overlay-theme.css`와 `home-quick-panels.css`는 `20260814-1`로 갱신했다. React source를 다시
빌드해 실제 번들이 달라지면 `home-app.js`의 템플릿 버전도 함께 올려 Storybook과 실제
Home이 서로 다른 구현을 제공하지 않도록 한다.

## 남은 통합 검증

Identity·View와 필요한 Domain Service를 실행한 뒤 실제 `/home`에서 다음을 확인한다.

1. Identity·View를 함께 실행한 실제 로그인·회원가입 제출과 서버 오류 재표시
2. 실제 Domain Service 응답을 사용한 타이머·출석·학습·재실 상태 전환
3. 출석·학습·재실 API 계약 확정 후 Prototype fallback 제거

이 항목들은 백엔드 코드를 새로 구현하는 범위가 아니라 실제 서비스 조합에서 수행하는
최종 회귀 검증이다.
