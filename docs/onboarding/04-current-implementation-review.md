# 현재 구현 점검

> 기준: 현재 Frontend Code·Test · 요구사항 정본은 상위 `docs`와 각 Service 계약

## 1. 결론

- 실제 연동
  - 일반 Signup
  - 공통 Login
  - Logout
  - Spring Security Page 보호
  - Redis Spring Session
  - Identity HTTP Service Client
- Browser 보안 경계
  - Access·Refresh Token 원문 비노출
  - Opaque Session Cookie
  - CSRF 활성화
  - Login Session ID 교체
- 미연동
  - 기능별 BFF Endpoint
  - Access Token Refresh
  - Learning 관리자 소속
  - 비밀번호 변경·재설정
- Prototype
  - 출석·학습·기수·관리자 Dashboard 업무 데이터
  - Browser Storage 기반 표시 상태

## 2. 구현 상태

| 영역 | 현재 | 완료 판단 금지 |
|---|---|---|
| Signup | Identity `USER` 계정 생성 | 관리자 소속 생성 |
| Login | Spring Security + Identity + Redis | Access Token Refresh |
| Logout | Identity 폐기 시도 + Local 정리 | Redis 저장 실패 보상 |
| Page 인증 | Session SecurityContext | Domain 업무 권한 |
| 관리자 Dashboard | 모든 인증 사용자 접근 | `MANAGER` 인가 |
| BFF | `/bff/v1/**` 공통 경계 준비 | 업무 Endpoint·JWT Relay |
| 오류 JSON | Controller·MVC·Security·Redis 경계 | 기능별 업무 오류 |
| 오류 HTML | Form·Page·Redis·Boot 4xx/5xx fallback | Browser 전체 E2E |

## 3. 유지할 Spring 확장점

| Type | 유지 이유 |
|---|---|
| `AuthenticatedLoginRequestFilter` | 인증 Session의 새 Token Family 발급 전 차단 |
| `IdentityLoginAuthenticationProvider` | Identity Credential 검증의 Form Login 연결 |
| `LoginAuthenticationFailureHandler` | 사용자 Credential 실패와 Service 장애 응답 분리 |
| `BrowserTokenSessionAuthenticationStrategy` | Login 성공 Token Bundle의 HttpSession 기록 |
| `BrowserSessionTokens` | Identity Token Bundle Session attribute 접근 |
| `IdentityLogoutHandler` | Local Logout 전 Identity Token 폐기 시도 |
| `SessionStoreErrorFilter` | MVC 바깥 Redis Session 실패 포착과 원본 예외 구분 |
| `SessionStoreFailureResponseWriter` | 부분 응답 초기화와 경로별 HTML·JSON 503 작성 |

- 판단
  - Spring Security 표준 생명주기 지점 사용
  - Controller 기반 인증 재구현 아님
  - 하나의 Class로 합칠 대상 아님
- Spring 기본 기능 사용
  - Form Login Filter
  - `ChangeSessionIdAuthenticationStrategy`
  - CSRF Repository·Strategy
  - 기본 Local Logout Handler
  - `LoginUrlAuthenticationEntryPoint`
  - `AccessDeniedHandlerImpl`

## 4. 제거한 전환 코드

- 인증 중복 경로
  - `/session/v1/**`
  - 관리자용 JSON Login·Signup
  - 별도 CSRF 조회 API
- 수동 Framework 재구현
  - Controller Programmatic Login·Logout
  - Session API 전용 MVC Resolver
  - Filter의 JSON 직접 Writer
- Browser Credential 잔재
  - `/username`에서 Identity 프로필을 갱신하던 역할
  - 가입 이메일과 표시명을 Browser 저장소에서 연결하던 흐름
  - Browser Token·비밀번호 저장 Key
- 유지한 게임 Prototype
  - `/username` 캐릭터 표시명 화면
  - Learning 게임 프로필 연동 전 Session 표시 상태

## 5. 현재 구조 판단

### Application 경계

- `AuthenticationService`
  - Presentation의 Infrastructure 직접 의존 방지
  - `IdentityAuthClient` Port의 공통 진입점
  - 현재 얇은 Identity Port 위임 구조
- 유지 조건
  - Page·Security의 동일 Use Case 공유
  - 향후 Refresh·보상·정책의 Application 배치 가능성
- 금지
  - 의미 없는 Result·Exception 재포장
  - Infrastructure HTTP Type 노출

### Signup 복구

- `SignupResult`
  - Application이 소유하는 `Created`·`Rejected(ErrorCode)` 결과
  - Infrastructure Port 구현과 Presentation의 공통 Application 계약
  - Identity 오류 원문·Form·Password·Identity DTO 미포함
- `SignupPageController`의 결과 분기
  - `Created`: Login Page Redirect
  - `Rejected(ErrorCode)`: 동일 Form 복구
  - `authFeedback`·HTTP 상태 설정
  - Password 제거 후 동일 Form 복구
- 판단
  - 예외의 정상 제어 흐름 사용 제거
  - 연동 장애·계약 위반의 `BusinessException` 전파
  - Service의 예외→결과 재번역 없음

### Outbound HTTP

- `IdentityAuthHttpService`
  - HTTP Method·Path·Wire DTO
- `IdentityRestAuthClient`
  - Port 성공값·복구 결과·종료 실패 변환
- `RestClientCallExecutor`
  - 서비스 공통 전송 실패 처리
- `IdentityAuthErrorResolver`
  - Identity 인증 4xx의 공개 Code·HTTP 상태 계약 검증
- 남은 결합
  - Spring Cloud no-instance의 Message·Stack 기반 판별
  - 현재 Version의 전용 Exception 부재에 따른 임시 구현

## 6. 현행 구현·Test로 확인한 보장

- Redis Session 장애 분류
  - `RedisConnectionFailureException`·원인 체인의 `RedisCommandTimeoutException`만 HTML 503 변환
  - 일반 `QueryTimeoutException`·다른 Data Store 오류 원본 전파 Test 존재
- Redis 503 응답
  - `response.reset()`을 통한 미완성 응답 제거
  - 응답 초기화 뒤 Spring Security 기본 보안 Header 재적용
  - `Location`·`Set-Cookie`·본문 전송 Header 미복원
  - Redis 미접속 상태의 Login Page·Cookie Session 요청 통합 Test 존재
- 인증 Login Guard
  - `POST /login`만 `AuthenticatedLoginRequestFilter` 대상
  - 인증 Session의 재로그인 시도는 Identity 재호출 없이 `/home` Redirect
- Login Identity 장애
  - 사용자 Credential 거절: `BadCredentialsException`·`/login?error=true`
  - 그 밖의 `BusinessException`: `AuthenticationServiceException`·원래 HTTP Status ERROR Dispatch
- Outbound 오류 원인
  - 원본 `RestClientResponseException` Cause 보존
  - 오류 JSON Decode 실패 Cause의 Suppressed 보존 Test 존재
- HTML 오류 View
  - `error/4xx.html`·`error/5xx.html` Fallback 존재
  - 전용 Template 없는 405·503 ERROR Dispatch Test 존재
- REST 오류 Advice
  - 선택된 `@RestController`의 `BusinessException`·Bean Validation·읽을 수 없는 JSON·예상하지 못한 예외 JSON 변환 Test 존재
  - 실제 Production `@RestController`·BFF Endpoint 없음
- BFF 공통 JSON 경계
  - `/bff/v1/**` 미인증 401·CSRF 403 Test 존재
  - Handler 선택 전 404·405·415 상태·Header Test 존재
  - Redis Session 장애 503 JSON Test 존재

## 7. 남은 위험·처리 시점

### A. 이번 Frontend PR의 잔여 Blocker

- 추가 잔여 Blocker 없음
  - 현재 PR에서 도입한 인증·Redis 장애·HTML 오류 Fallback의 구현·Test 근거는 §6·§8 참조
  - Token Family 보상·정적 Resource 장애 내성·관리자 레거시 화면은 현재 PR의 완료 조건 아님

### B. PR 직후·첫 기능별 BFF 전에 처리

#### Login 성공 뒤 Redis 저장 실패 보상

```text
Identity Token 발급 성공
→ HttpSession Token Bundle 기록
→ Redis 저장 실패
→ Browser Login 실패
→ Refresh Token Family 잔존 가능
```

- 현재
  - `SessionStoreErrorFilter`의 Redis Session 장애 포착
  - `SessionStoreFailureResponseWriter`의 HTML·JSON 503 작성
  - Token Family 폐기 보상 부재
- 후속 완료 기준
  - 발급된 Refresh Token 기반 Identity Logout 보상 시도
  - 보상 실패 원인 기록
  - 중복 보상 안전성 Test
  - Token 발급 뒤 Session 저장 실패 재현 통합 Test

#### 정적 Resource·Redis Session 결합

- 현재
  - 정적 Resource 인가 우회 설정
  - `SessionRepositoryFilter`의 Session 조회 경계 별도 존재
  - Session Cookie가 있는 정적 요청의 Redis 장애 결과 통합 Test 부재
- 후속 완료 기준
  - Session Cookie·Redis 미접속·정적 Resource 조합 Test
  - Resource 제공 정책 결정과 Test 고정

#### Access Token Refresh

- 현재
  - 만료 뒤 Domain Service 호출 복구 경로 부재
- 선행 완료 기준
  - 동일 Session Refresh Single-flight
  - 회전 결과의 원자적 Session 반영
  - 상태 변경 요청 자동 재실행 금지

#### Browser Prototype API 전환

- 현재
  - `static/js/api.js`의 Frontend `/bff/v1/**` 요청
  - 기능 Endpoint 미등록·Browser Storage Fallback
- 선행 완료 기준
  - 기능별 BFF Endpoint·Session Access JWT Relay
  - Prototype Fallback과 실제 업무 완료 판단 분리

#### Framework Status 확장

- 현재
  - 400·404·405·406·415·500·503 공통 Code 매핑
  - 미등록 Spring MVC Status의 JSON 500 은닉
- 선행 완료 기준
  - 도입 Endpoint의 실제 Status·Header 계약 추가
  - Upload 등 새 입력 형식의 413 포함 여부 결정

### C. Learning 등 후속 Service 연동 시 처리

#### 관리자 레거시 화면 Artifact

- 현재
  - `managerLogin.*`·`managerRegister.*` Template·JavaScript·CSS 유지
  - Runtime Route·Backend API 미등록
  - 각 Artifact의 `FIXME`로 단일 Login·Signup 전환 뒤 제거 예정 표시
- 연동 시점 조건
  - Learning 관리자 소속·실제 관리자 화면 흐름 확정
  - 단일 Login·Signup 전환 뒤 제거 또는 대체 여부 결정

#### 관리자 기수 권한

- 현재
  - `/manager-dashboard`는 `authenticated()`만 적용
  - 모든 인증 사용자 접근 가능
  - Dashboard 업무 데이터는 Browser Prototype
- 연동 완료 기준
  - Learning의 대상 기수 `ACTIVE MANAGER` 소속 확인
  - BFF Endpoint별 Server 인가·리소스 범위 확인
  - UI 표시와 Server 인가 분리
  - `SYSTEM_ADMIN`과 기수 관리자 소속 분리

#### Redis 장애 발생 경계 재설계

- 현재 전제
  - Frontend Redis 사용처: Spring Session 단일 경계
  - Redis 연결·명령 Timeout을 Session Store 장애로 분류
- 연동 시점 조건
  - Redis Cache·Repository 등 새 사용처 추가 전 발생 경계 기반 분류 재설계
  - Session Store 외 Redis 오류의 HTML·JSON 변환 분리

#### Domain Service 계약 검증

- 현재
  - Identity 인증 계약 Test 존재
  - Learning 업무 API 계약·배포 환경 호환 Test 부재
- 연동 완료 기준
  - Access JWT Relay·권한 거절·Downstream 4xx 공개 범위 합의
  - 실제 Service 계약 검증 경로 확보

### D. MVP 범위 밖·운영 고도화

#### Request ID End-to-End

- 현재
  - 오류 Body `requestId`는 `null`
- 고도화 범위
  - Ingress Header·MDC·오류 Body·Outbound Header 전파

#### Browser End-to-End·운영 관측

- 현재
  - MockMvc·HTTP Client·Testcontainers 중심 경계 Test
- 고도화 범위
  - 실제 Browser Login·Logout·오류 화면 회귀 Test
  - 502·503·보상 실패 Metric·Alert
  - 실제 배포 Identity 계약 검증

#### 비밀번호 변경·재설정

- 현재
  - 안내 Page와 Login 복귀 Link만 제공
- 고도화 범위
  - Identity 정책·본인 확인·Token 폐기 정책 확정 뒤 구현

## 8. Test 보장 범위

| Test | 직접 보장 | 미보장·후속 |
|---|---|---|
| `AuthenticationSecurityMvcTest` | Form Login·CSRF·재로그인 Guard·BFF 인증 경계·Logout | 실제 Redis Session·전체 보호 Route |
| `SignupPageMvcTest` | Signup Binding·Validation·같은 Form 복구·Redirect | Security Filter·실제 Identity |
| `IdentityRestAuthClientTest` | Identity 요청·성공 Status·Application 결과·오류 변환 | 실제 배포 Identity 계약 |
| `BrowserSessionRedisIntegrationTest` | 실제 HTTP·Redis 인증 복원·Session Cookie·CSRF 교체·Logout | Token 발급 뒤 Redis 저장 실패 |
| `SessionStoreErrorFilterTest` | Redis 연결·명령 Timeout 분류와 응답 Writer 위임 | 실제 Redis·Session Filter 조합 |
| `SessionStoreFailureResponseWriterTest` | 미완성 응답 초기화·HTML/JSON 503·classpath fallback HTML | 정적 Resource·Session Cookie 조합 |
| `SessionStoreFailureIntegrationTest` | 실제 Tomcat의 Redis 미접속 HTML/JSON 503 | Login 성공 뒤 저장 실패 보상 |
| `ApiExceptionHandlerTest` | 선택된 REST Handler의 공통 JSON 오류 변환 | 실제 기능별 BFF 업무 계약 |
| `BffApiExceptionResolverTest` | Handler 실행 전 BFF 404·405·406·415 JSON 변환 | Security·Session Filter 경계 |
| `PageBusinessExceptionHandlerTest` | Page `BusinessException`의 HTML 오류 View | 전체 Browser 오류 흐름 |
| `FrontendApplicationTests` | 공개 Page·Health·405/503 Boot 오류 Fallback | Spring Security·Redis를 포함한 Browser E2E |

- 전체 Java Test
  - Docker 호환 Runtime 필요
- JavaScript 검증
  - Node.js 정적 문법 검사
  - Browser DOM 동작 미보장
- 결과 해석
  - 단위·Slice Test 통과와 실제 Browser·배포 Service 계약 통과 구분

## 9. 현행 Code TODO·FIXME

| 처리 시점 | 위치 | 현행 주석 |
|---|---|---|
| PR 직후 | `SessionStoreErrorFilter.java:36` | `TODO 로그인 성공 뒤 Session 저장 실패의 Refresh Token Family 폐기 보상` |
| Learning 연동 | `SecurityConfig.java:70` | `TODO 관리자 권한·기수 정책 적용` |
| Learning·화면 연동 후 | `managerLogin.html:1`, `managerRegister.html:1`, `managerLogin.js:1`, `managerRegister.js:1`, `managerAuth.css:1` | `FIXME: 단일 로그인·회원가입 전환 후 제거 예정인 레거시 분리 화면.` |

- Code 주석 상태
  - 이번 문서 변경 기준의 실제 TODO·FIXME 위치·문구
  - 이번 문서 변경에서는 Code 주석 미수정

## 10. 점검 근거

- [`SecurityConfig.java`](../../src/main/java/site/omagotchi/frontend/global/security/SecurityConfig.java)
- [`AuthenticatedLoginRequestFilter.java`](../../src/main/java/site/omagotchi/frontend/auth/presentation/security/AuthenticatedLoginRequestFilter.java)
- [`SignupPageController.java`](../../src/main/java/site/omagotchi/frontend/auth/presentation/page/SignupPageController.java)
- [`IdentityRestAuthClient.java`](../../src/main/java/site/omagotchi/frontend/auth/infrastructure/IdentityRestAuthClient.java)
- [`ApiExceptionHandler.java`](../../src/main/java/site/omagotchi/frontend/global/web/ApiExceptionHandler.java)
- [`SessionStoreErrorFilter.java`](../../src/main/java/site/omagotchi/frontend/global/session/SessionStoreErrorFilter.java)
- [`SessionStoreFailureResponseWriter.java`](../../src/main/java/site/omagotchi/frontend/global/session/SessionStoreFailureResponseWriter.java)
