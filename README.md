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
- Identity 주소: `IDENTITY_SERVICE_BASE_URL=http://localhost:8083`
- 서비스 인증 정보: Identity와 동일한 `FRONTEND_USERNAME`·`FRONTEND_PASSWORD`
- 운영 Identity 주소: `lb://identity-service`
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
- 내부 서비스 호출: Discovery·Client-side Load Balancing 사용
- Gateway 역할: 외부 `/api/**`·Webhook 경계
- 금지 사항: Browser JWT 저장, In-memory Session 자동 전환, Secret 하드코딩

## 현재 제한

- 관리자 대시보드: Learning Service 연동 전 Browser Prototype
- 관리자 접근 제어: 공통 Session 인증만 적용, 역할·기수 권한 검증 미적용
- 관리자 업무 데이터: Browser 저장소 기반 목업, 서버 권한 근거로 사용 불가
- BFF 업무 기능: 기능별 Endpoint·Access Token 갱신 미구현
- 레거시 관리자 인증 파일: Runtime Route·API 제거 상태

## 문서

- [전체 문서 안내](docs/README.md)
- [Frontend 동작 흐름](docs/onboarding/README.md)
- [관리자 대시보드 패널 작성](docs/manager-dashboard-panel-guide.md)
