# 요청·Page·JavaScript 흐름

> 상태: Page·Template·Browser JavaScript 요청 흐름 설명

## 1. Page 요청

```text
Browser URL 요청
→ Tomcat
→ Spring Session
→ Spring Security
→ DispatcherServlet
→ Controller·View Controller·Resource Handler
→ Thymeleaf·File Response
→ Browser
→ CSS·JavaScript 추가 요청
→ DOM Event 처리
```

- Server 책임
  - Page 접근 허용 여부
  - 인증·인가
  - 초기 HTML과 CSRF Token
  - Form Binding·Validation
  - 실제 업무 데이터의 향후 BFF 연동
- Browser 책임
  - DOM Event와 부분 화면 갱신
  - 입력 반응·중복 제출 방지
  - 임시 UI 상태
- Browser 비책임
  - 인증·인가 결정
  - Token 원문 보관
  - 업무 데이터의 정본 관리

## 2. Route 확인 방법

Route는 빠르게 변하므로 온보딩 문서에 전체 목록을 복제하지 않는다.

- 단순 Page·정적 Resource: `WebConfig`의 View Controller·Resource Handler
- 요청별 View·Model 분기: `@Controller`와 `@GetMapping`·`@PostMapping`
- Login·Logout·인증 필요 Page: `SecurityConfig`의 Request Matcher·Filter Chain
- Browser JSON API: `@RestController`의 `/bff/v1/**` Mapping
- 실제 경로·보호 조건의 회귀 검증: MVC·Security Test

공개 여부와 권한은 화면에 노출된 Link나 Template 파일 유무가 아니라
`SecurityConfig`의 규칙과 Domain Service의 최종 인가를 기준으로 판단한다.

## 3. View Controller와 Page Controller

### 단순 View Controller

```java
registry.addViewController("/home")
        .setViewName("pages/app/home");
```

- 사용 조건
  - Server Model 없음
  - 요청별 분기 없음
  - Application 호출 없음
- 현재 위치
  - `WebConfig`

### Page Controller

- `LoginPageController`
  - 인증 사용자의 `/home` Redirect
  - Login 실패 Query의 안내 문구 변환
  - Login POST 처리 없음
- `SignupPageController`
  - Signup Form Model
  - Bean Validation
  - Identity Signup 호출
  - 같은 Form으로 복구 가능한 오류 표시
- 분리 기준
  - Server Model 필요
  - 요청별 View·Redirect 분기
  - Application 호출

## 4. Server와 Browser 배치 기준

| 처리 | 위치 | 기준 |
|---|---|---|
| 인증·인가 | Server | Browser 값 비신뢰 |
| Token 보관 | Server Session | JavaScript 비노출 |
| 최초 화면 필수 데이터 | Page Controller·Thymeleaf 검토 | 추가 요청 감소 |
| 빈번한 부분 갱신 | JavaScript → 기능별 BFF 검토 | DOM Event·부분 Rendering |
| Form 검증 | Browser + Server | 사용성·신뢰 경계 분리 |
| 임시 UI 상태 | Browser Memory·Storage | Server 저장 불필요 |
| 출석·기수·학습·권한 | 소유 Service + Frontend BFF | Browser 저장소 정본 금지 |

## 5. Login Page

```text
GET /login
→ LoginPageController
→ templates/pages/auth/login.html
→ Thymeleaf CSRF hidden input
→ login.js
  → 입력 Animation
  → 제출 중 Button 상태
→ Browser 기본 POST /login
→ Spring Security
```

- `login.js` 책임
  - Credential 전송 로직 없음
  - 오류 Code 분류 없음
  - Server Redirect 대체 없음
- Password 처리
  - Form 제출 시 Server 전송
  - Browser Storage 저장 없음

## 6. Home Page

```text
home.html
→ characterAssets.js
→ spaceRoom.js
→ home.js
  → attendance.js
  → character.js
  → level.js
  → presence.js
  → studyRecords.js
  → timer.js
  → utils.js
```

- `home.js`
  - 화면 요소 연결
  - 하위 Module 초기화
  - Overlay Menu Rendering
  - Logout Form 제출
- 하위 Module
  - UI 상태·Event 분리
  - 일부 `/bff/v1/**` 요청 시도
  - 미구현 Endpoint의 404만 Browser Prototype fallback

## 7. Prototype `/bff/v1/**` Adapter

```text
Browser JavaScript
→ api.js optional(...)
→ 같은 Origin /bff/v1/**
→ Frontend BFF JSON 경계
→ 기능 Endpoint 미등록으로 404 응답
→ optional(...)의 null 반환
→ Browser Prototype 계속 사용
```

- 현재 성격
  - 향후 기능별 Frontend BFF 호출 Adapter
  - 실제 기능 Endpoint 미구현
  - 연동 완료 근거 아님
- 인증 정보
  - Session Cookie 자동 포함
  - Bearer Access JWT 미포함
  - Frontend가 Session 인증 처리
- Fallback 기준
  - 404: Browser Prototype용 `null` 반환
  - 401·403·5xx·Network 오류: 호출부 전달
  - `window.OMAGOTCHI_API_STRICT=true`: 404 포함 전체 오류 전달
- 실제 BFF 전환 기준
  - 호출 경로: Browser → `/bff/v1/**` → Frontend BFF → Domain Service
  - JWT Relay: Browser 비노출·Frontend Session의 Access JWT 사용
  - 운영 Discovery·Client-side Load Balancing
  - 로컬 명시적 `localhost` 주소

## 8. Browser 저장소

### `sessionStorage`

- 용도
  - Tab 단위의 임시 UI 상태
  - 선택 Tab과 화면 전환 중 필요한 일회성 표시값
  - 백엔드 미연동 Prototype 화면의 임시 표시 상태
- 사용 금지
  - 인증 Principal 또는 로그인 상태의 판단 근거
  - 사용자·관리자 권한의 판단 근거
  - 출석·학습 시간·기수 등 업무 데이터의 정본
  - Server Session 대체

### `localStorage`

- 용도
  - 화면 밝기 등 사용자 UI 설정
  - 백엔드 미연동 기능을 시연하기 위한 Prototype 표시 데이터
- 한계
  - Server 자동 동기화 없음
  - Browser·기기 간 공유 없음
  - 사용자 직접 변경 가능
  - 인증·인가 또는 업무 규칙의 판단 근거로 사용할 수 없음
- 실제 연동 기준
  - 출석·학습 시간·캐릭터·XP·기수 정보는 인증된 서버 API 응답을 정본으로 사용
  - API 실패 시 Browser 저장소 값으로 성공 상태를 만들거나 보정하지 않음

### Cookie

- 설정된 Session Cookie
  - 로컬 예시: `OMAGOTCHI_SESSION`
  - `HttpOnly`
  - Redis Session ID만 전달
- 금지
  - Access·Refresh Token 원문
  - Browser 표시값의 권한 근거 사용

## 9. 문제별 추적 시작점

- `/home`의 `/login` Redirect
  - `SecurityConfig`
  - Session Cookie
  - Redis 연결
- Login Button 오류
  - `login.html` Form action·method
  - CSRF hidden input
  - `IdentityLoginAuthenticationProvider`
  - `LoginAuthenticationFailureHandler`
- 화면 데이터 불일치
  - Browser Storage Key
  - `api.js` fallback 여부
  - Server 연동 여부
- 특정 Page·BFF Route 오류
  - `WebConfig`·관련 Controller Mapping
  - `SecurityConfig`의 Request Matcher
  - Browser `api.js`의 경로·Method
  - 관련 MVC·Security Test
