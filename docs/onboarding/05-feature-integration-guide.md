# Frontend 기능 연동 개발 가이드

> 대상: Browser Prototype을 실제 기능으로 전환하는 Frontend·도메인 Service 개발자
>
> 목적: 화면별 Server Rendering과 JavaScript BFF 호출을 구분하고, Browser Session을 Domain Service까지 안전하게 연결하는 작업 기준

## 1. 정본과 역할

| 판단 대상 | 확인 위치 | Frontend 책임 |
|---|---|---|
| 제품 요구·수용 기준 | 상위 `docs/10-specifications` | 화면 흐름과 표시 조건 반영 |
| API 요청·응답 계약 | 대상 Service REST Docs·현재 Code | 필요한 화면 계약으로 변환 |
| Browser 인증·BFF 경계 | [ADR 0009](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/30-adr/0009-browser-authentication-and-frontend-development-model.md) | Opaque Session Cookie 처리, Token 비노출 |
| 내부 호출 경로 | [ADR 0010](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/30-adr/0010-frontend-bff-internal-api-routing.md), [내부 HTTP 호출 가이드](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/50-guides/12-internal-http-communication.md) | Service별 직접 Client, 운영 Discovery·LoadBalancer |
| 오류 계약 | [공통 예외 처리](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/50-guides/04-error-handling.md), [오류·장애 흐름](03-error-and-failure-flow.md) | 화면·JSON 응답 분리, 안전한 오류 표시 |

- Browser Prototype의 `localStorage`·`sessionStorage` 값
  - 화면 전환 전 임시 표시 상태
  - 업무 데이터·권한·인증의 정본 아님
- Frontend BFF
  - 화면·기능 단위의 Web 계약
  - Browser 공개 Prefix: `/bff/v1/**`
  - 임의 URL을 전달받아 중계하는 범용 Proxy 아님
- Domain Service
  - 데이터·업무 규칙·기수 소속·리소스 권한의 최종 판단
  - Frontend의 화면 표시 조건으로 최종 인가 대체 금지

## 2. 처리 위치 선택

| 화면 요구 | 기본 선택 | 이유 |
|---|---|---|
| 최초 화면에 반드시 필요한 조회 데이터 | Page Controller + `Model` + Thymeleaf | 첫 HTML과 데이터의 일관된 반환 |
| 일반 생성·수정 Form, 실패 시 같은 Form 복구 | Page Controller + Binding/Validation + PRG | CSRF, Field Error, Redirect 흐름 재사용 |
| 사용자 이벤트 뒤 일부 영역만 갱신 | 같은 Origin의 기능별 JSON BFF + JavaScript `fetch` | 전체 Page 재로딩 없는 부분 Rendering |
| 한 Page의 초기 조회와 이후 갱신 | SSR 초기 Model + 기능별 JSON BFF | 최초 표시와 상호작용의 책임 분리 |
| 브라우저 저장소만 읽는 기존 Prototype | 기능별 BFF 우선 추가 | 저장소 값을 업무 정본으로 승격하지 않음 |

```text
SSR
Browser GET → Frontend Page Controller → Domain Service Client → Model → Thymeleaf HTML

부분 갱신
Browser JavaScript → Frontend /bff/v1/** → Domain Service Client → JSON → DOM 갱신
```

- Browser → Domain Service 직접 호출 금지
  - Access·Refresh Token 원문과 Domain API 계약을 Browser에 노출하지 않음
- Browser → Gateway의 `/api/**` 직접 호출 금지
  - 기능이 실제 BFF로 전환되면 해당 Prototype fallback을 제거하거나 사용하지 않음
  - 네트워크 실패를 `null`·Browser 저장소 값으로 숨기지 않음
- Server Rendering과 JSON Endpoint의 혼합 가능
  - 같은 Use Case라도 HTML Model과 JSON DTO는 각각 화면 요구에 맞게 소유

### BFF Route 규칙

- Base Path
  - `/bff/v1`
- 예시
  - `GET /bff/v1/rankings?period=WEEKLY`
  - `PUT /bff/v1/users/me/character`
  - `GET /bff/v1/manager/cohorts/{cohort-id}`
- 구분
  - `/bff`: Browser → Frontend 계약
  - `/api`: Browser·외부 Client → Gateway 계약
  - 대상 Service 내부 `/api/v1/**`: Frontend → Domain Service 계약
- 금지
  - `/api/**`를 Frontend BFF Route로 재사용
  - `/bff/v1/{service-name}/**` 형태의 범용 Service Proxy

## 3. 구현 순서

### 3.1 기능 계약 합의

- 대상 Service와 합의할 항목
  - Resource 소유 Service
  - 요청 경로·Method·Request/Response DTO·성공 Status
  - 사용자 JWT 필요 여부와 JWT `sub` 사용 규칙
  - 업무 거절 `4xx` Code·Status, 존재 은닉 `404`, 권한 부족 `403` 구분
  - 일시 장애 `503`, 응답 계약 위반 `502` 표시 정책
  - Pagination·정렬·시간대·빈 결과·멱등성
- Frontend 산출물
  - Page Route 또는 기능별 JSON Route
  - 화면용 입력·출력 DTO
  - HTML/JSON별 성공·실패 화면
  - Prototype 저장소 Key의 제거 또는 비정본 표시 계획
- 금지
  - 다른 저장소의 Java DTO·Exception Class 공유 의존성
  - 문서 없이 Domain API의 응답 필드·상태를 추정한 구현

### 3.2 Application Port와 대상별 Client

```text
Page Controller 또는 RestController
→ 기능 Application Service
→ 대상 Service Application Port
→ 대상별 Rest Client Adapter
→ HTTP Service Interface·Wire DTO
→ Learning / Rule / Identity
```

- Application Port
  - 화면 Use Case가 필요한 성공 결과와 판단이 필요한 실패만 노출
  - `ResponseEntity`, `RestClient`, Discovery Type, HTTP DTO 비노출
- 대상별 Adapter
  - 대상 Service마다 HTTP Service Interface·Wire DTO·Adapter 분리
  - 성공 Status·필수 Body 검증
  - 호출별 공개 가능한 `4xx`만 선택 변환
- 공통 처리 재사용 범위
  - 연결·응답 Timeout, 서비스 인스턴스 부재, 공통 오류 본문 해석
  - `RestClientCallExecutor`, `ApiErrorResponseDecoder`와 같은 전송 계층 공통화
- 공통 처리 비대상
  - Learning의 소속 오류와 Rule의 설정 오류처럼 호출별 의미가 다른 `4xx`
  - 화면용 결과 조합과 DTO 변환

- Identity 인증 Client 참고 형태
  - `IdentityAuthHttpService` → `IdentityRestAuthClient` → `IdentityAuthClient`
  - 대상별 HTTP Interface·Adapter·Port 분리
- Domain 호출 인증 기준
  - Identity 인증용 Frontend Basic Credential 정책 복사 금지
  - 사용자 요청 대행 호출의 Session Access JWT 사용

### 3.3 주소 선택과 내부 인증

| 환경 | 대상 주소 | 검증 |
|---|---|---|
| `local` | `.env.local`의 `http://localhost:{service-port}` | 필요한 Service를 함께 실행, 설정 누락 시 시작 실패 |
| 운영 | 논리 Service 이름 또는 `lb://{service-name}` | Eureka 조회, Client-side Load Balancing, 정상 인스턴스 선택 |

- Frontend → Domain Service
  - Frontend Session에서 Access JWT를 읽어 `Authorization: Bearer`로만 전달
  - Browser Session Cookie, Refresh Token, Frontend Basic Credential 전달 금지
  - 대상 Domain Service의 JWT 재검증과 최종 인가 필수
- Frontend → Identity 인증 API
  - 사용자 요청을 대신하는 Domain 호출과 다른 경계
  - Frontend 프로세스 Credential의 허용 범위를 인증 API로 제한
- 운영 직접 호출
  - Gateway를 경유하지 않는다는 뜻
  - 고정 IP·임시 host port 사용이라는 뜻 아님
  - Frontend의 첫 대상 Service 연동에서 Discovery와 LoadBalancer를 실제로 검증

## 4. Browser Session·CSRF·권한

### 4.1 Session과 Token

- Browser 보관 값
  - HttpOnly Opaque Session Cookie만 보관
  - Access Token·Refresh Token·권한 판단값 보관 금지
- Frontend 보관 값
  - Spring Session의 인증 정보와 Token Bundle
  - Token 원문을 HTML·JavaScript·Cookie·Log·오류 응답에 포함하지 않음
- 기능 Endpoint
  - Page와 JSON Endpoint 모두 Spring Security 인증 규칙 등록
  - `/bff/v1/**`의 공통 JSON `401`·`403` 경계 재사용
  - HTML Page의 Login Redirect 정책과 분리

### 4.2 CSRF

- 상태 변경 Form
  - Thymeleaf CSRF hidden input 사용
  - Server Binding·Validation 오류는 같은 Form으로 복구
- JavaScript `fetch`의 상태 변경 요청
  - Session Cookie를 사용하는 Same-Origin 요청임을 전제
  - CSRF Token 노출 위치와 Header/Parameter 이름을 Endpoint 추가 시 확정
  - SSR이 제공한 신뢰 가능한 Token만 전송
  - Token 없이 `POST`·`PUT`·`PATCH`·`DELETE` 요청을 허용하지 않음
- 조회 요청
  - 무상태 `GET`만 사용
  - `GET`에 상태 변경을 배치하지 않음

### 4.3 권한

- Frontend
  - Page·버튼·메뉴의 최소 표시 제어
  - 사용자 입력의 `userId`, 전역 Role, Browser 저장소 값을 인가 근거로 신뢰하지 않음
- Domain Service
  - JWT `sub` 기반 사용자 식별
  - 기수 소속 상태·기수 역할·리소스 범위의 최신 상태 조회
  - 대상 기수 미소속 `404`와 역할 부족 `403`의 계약 소유

## 5. HTML과 JSON 오류 경계

| 실패 | HTML Page·Form | 기능별 JSON BFF |
|---|---|---|
| 입력 오류 | Field Error + 동일 Form | `400` + 공통 JSON 오류 본문 |
| 예상 업무 거절 | 화면 정책에 따른 Form 복구·오류 Page | 합의한 `4xx` + `code` |
| 미인증·권한 부족 | Login Redirect 또는 HTML 오류 | JSON `401`·`403` 정책 |
| 대상 Service 일시 장애 | HTML 오류 Page | `503` + 재시도 가능한 안내 |
| 대상 응답 계약 불일치 | HTML 오류 Page | `502` + 상세 정보 비공개 |
| 예상하지 못한 실패 | Boot 오류 처리 | `500` + 상세 정보 비공개 |

- JSON 본문
  - `code`, `message`, `path`, `requestId` 계약 사용
  - HTTP Status는 응답 Status로만 전달; 본문 `status` 중복 금지
  - JavaScript는 Status·`code`로 분기하고 안전한 `message`만 표시
- `ApiExceptionHandler`
  - 선택된 `@RestController`의 MVC 예외 처리 경계
- `BffApiExceptionResolver`
  - `/bff/v1/**` Mapping·표현 협상 `404/405/406/415`의 JSON 처리
- `BffApiSecurityErrorHandler`
  - `/bff/v1/**` 미인증·권한·CSRF의 JSON `401/403` 처리
- `SessionStoreErrorFilter`
  - `/bff/v1/**` Redis Session 장애 포착
- `SessionStoreFailureResponseWriter`
  - Redis Session 장애의 경로별 JSON·HTML `503` 작성
- 기능 PR Test
  - 새 Endpoint의 Validation·업무 오류와 실제 Method·Content-Type 검증
- 원인 보존
  - Adapter가 실패를 변환하면 원본 `cause` 보존
  - Token·Cookie·Credential·Stack Trace·진단 상세의 Browser 노출 금지

## 6. 관리자 Learning 연동 예시

> 예시: 관리자 Dashboard가 특정 기수의 운영 요약을 표시하거나 부분 갱신하는 경우. 실제 Endpoint·DTO·Route는 Learning Service 계약 합의 전까지 확정하지 않는다.

```text
관리자 Browser
→ Frontend 관리자 Page 또는 JSON BFF
→ Session의 Access JWT relay
→ Discovery·LoadBalancer
→ Learning Service
→ JWT sub + 대상 cohort의 ACTIVE MANAGER 소속 확인
→ 화면용 응답
```

- SSR 선택 예시
  - Dashboard 첫 진입에 필요한 기수 목록·요약 조회
  - Page Controller가 화면용 Model 구성
- JSON BFF 선택 예시
  - 기간·기수 Filter 변경, 승인 대기 목록 새로고침, 일부 지표 갱신
  - 같은 Origin의 Frontend JSON Endpoint와 JavaScript `fetch` 사용
- 금지
  - 별도 관리자 Login·Browser 저장소 `MANAGER` 값으로 권한 부여
  - Frontend의 전역 `authenticated()`만으로 기수 관리자 인가 완료 판단
  - URL의 `cohortId`만으로 대상 기수 권한 인정
- 우선 합의 항목
  - Learning이 제공하는 관리자 Use Case·Response DTO
  - 기수 소속 없음 `404`, 소속은 있으나 역할 부족 `403`
  - 화면에서 선택할 수 있는 기수 범위와 Server의 최종 검증

## 7. 검증 체크리스트

### 계약·Client

- [ ] 대상 Service REST Docs 또는 합의된 계약의 Request·Response·Status 확인
- [ ] HTTP Service Interface 요청 JSON·Header·성공 Status Test
- [ ] 성공 Body 누락·형식 오류의 `502` 변환 Test
- [ ] 공개 가능한 대상 `4xx`, 대상 `5xx`, 연결·Timeout·인스턴스 부재의 변환 Test
- [ ] Token·Cookie·Credential 비노출 Test 또는 Log 검토

### MVC·Security

- [ ] SSR Page의 인증 전 Redirect, 인증 후 Model·View Test
- [ ] Form의 CSRF 누락·Binding 오류·성공 Redirect Test
- [ ] JSON BFF의 인증·권한·CSRF·Content-Type Test
- [ ] JSON `401`·`403`, Redis Session 장애 `503`의 실제 응답 형식 Test
- [ ] Page 오류가 JSON으로, JSON 오류가 HTML로 섞이지 않는 Test

### 통합 검증

- [ ] Redis Session 복원과 Access JWT relay 확인
- [ ] local 고정 주소 호출 Test
- [ ] 운영 논리 Service 이름·Discovery·LoadBalancer 설정 검증
- [ ] 대상 Service의 JWT 재검증·기수/리소스 최종 인가 통합 Test
- [ ] Prototype fallback 제거 뒤 네트워크 실패가 사용자에게 보이는지 확인
- [ ] Java Test와 JavaScript Test를 각각 실행하고 결과 기록

- 실행 기준: [통합 테스트 가이드](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/50-guides/11-integration-test-guide.md)
- Test 통과 범위
  - Frontend 단위 Test와 대상 Service 배포 계약 분리
  - Frontend 단위 Test와 Eureka 연결 분리
  - Frontend 단위 Test와 Browser 전체 E2E 분리

## 8. 기능 PR 완료 조건

- [ ] 화면 요구와 Domain API 계약 링크
- [ ] SSR/JSON 선택 근거와 Route 목록
- [ ] 대상별 Application Port·Client·Wire DTO
- [ ] local/운영 주소·Timeout·Discovery 설정
- [ ] Session Access JWT relay, Cookie/Refresh Token 차단
- [ ] CSRF·HTML/JSON 인증·인가 오류 정책
- [ ] `4xx`·`502`·`503`·`500` 사용자 표시와 원인 Log 정책
- [ ] Client·MVC·Redis·대상 Service 통합 Test 결과
- [ ] 대체된 Prototype 저장소·`api.js` fallback 제거 또는 비정본화
- [ ] 운영에 미지원인 동작과 후속 TODO의 명시

## 9. 탐색 시작점

- Page Route·View: [`WebConfig.java`](../../src/main/java/site/omagotchi/frontend/global/config/WebConfig.java)
- Page 보안·Login·Logout: [`SecurityConfig.java`](../../src/main/java/site/omagotchi/frontend/global/security/SecurityConfig.java)
- Session Token 접근: [`BrowserSessionTokens.java`](../../src/main/java/site/omagotchi/frontend/auth/presentation/security/BrowserSessionTokens.java)
- 대상별 Client 참고: [`IdentityAuthHttpService.java`](../../src/main/java/site/omagotchi/frontend/auth/infrastructure/IdentityAuthHttpService.java), [`IdentityRestAuthClient.java`](../../src/main/java/site/omagotchi/frontend/auth/infrastructure/IdentityRestAuthClient.java)
- 공통 Outbound 실패: [`RestClientCallExecutor.java`](../../src/main/java/site/omagotchi/frontend/global/http/RestClientCallExecutor.java), [`ApiErrorResponseDecoder.java`](../../src/main/java/site/omagotchi/frontend/global/http/ApiErrorResponseDecoder.java)
- JSON 오류 경계: [`ApiExceptionHandler.java`](../../src/main/java/site/omagotchi/frontend/global/web/ApiExceptionHandler.java)
- BFF 경로·Handler 선택 오류: [`BffApiPaths.java`](../../src/main/java/site/omagotchi/frontend/global/web/BffApiPaths.java), [`BffApiExceptionResolver.java`](../../src/main/java/site/omagotchi/frontend/global/web/BffApiExceptionResolver.java)
- 기존 Prototype 경계: [요청·Page·JavaScript 흐름](01-request-page-and-browser-flow.md)
