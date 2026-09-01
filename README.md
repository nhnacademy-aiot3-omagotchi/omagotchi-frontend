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

- 기본 화면: <http://localhost:8082/>
- 상태 확인: <http://localhost:8082/actuator/health>
- 포트 변경: `SERVER_PORT`

### 환경 설정

- 로컬 설정 파일: `.env.local`
- Git 추적 제외: `.env.local`
- Redis 논리 DB: `SESSION_REDIS_DATABASE`, 로컬 기본값 `0`
- Identity 주소: `IDENTITY_SERVICE_BASE_URL=http://localhost:8083`
- Learning 주소: `LEARNING_SERVICE_BASE_URL=http://localhost:8084`
- 서비스 인증 정보: Identity와 동일한 `FRONTEND_USERNAME`·`FRONTEND_PASSWORD`
- Access Token 선제 갱신: `ACCESS_TOKEN_REFRESH_BEFORE_EXPIRY`
  - Identity가 발급하는 Access Token 수명보다 짧게 설정하고, 새 Token Bundle의 만료 시각은 Refresh 응답에서 검증
- Refresh Lock 대기·Polling·lease: `ACCESS_TOKEN_REFRESH_LOCK_WAIT_TIMEOUT`·`ACCESS_TOKEN_REFRESH_LOCK_POLL_INTERVAL`·`ACCESS_TOKEN_REFRESH_LOCK_LEASE`
  - lease는 Identity HTTP와 Redis Session 조회·저장 timeout보다 충분히 길게 설정하고 timeout 변경 시 함께 조정
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
- 가입 처리: Spring MVC Form Binding·Validation
- 로그인 처리: Spring Security Form Login
- 로그아웃 처리: CSRF Token을 포함한 `POST /logout`
- 인증 사용자 화면: Spring Security의 서버 측 보호
- Browser 전용 API: `/bff/v1/**`
- 내부 서비스 호출: 담당 Domain Service 직접 호출, Discovery·Client-side Load Balancing 사용
- Access Token 갱신: 만료 임박 BFF 요청 진입 시 Redis Session 단위 single-flight Refresh
- 요청 실행 기준: Refresh 성공 뒤에도 원래 Controller·downstream 요청은 최대 1회
- AI Chat 호출: Learning Service 직접 호출과 SSE 응답 전달
- Gateway 역할: 외부 `/api/**`·Webhook 경계
- 금지 사항: Browser JWT 저장, In-memory Session 자동 전환, Secret 하드코딩

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
