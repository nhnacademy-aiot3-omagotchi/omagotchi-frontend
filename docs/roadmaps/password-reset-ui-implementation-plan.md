# 비밀번호 재설정 UI 구현 계획

- 상태: 구현 및 로컬 검증 완료, 실서비스 연동 검증 대기
- 작성일: 2026-09-04
- 검증일: 2026-09-04
- 적용 대상: Frontend 공개 비밀번호 재설정 페이지
- 선행 조건: Identity 비밀번호 재설정 API 및 Frontend BFF 구현

## 구현 결과

- 단계 1~6 구현 완료
- Frontend JavaScript Test 235건 통과
- 관련 Spring MVC·BFF Test 28건 통과
- Frontend Maven 단위 Test 566건 및 JaCoCo 기준 통과
- Storybook 정적 Build 통과
- Storybook 1280×800 및 390×844 렌더·스크롤 확인
- `git diff --check` 통과
- 실제 Identity·메일을 사용하는 OTP 수신과 새 비밀번호 로그인 검증은 별도 환경 과제

## 1. 진행 원칙

- 한 번에 한 단계만 변경하고 검증 결과와 변경 범위를 사용자에게 제시한다.
- 사용자 승인 전에는 다음 단계로 넘어가지 않는다.
- 기존 비밀번호 재설정 BFF 변경과 다른 작업 트리 변경을 보존한다.
- 직접 stage 또는 commit하지 않는다.
- 새 Java 주석은 한 줄 주석과 명사형 종결을 사용한다.
- CAPTCHA는 구현하지 않고 기존 BFF 진입점의 `TODO` 상태를 유지한다.

## 2. 현재 구조와 적용 판단

### 현재 구조

- 로그인 페이지의 `비밀번호를 잊으셨나요?` 링크는 `/password-change`를 사용한다.
- `/password-change`는 `WebConfig`의 단순 View Controller가 기능 없는
  `pages/auth/passwordChange.html`을 반환한다.
- 회원가입 페이지는 하나의 문서 안에서 가입 정보 단계와 OTP 단계를 `hidden`으로 전환한다.
- 회원가입 JavaScript는 Challenge 식별자, 만료 시각과 재전송 쿨다운을 메모리에 보관한다.
- 회원가입과 로그인은 `auth.css`, `passwordToggle.css`와 동일한 Auth shell을 사용한다.
- 비밀번호 재설정 BFF는 다음 계약을 제공한다.

| Browser API | 요청 | 성공 |
| --- | --- | --- |
| `POST /bff/v2/auth/password-reset/email-otp` | `email` | `202`, `challengeId`, `expiresInSeconds` |
| `PATCH /bff/v2/auth/password-reset` | `email`, `newPassword`, `challengeId`, `code` | `204` |

### 적용 판단

- 정식 Page 경로는 기능 의미에 맞는 `/password-reset`을 사용한다.
- 기존 `/password-change`는 링크 호환을 위해 `/password-reset`으로 Redirect한다.
- 화면 전환은 별도 URL 이동이 아니라 같은 문서의 두 Step 전환으로 구현한다.
- `challengeId`, 이메일, 만료 시각은 JavaScript 메모리에만 보관한다.
- 비밀번호 확인값은 Browser 검증에만 사용하며 BFF 요청에는 포함하지 않는다.
- 회원가입과 공통인 HTTP·OTP 시간 계산은 공유하되, 가입과 재설정의 DOM 흐름은 분리한다.
- 페이지 라우팅은 `global.WebConfig`가 아니라 `auth.presentation.page`가 소유한다.

## 3. 목표 사용자 흐름

### Step 1. 이메일 입력 및 OTP 발급

1. 사용자가 로그인 페이지에서 `비밀번호를 잊으셨나요?`를 선택한다.
2. `/password-reset`에서 이메일을 입력한다.
3. `인증번호 받기`를 누르면 CSRF Header를 포함해 OTP 발급 BFF를 호출한다.
4. `202 Accepted`이면 계정 등록 여부와 관계없이 같은 성공 문구를 표시한다.
5. `challengeId`, 발급 이메일과 만료 시각을 메모리에 저장하고 Step 2로 전환한다.

### Step 2. OTP 및 새 비밀번호 입력

1. 발급 이메일을 마스킹해서 표시한다.
2. 다음 입력 필드를 제공한다.
   - 숫자 6자리 OTP
   - 새 비밀번호
   - 새 비밀번호 확인
3. OTP 만료까지 남은 시간을 표시한다.
4. 두 비밀번호가 같고 공통 비밀번호 정책을 만족할 때만 제출을 허용한다.
5. 제출 시 비밀번호 확인값을 제외한 BFF 계약만 `PATCH`로 전송한다.
6. `204 No Content`이면 민감 입력과 Challenge 상태를 제거한 뒤 로그인 페이지로 이동한다.
7. 로그인 페이지에는 비밀번호 재설정 완료 안내를 표시한다.

### 보조 흐름

- 재전송은 `Retry-After`가 끝난 뒤에만 허용한다.
- 재전송 성공 시 새 Challenge로 교체하고 OTP 입력을 초기화한다.
- 이메일 수정은 현재 Challenge, OTP와 비밀번호 입력을 모두 제거하고 Step 1로 돌아간다.
- OTP 만료 시 제출을 막고 재전송 동작을 안내한다.
- BFCache 복원이나 `pagehide` 시 Challenge와 민감 입력을 초기화한다.

## 4. Browser 상태 모델

| 상태 | 화면 | 허용 동작 |
| --- | --- | --- |
| `email` | 이메일 입력 | OTP 발급 |
| `requesting` | 이메일 입력 | 중복 요청 차단 |
| `challenge` | OTP·비밀번호 입력 | 재설정, 재전송, 이메일 수정 |
| `expired` | OTP·비밀번호 입력 | 재전송, 이메일 수정 |
| `resetting` | OTP·비밀번호 입력 | 중복 제출 차단 |
| `success` | 완료 안내 | 로그인 이동 |

상태값은 화면 표시를 위한 Browser 상태이며 서버 Challenge 상태를 추정하지 않는다. 최종 판정은
BFF와 Identity 응답을 기준으로 한다.

## 5. 입력 및 보안 정책

- 이메일은 전송 전에 앞뒤 공백만 제거한다.
- OTP는 숫자 6자리만 입력 가능하게 제한한다.
- 새 비밀번호는 Identity와 동일한 공통 정책을 Browser 편의 검증에 사용한다.
  - 15자 이상 64자 이하
  - 공백만으로 구성된 값 거절
  - ISO 제어 문자 거절
  - UTF-8 기준 72Byte 초과 거절
- Browser 검증은 편의 기능이며 BFF와 Identity 검증을 대체하지 않는다.
- 이메일, OTP, 새 비밀번호와 Challenge 식별자를 URL, `localStorage`, `sessionStorage`에 저장하지 않는다.
- 모든 BFF 호출은 `credentials: "same-origin"`과 Page의 CSRF Token/Header를 사용한다.
- 자동 로그인이나 새 인증 Session 발급을 수행하지 않는다.
- 계정 등록 여부를 추론할 수 있는 문구나 분기 표시를 추가하지 않는다.

## 6. 오류 표시 계약

| 응답 | UI 처리 |
| --- | --- |
| `ACCOUNT_INVALID_EMAIL` | 이메일 형식 확인 안내, Step 1 유지 |
| `EMAIL_VERIFICATION_COOLDOWN_ACTIVE` | `Retry-After` 기반 재전송 카운트다운 |
| `ACCOUNT_INVALID_PASSWORD` | 비밀번호 정책 안내, Step 2 유지 |
| `AUTH_PASSWORD_RESET_INVALID` | 계정·상태·OTP 원인을 구분하지 않는 일반 안내, OTP 입력 초기화 |
| `COMMON_INVALID_REQUEST` | 현재 Step 입력값 확인 안내 |
| `COMMON_SERVICE_UNAVAILABLE` | 일시 장애 안내와 재시도 허용 |
| 알 수 없는 오류 또는 응답 계약 위반 | 내부 정보 없는 일반 실패 안내 |

응답 `message`는 표시할 수 있지만 UI 분기는 HTTP 상태와 `code`를 기준으로 한다.

## 7. 파일 구조 계획

### Page와 경로

- 추가: `auth/presentation/page/PasswordResetPageController.java`
  - `/password-reset` Page 반환
  - `/password-change`의 호환 Redirect
- 변경: `global/config/WebConfig.java`
  - 비밀번호 재설정 Feature View 매핑 제거
- 변경: `global/security/SecurityConfig.java`
  - `/password-reset` 익명 접근 허용
  - 호환 Redirect 경로 유지
- 변경: `templates/pages/auth/login.html`
  - 분실 링크를 `/password-reset`으로 변경
- 교체: `templates/pages/auth/passwordChange.html` → `passwordReset.html`

### Browser 모듈

- 추가: `static/js/authApi.js`
  - CSRF 포함 JSON 요청과 안전한 오류 해석
- 추가: `static/js/emailVerification.js`
  - Challenge 응답 검증, 만료 시간, 쿨다운, 이메일 마스킹
- 추가: `static/js/passwordPolicy.js`
  - 회원 설정과 재설정이 공유하는 비밀번호 정책 검증
- 추가: `static/js/passwordResetFlow.js`
  - 재설정 입력 정규화, 비밀번호 확인과 최종 Payload 생성
- 추가: `static/js/passwordReset.js`
  - Page DOM과 두 BFF 호출의 Orchestration
- 변경: `static/js/register.js`, `registerEmailVerification.js`
  - 공통 HTTP·OTP 함수 사용
- 변경: `static/js/accountSettings.js`
  - 공통 비밀번호 정책 함수 사용

공유 모듈은 Protocol과 순수 계산만 소유한다. 회원가입과 비밀번호 재설정의 필드 구성, 메시지와
Step 전환은 각 Page 모듈이 소유한다.

### 스타일과 Storybook

- 변경: `static/css/auth.css`
  - 기존 Auth shell과 `ui-email-verification`을 우선 재사용
  - OTP·비밀번호 3개 필드가 있는 Step 2의 간격과 작은 화면 높이만 최소 보완
- 변경: `main/frontend/ui/AuthScreen.jsx`
  - 비밀번호 재설정 이메일·Challenge 상태를 디자인 검증용 Mode로 추가
- 변경: `main/frontend/ui/AuthScreen.stories.jsx`
  - 이메일 입력, OTP 발급 완료, 만료, 쿨다운, 오류, 모바일 Story 추가

Storybook은 실제 실행 경로가 아니다. 실제 Thymeleaf 템플릿과 같은 클래스·필드 순서를 유지하는
시각 검증 수단으로만 사용한다.

### 테스트

- 추가: `PasswordResetPageMvcTest.java`
- 추가: `passwordResetFlow.test.mjs`
- 추가: `passwordResetMarkup.test.mjs`
- 추가 또는 변경: 공통 HTTP·OTP·비밀번호 정책 Node 테스트
- 변경: `AuthenticationSecurityMvcTest.java`
- 변경: `authHeroMarkup.test.mjs`

## 8. 단계별 구현과 검토 게이트

### 단계 0. 계획 저장

- 변경: 이 문서만 추가
- 검증:
  - 현재 Page·BFF·회원가입 흐름과 계획 일치 여부
  - `git diff --check`
- 완료 조건: 사용자 승인

### 단계 1. Page 경로와 렌더링 소유권 정리

- 변경:
  - `PasswordResetPageController` 추가
  - 정식 `/password-reset`과 호환 `/password-change` Redirect 추가
  - `WebConfig`의 Feature View 매핑 제거
  - 로그인 링크와 Security 공개 경로 갱신
- 비변경: Page 본문, JavaScript, BFF
- 검증:
  - Page MVC Test
  - 익명 접근 및 로그인 링크 계약 Test
  - Legacy 경로 Redirect Test
- 완료 조건: 사용자 승인

### 단계 2. Browser 공통 경계 분리

- 변경:
  - CSRF JSON 요청, OTP 시간 계산과 비밀번호 정책을 작은 공유 모듈로 추출
  - 회원가입과 계정 설정의 기존 동작을 새 모듈에 연결
- 비변경: 비밀번호 재설정 Page 동작
- 검증:
  - 기존 회원가입 OTP Node Test
  - 기존 계정 설정 비밀번호 검증 Test
  - 신규 공통 모듈 Test
- 완료 조건: 사용자 승인

### 단계 3. 비밀번호 재설정 정적 화면

- 변경:
  - 기존 안내 템플릿을 Auth shell 기반 `passwordReset.html`로 교체
  - 이메일 Step과 OTP·새 비밀번호·확인 Step 마크업 추가
  - CSRF Meta, BFF 경로 Data Attribute, 접근성 속성 추가
  - 최소 CSS 및 Password Toggle 연결
- 비변경: 실제 BFF 호출과 화면 전환
- 검증:
  - Template Markup Test
  - Page MVC Test
  - 넓은 화면·모바일 수동 렌더 확인
- 완료 조건: 사용자 승인

### 단계 4. 순수 재설정 흐름과 상태 전환

- 변경:
  - 이메일 정규화, 비밀번호 확인, BFF Payload 생성
  - Challenge 만료와 쿨다운 상태 계산
  - 입력 오류별 표시 정책
- 비변경: 실제 Network 호출
- 검증:
  - `passwordResetFlow.test.mjs`
  - 비밀번호 일치·정책 경계값 Test
  - 민감값이 Payload와 저장소에 불필요하게 포함되지 않는지 Test
- 완료 조건: 사용자 승인

### 단계 5. BFF 호출과 실제 화면 전환

- 변경:
  - OTP 발급 `POST` 연결
  - 성공 후 Step 2 전환과 Focus 이동
  - 비밀번호 재설정 `PATCH` 연결
  - 재전송·이메일 수정·만료·중복 요청 차단
  - 성공 후 상태 삭제와 `/login?notice=password-reset` 이동
- 검증:
  - Mock Fetch 기반 요청 Method·Header·Body Test
  - OTP 발급, 재전송, 재설정 성공·오류 흐름 Test
  - 기존 BFF MVC Test 회귀
- 완료 조건: 사용자 승인

### 단계 6. Storybook·접근성·반응형 검증

- 변경:
  - AuthScreen 비밀번호 재설정 Mode와 상태별 Story 추가
  - 실제 템플릿과 Storybook Markup 계약 보강
- 검증:
  - Story play Test
  - Storybook Build
  - 키보드 Tab 순서, `aria-live`, Focus 이동, Password Toggle 확인
  - 모바일에서 Step 2 Field와 버튼 접근 가능 여부 확인
- 완료 조건: 사용자 승인

### 단계 7. 전체 검증과 문서 마감

- 변경:
  - 실제 구현 결과에 맞춰 이 문서의 상태 갱신
  - 필요하면 Frontend·Backend 연결 문서의 비밀번호 재설정 경로 갱신
- 검증:
  - 비밀번호 재설정 및 회원가입 Node Test
  - Frontend 전체 JavaScript Test
  - 관련 Spring MVC·BFF Test
  - `./mvnw verify -DskipITs`
  - `git diff --check`
  - 변경 파일 범위 확인
- 별도 환경 검증:
  - 실제 Identity와 메일을 사용한 OTP 수신
  - 새 비밀번호 로그인
  - 재사용된 Challenge 거절
- 완료 조건: 사용자 승인 후 UI 구현 종료

## 9. 완료 기준

- 비로그인 사용자가 이메일 입력 후 같은 Page에서 OTP·새 비밀번호·확인을 입력할 수 있다.
- 등록 여부를 드러내지 않고 OTP 발급 성공 화면으로 전환한다.
- OTP 만료와 공유 발송 쿨다운이 서버 계약과 일치한다.
- 새 비밀번호 확인값은 Browser 밖으로 전송되지 않는다.
- CSRF가 없는 BFF 쓰기 요청을 만들지 않는다.
- Challenge와 민감값을 URL이나 Browser 영구 저장소에 남기지 않는다.
- 성공 후 자동 로그인 없이 로그인 Page로 이동한다.
- 기존 회원가입 OTP와 계정 설정 비밀번호 변경 흐름에 회귀가 없다.
- 넓은 화면과 모바일에서 기존 Auth 디자인과 접근성 계약을 유지한다.

## 10. 매 단계 보고 형식

1. 이번 단계의 변경 파일과 사용자 흐름
2. 실행한 검증과 결과
3. 구조·보안 판단과 남은 위험
4. 다음 단계의 비변경 범위
5. 직접 commit하지 않았다는 확인
6. 변경점을 포함한 한국어 권장 commit message
