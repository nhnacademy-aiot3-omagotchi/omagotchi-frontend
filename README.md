# Omagotchi Frontend

Spring MVC와 Thymeleaf를 사용하는 Omagotchi의 화면 애플리케이션입니다.

## 로컬 실행

요구 사항은 JDK 21입니다. 전체 Test의 Redis 통합 검증에는 Docker 호환 Container Runtime이 필요합니다.
별도의 Maven 설치 없이 Maven Wrapper를 사용합니다.

```bash
cp .env.local.example .env.local
./mvnw test
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

로컬 인증 흐름은 Redis와 Identity Service를 함께 사용합니다. `.env.local`의 모든 값을
실행 환경에 맞게 설정하고 `FRONTEND_USERNAME`·`FRONTEND_PASSWORD`는 Identity와 같은
Frontend 호출 Credential로 주입합니다. `.env.local`은 Git에 포함하지 않습니다.

별도 `local-stack` Profile은 사용하지 않습니다. 하나의 `local` Profile에서 서비스별 `localhost` 주소와 고정 port를 사용하고, 작업할 기능에 필요한 프로세스를 함께 실행합니다. 인증 흐름에는 Redis와 Identity가 필요하고, 향후 업무 기능 연동에는 대상 Domain Service가 추가됩니다.

Identity 인증 호출은 Spring HTTP Service Client Group을 사용합니다. 로컬의 `IDENTITY_SERVICE_BASE_URL`은 `http://localhost:8083`, 운영은 `lb://identity-service`로 설정합니다. `lb` 주소는 Spring Cloud LoadBalancer가 Eureka의 Identity 인스턴스로 변환합니다. 운영에서는 `EUREKA_ENABLED=true`와 `EUREKA_URL`도 필수입니다.

- 기본 화면: <http://localhost:8082/>
- 상태 확인: <http://localhost:8082/actuator/health>

다른 포트가 필요하면 `SERVER_PORT` 환경 변수를 지정합니다.

## 화면 구성

```text
src/main/resources/
├── templates/
│   ├── error/
│   ├── fragments/
│   ├── layouts/
│   └── pages/
│       ├── app/
│       ├── auth/
│       ├── manager/
│       ├── onboarding/
│       └── public/
└── static/
    ├── css/
    ├── js/
    │   └── home/
    └── images/
```

- 화면 Template은 `templates/pages/**`에 두고 오류·Fragment·Layout은 하위 전용 디렉터리로 구분합니다.
- 공통 Header, Navigation, Footer는 `templates/fragments/`에 둡니다.
- 규모가 커진 JavaScript 기능은 `js/{feature}/` Module로 분리합니다.
- Secret과 운영 서버 주소를 소스 코드에 하드코딩하지 않습니다.
- 로컬 서비스 주소는 `.env.local`, 운영 인스턴스 선택은 HTTP Service Client Group과 Discovery·Client-side Load Balancing으로 분리합니다.

## 동작 흐름 문서

- [Frontend 동작 흐름 Onboarding](docs/onboarding/README.md)
  - Servlet Container와 Spring Container 경계
  - Page 요청과 JavaScript 실행
  - Browser Session 인증과 Identity·Redis 경계
  - JSON·HTML 오류 및 장애 처리
  - 현재 구현 상태와 후속 정리 항목

## Browser Session 인증 기준

- Browser에는 설정된 Opaque Session Cookie만 둡니다. 로컬 기본 예시는 `OMAGOTCHI_SESSION`입니다.
- Access·Refresh Token은 Spring Session Redis에만 저장합니다.
- 일반 Signup은 Spring MVC Form Binding·Validation을, Login은 Spring Security Form Login을 사용합니다. Thymeleaf CSRF·Server 오류 표시·Redirect를 공통 적용합니다.
- Signup의 필수 필드·기본 이메일 형식은 Frontend에서 확인하고, 계정·비밀번호 정책은 Identity에서 최종 검증합니다.
- 일반 Signup은 `/register` Server Form으로 처리하며 Identity에 `USER` 계정만 생성합니다.
- 인증 Endpoint는 `/login` 하나이며 성공 뒤 기본 이동은 `/home`입니다.
- 인증된 Session의 `POST /login`은 Identity 호출 전에 현재 화면으로 돌려보내 기존 Token Family를 유지합니다.
- Logout은 Thymeleaf CSRF hidden input과 Spring Security `POST /logout`을 사용합니다.
- 인증된 사용자 화면은 Spring Security가 서버에서 보호합니다.
- 관리자 Page에는 현재 공통 Session 인증만 적용합니다. Dashboard의 관리자 표시·업무 데이터는 Learning 연동 전 Browser Prototype이며 권한 근거가 아닙니다.
- `managerLogin`·`managerRegister` Template·JavaScript·CSS는 Runtime Route와 API가 제거된 레거시 파일입니다. 동작하는 관리자 인증 경로로 사용하지 않습니다.
- 실제 기수 관리자는 `SYSTEM_ADMIN`이 Learning Service에서 특정 계정에 `ACTIVE MANAGER` 소속을 지정합니다. `SYSTEM_ADMIN`은 자동으로 기수 관리자가 아닙니다.
- Browser 전용 BFF 경로는 `/bff/v1/**`입니다. JSON 401·403·404·405·406·415·500과 Redis 503 경계는 준비됐지만 기능별 Endpoint와 Access Token 갱신은 아직 구현 전입니다.
- 기능별 BFF는 Session의 Access JWT로 대상 Domain Service를 직접 호출합니다. 운영 주소 선택은 Discovery와 Client-side Load Balancing을 사용하고, 로컬은 명시적인 `localhost` 주소를 사용합니다.
- Gateway는 외부 `/api/**`와 Webhook의 Routing·1차 인증 경계이며 Frontend BFF의 내부 호출을 중계하지 않습니다.
- 비밀번호 변경·재설정 Endpoint는 아직 구현하지 않았습니다. `/password-change`는 안내와 Login 복귀 링크만 제공하는 Page입니다.
- `api.js`는 `/bff/v1/**`를 호출하지만 아직 기능 Endpoint가 없어 실패 시 Browser 저장소 fallback으로 돌아가는 Prototype Adapter입니다. 실제 업무 기능 완료 근거로 사용하지 않습니다.
- `/username`은 Learning Service의 게임 프로필 연동 전 캐릭터 표시명 목업입니다. Identity 가입 정보나 권한의 근거로 사용하지 않습니다.
- Redis나 Identity가 실패해도 In-memory Session 또는 Browser 직접 JWT로 조용히 전환하지 않습니다.
