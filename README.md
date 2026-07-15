# Omagotchi Frontend

Spring MVC와 Thymeleaf를 사용하는 Omagotchi의 화면 애플리케이션입니다.

## 로컬 실행

요구 사항은 JDK 21입니다. 별도의 Maven 설치 없이 Maven Wrapper를 사용합니다.

```bash
./mvnw test
./mvnw spring-boot:run
```

- 기본 화면: <http://localhost:8082/>
- 상태 확인: <http://localhost:8082/actuator/health>

다른 포트가 필요하면 `SERVER_PORT` 환경 변수를 지정합니다.

## 화면 구성

```text
src/main/resources/
├── templates/
│   ├── index.html
│   ├── fragments/
│   └── {feature}/
└── static/
    ├── css/{feature}/
    ├── js/{feature}/
    └── images/
```

- 기능 화면은 `templates/{feature}/`에 둡니다.
- 공통 Header, Navigation, Footer는 `templates/fragments/`에 둡니다.
- 기능별 CSS와 JavaScript는 각각의 `{feature}/` 디렉터리로 구분합니다.
- Secret과 운영 서버 주소를 소스 코드에 하드코딩하지 않습니다.
- 백엔드 API 연동 방식은 로컬 개발 환경 이슈에서 별도로 정합니다.
