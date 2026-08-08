# 요청·Page·JavaScript 흐름

> 상태: 현재 Route·Template·JavaScript 설명 · 업무 기능 대부분 Browser Prototype

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

## 2. 지원 Route

### 공개 Route

| Route | 처리 | 결과 |
|---|---|---|
| `/`, `/index` | `WebConfig` | `index.html` |
| `GET /login` | `LoginPageController` | Login Form |
| `POST /login` | Spring Security | 인증·`/home` Redirect |
| `GET /register` | `SignupPageController` | Signup Form |
| `POST /register` | `SignupPageController` | 가입·Form 재표시·Redirect |
| `/password-change` | `WebConfig` | 미구현 안내 Page |
| `/preview/error/403`, `/500`, `/503` | Local `ErrorPreviewController` | 실제 ERROR Dispatch 화면 |
| `/actuator/health`, `/actuator/info` | Actuator | 상태 정보 |
| 정적 Resource | MVC Resource Handler | CSS·JS·Image |

### 인증 필요 Route

- 사용자 Page
  - `/home`
  - `/character-selector`
  - `/check-in`
  - `/progress`
  - `/personal`
  - `/cohort`
  - `/write`
  - `/settings`
  - `/help`
  - `/space`
- 관리자 Prototype
  - `/manager-dashboard`
  - 현재 조건: `authenticated()`
  - 실제 관리자 권한 검증: 미구현
### 미등록 레거시 파일

- 대상
  - `managerLogin.html`·`managerLogin.js`·관련 CSS
  - `managerRegister.html`·`managerRegister.js`·관련 CSS
- Runtime 상태
  - `/manager-login` Route 없음
  - `/manager-register` Route 없음
  - `OmagotchiApi.auth.managerLogin` 없음
  - `OmagotchiApi.auth.managerRegister` 없음
- 유지 사유
  - 사용자 요청에 따른 임시 보존
- 후속
  - 단일 Login·Signup 전환 완료 후 파일 삭제

## 3. View Controller와 Page Controller

### 단순 View Controller

```java
registry.addViewController("/home")
        .setViewName("home");
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
→ login.html
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
  - 실패 시 Browser Prototype fallback

## 7. Prototype `/bff/v1/**` Adapter

```text
Browser JavaScript
→ api.js optional(...)
→ 같은 Origin /bff/v1/**
→ Frontend BFF JSON 경계
→ 기능 Endpoint 미등록으로 실패
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
- Strict Flag
  - 이름: `window.OMAGOTCHI_API_STRICT`
  - 현재 저장소 내 주입 위치: 없음
  - 미설정 기본 효과: 실패 은닉과 `null` fallback
- 실제 BFF 전환 기준
  - Browser → `/bff/v1/**` 기능 Endpoint
  - Frontend → Session Access JWT 기반 Domain Service 호출
  - 운영 Discovery·Client-side Load Balancing
  - 로컬 명시적 `localhost` 주소

## 8. Browser 저장소

### `sessionStorage`

- 용도
  - Tab 단위 표시 상태
  - 선택 캐릭터·관리자 표시값·선택 Tab
- 비용도
  - 인증 Principal
  - 관리자 권한
  - Server Session 대체

### `localStorage`

- 용도
  - 캐릭터·출석·XP·학습·기수 Prototype
  - 화면 밝기 등 사용자 UI 설정
- 한계
  - Server 자동 동기화 없음
  - Browser·기기 간 공유 없음
  - 사용자 직접 변경 가능

### Cookie

- 설정된 Session Cookie
  - 로컬 예시: `OMAGOTCHI_SESSION`
  - `HttpOnly`
  - Redis Session ID만 전달
- 금지
  - Access·Refresh Token 원문
  - Browser 표시값의 권한 근거 사용

## 9. 추적 시작점

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
- 관리자 화면 오류
  - 공통 `/login` 사용 여부
  - `/manager-dashboard` Route
  - 레거시 `/manager-login`·`/manager-register` 미등록 상태

## 10. 주요 Code

- [`WebConfig.java`](../../src/main/java/site/omagotchi/frontend/global/config/WebConfig.java)
- [`SecurityConfig.java`](../../src/main/java/site/omagotchi/frontend/global/security/SecurityConfig.java)
- [`LoginPageController.java`](../../src/main/java/site/omagotchi/frontend/auth/presentation/page/LoginPageController.java)
- [`SignupPageController.java`](../../src/main/java/site/omagotchi/frontend/auth/presentation/page/SignupPageController.java)
- [`api.js`](../../src/main/resources/static/js/api.js)
- [`home.js`](../../src/main/resources/static/js/home.js)
