# Omagotchi Frontend

Spring MVC·Thymeleaf 기반 화면 애플리케이션입니다.

## 역할

- 화면 렌더링: 사용자·관리자 페이지 제공
- 인증 경계: Browser Session 기반 로그인·로그아웃
- BFF 경계: Browser 요청 수신 및 내부 서비스 호출
- 세션 저장소: Spring Session Redis

## 로컬 실행

- 런타임: JDK 21
- 인증 의존성: Redis, Identity Service
- 통합 테스트 의존성: Docker 호환 Container Runtime
- 빌드 도구: Maven Wrapper

```bash
cp .env.local.example .env.local
./mvnw test
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

REST Docs를 포함한 검증 빌드는 테스트를 생략하지 않고 실행한다.

```bash
./mvnw clean verify
```

배포용 Docker 빌드는 테스트와 문서 생성을 생략하고 애플리케이션 JAR만 패키징합니다.
REST Docs 생성과 누락 검증은 PR CI의 `verify`에서 수행합니다.

빌드가 끝나면 `target/generated-docs/index.html`에서 HTML API 문서를 확인할 수 있다.
생성 파일이 없거나 이전 결과를 제거하고 다시 만들려면 `./mvnw clean package`를 실행한다.
HTML과 include 대상 파일은 존재하지만 IDE에서 경로가 unresolved로 보이면 Maven 프로젝트를 다시 불러오고 `{snippets}` AsciiDoc 속성이 `target/generated-snippets`를 가리키는지 확인한다. REST Docs 테스트가 먼저 `target/generated-snippets`를 생성한 뒤 도메인 문서의 include 경로를 확인한다.

Controller HTTP 계약과 REST Docs는 `@WebMvcTest`로 검증한다. BFF 테스트의
`FrontendMvcTestSupport`는 실제 보안 필터, 토큰 갱신 인터셉터, 세션 토큰 처리와
공통 예외 처리를 연결하고 Identity 호출·토큰 갱신 서비스·오류 로깅 경계만 mock으로 둔다.
각 테스트에서 대상 Controller를 지정하고, 필요한 서비스는 mock 또는 명시적으로 import한다.
Spring이 제공하는 `MockMvc`를 주입받으며 테스트 안에서 다시 만들지 않는다.

성공 요청은 인증 세션을 만들고 변경 요청에 `csrf()`를 명시한다. 무인증·CSRF 누락 테스트는
그 조건을 그대로 유지한다. 인터셉터·예외 처리기 자체의 단위 테스트와 하류 HTTP 계약 테스트는
별도로 유지한다. MVC slice는 하류 서비스의 실제 응답이나 전체 애플리케이션 연결까지
보장하지 않으므로, JSON fixture는 하류 응답 DTO와 함께 관리한다.

새 테스트의 어노테이션·줄바꿈·메서드 DisplayName·Given/When/Then 형식은
[컨트롤러 테스트 작성 기준](docs/testing/controller-test-style.md)을 따른다.

- 기본 화면: <http://localhost:8082/>
- 상태 확인: <http://localhost:8082/actuator/health>
- 포트 변경: `SERVER_PORT`

### 환경 설정

- 로컬 설정 파일: `.env.local`
- Git 추적 제외: `.env.local`
- Redis 논리 DB: `SESSION_REDIS_DATABASE`, 로컬 기본값 `0`
- Session 유휴시간: `application.yaml`의 기본값 `PT12H`, 마지막 서버 요청부터 12시간
  - 아직 유효한 기존 Session에도 다음 인증 BFF·권한 조회 Page 요청에서 현재 설정 적용
  - Infra의 30분 덮어쓰기 제거 후 서비스 기본값 사용, Frontend 배포 후 Infra 배포 순서
  - 이미 만료된 Session의 복구 제외, 기존 환경 파일에 `SESSION_TIMEOUT`이 있으면 해당 값 우선
- Identity 주소: `IDENTITY_SERVICE_BASE_URL=http://localhost:8083`
- Learning 주소: `LEARNING_SERVICE_BASE_URL=http://localhost:8084`
- 서비스 인증 정보: Identity와 동일한 `FRONTEND_USERNAME`·`FRONTEND_PASSWORD`
- Access Token 선제 갱신: `ACCESS_TOKEN_REFRESH_BEFORE_EXPIRY`
  - Identity가 발급하는 Access Token 수명보다 짧게 설정하고, 새 Token Bundle의 만료 시각은 Refresh 응답에서 검증
- Refresh Lock 대기·Polling·lease: `ACCESS_TOKEN_REFRESH_LOCK_WAIT_TIMEOUT`·`ACCESS_TOKEN_REFRESH_LOCK_POLL_INTERVAL`·`ACCESS_TOKEN_REFRESH_LOCK_LEASE`
  - lease는 Identity HTTP와 Redis Session 조회·저장 timeout보다 충분히 길게 설정하고 timeout 변경 시 함께 조정
- 세션·호출 timeout·Token 갱신 정책: `application.yaml` 기본값 사용, 기존 환경변수의 선택적 덮어쓰기 지원
  - Redis 주소·Credential·서비스 주소의 필수 주입 유지
- 운영 Identity 주소: `lb://identity-service`
- 운영 Learning 주소: `lb://learning-service`
- 운영 Service Discovery: `EUREKA_ENABLED=true`, `EUREKA_URL` 필수

## 디렉터리 구조

- 사용자 페이지: `templates/pages/{app,auth,manager,onboarding,public}`
- 관리자 대시보드: `templates/manager/dashboard/`
- 공통 화면 조각: `templates/fragments/`
- 관리자 대시보드 스크립트: `static/js/manager/dashboard/`
- 정적 리소스: `static/{css,js,images}`

## 인증·호출 기준

- Browser 저장 정보: Opaque Session Cookie만 허용
- Token 저장 위치: Spring Session Redis
- 가입 처리: 이메일 OTP 기반 `/bff/v2/auth/signup/**` JSON BFF
- 로그인 처리: Spring Security Form Login
- 로그아웃 처리: CSRF Token을 포함한 `POST /logout`
- 인증 사용자 화면: Spring Security의 서버 측 보호
- Browser 전용 API: 기본 `/bff/v1/**`, 회원가입 `/bff/v2/auth/signup/**`
- 내부 서비스 호출: 담당 Domain Service 직접 호출, Discovery·Client-side Load Balancing 사용
- Access Token 갱신: 만료 임박·만료 Token을 인증 BFF와 `/home`·`/manager-dashboard`·`/authenticated-landing` 진입 시 Redis Session 단위 single-flight Refresh
- 로그인 유지: Session 유휴 한도 안에서 요청 시 갱신, Refresh Token Family는 최초 로그인부터 7일 유지
- 요청 실행 기준: Refresh 성공 뒤에도 원래 Controller·downstream 요청은 최대 1회
- AI Chat 호출: Learning Service 직접 호출과 SSE 응답 전달
- Gateway 역할: 외부 `/api/**`·Webhook 경계
- 금지 사항: Browser JWT 저장, In-memory Session 자동 전환, Secret 하드코딩

## 파일 로딩 실패 안내

- 적용 화면: 사용자·로그인·온보딩 페이지와 관리자 대시보드
- 등록 위치: 각 페이지 또는 공통 Layout의 Head, 화면용 JS·CSS보다 먼저 등록
- 안내 대상: 앱 JS·CSS 로딩 오류, Vite 후속 모듈 로딩 실패, 홈·공간 모듈 초기화 실패
  - 파일 오류의 범위: 현재 페이지와 같은 출처의 `/js/`·`/css/` 경로
  - 외부 통계 스크립트 등의 로딩 실패·브라우저 차단은 공통 안내에서 제외
- 안내 방식: 화면 아래에 한 번 표시, 사용자가 새로고침 버튼을 누른 경우에만 페이지 갱신
  - 저장 전 입력과 진행 중 AI 응답의 확인 안내
  - 자동 새로고침·API 재전송·타이머 정지·재시작 없음
- 기존 업무 API 오류 처리·인증 화면의 캐시 보호 유지
- 한계: 안내 코드 자체의 로딩 실패, 이미 처리된 다른 모듈의 오류, 정상 응답한 구·신 파일의 혼합은 감지·예방 불가
  - 안내 코드가 없는 기존 페이지에는 소급 적용 불가
  - 배포 중 새로고침 후에도 오류 반복 가능
  - 이전 정적 파일의 공통 보관과 페이지 버전 안내는 향후 개선안

## 현재 제한

- 관리자 대시보드: Learning Service BFF 기반 기수·가입 신청·출결·가입 코드·학습 통계 연동
- 관리자 접근 제어: 공통 Session 인증만 적용, 역할·기수 권한 검증 미적용
- System Admin 사용자 권한·감사 로그: Identity 관리 API 미연결, 화면에서 비활성 상태로 안내
- BFF 업무 기능: 기능별 Endpoint 일부 연동
- 하류 `401`: 원래 요청을 재실행하지 않고 Browser Session을 폐기한 뒤 재로그인 요구
- Refresh 응답 미수신: 같은 요청에서는 재시도하지 않고 Session을 유지한 `503`, 다음 요청에서 재시도 가능
- Identity Refresh 응답 계약 위반: Cookie와 Session을 best-effort로 폐기한 뒤 재로그인 요구
- 새 Token Bundle 저장 결과 불명확: Cookie와 Session을 best-effort로 폐기한 뒤 재로그인 요구
- 비밀번호 변경 부분 성공: Identity에서 비밀번호가 변경된 뒤 Redis 장애가 발생하면 Frontend 세션 정리는 실패하고 응답은 `503`일 수 있음
- 계정 탈퇴 부분 성공: Identity에서 탈퇴가 완료된 뒤 Redis 장애가 발생하면 Frontend 세션 정리는 실패하고 응답은 `503`일 수 있음. [현재 Identity Access JWT 계약](https://github.com/nhnacademy-aiot3-omagotchi/docs/blob/main/30-adr/0014-access-jwt-revocation-and-account-auth-state.md)에 따라 남은 Session Access JWT는 기존 만료 시각까지 최대 15분 유효할 수 있음
- 레거시 관리자 인증 파일: Runtime Route·API 제거 상태

## 문서

- [전체 문서 안내](docs/README.md)
- [Frontend 동작 흐름](docs/onboarding/README.md)
- [관리자 대시보드 패널 작성](docs/guides/manager-dashboard-panel-guide.md)
