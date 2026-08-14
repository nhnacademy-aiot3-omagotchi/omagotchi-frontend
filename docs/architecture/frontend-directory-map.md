# Frontend 디렉터리 구조와 파일 소유권

- 상태: 현재 구현 기준
- 최종 정리일: 2026-08-14
- 목적: Backend 연동과 Frontend UI 작업이 서로의 파일을 덮어쓰지 않도록 경로별 책임을 고정한다.

## 전체 구조

```text
view/
├── .storybook/                         Storybook 실행·정적 자원 설정
├── docs/
│   ├── adr/                            구조적 기술 결정
│   ├── architecture/                   현재 소스 구조와 파일 소유권
│   ├── examples/                       가이드용 구현 예시
│   ├── guides/                         반복 가능한 구현 가이드
│   ├── home-ui/                        Home React Island·반응형·Storybook
│   ├── integration/                    Backend 연결 계약과 진행 항목
│   ├── licenses/                       외부 에셋 라이선스
│   ├── onboarding/                     요청·인증·오류 동작 흐름
│   ├── prompt/                         Backend 연동 AI 보호 지시문
│   ├── requirements/                   제품·기능 요구사항
│   ├── roadmaps/                       구현·학습 순서
│   └── specifications/                 현재 구현 상세 명세
├── src/main/frontend/
│   ├── home-react/                     실제 Home React Island 소스
│   │   ├── components/                 Home 컴포넌트와 같은 위치의 Story
│   │   └── main.jsx                    Island 진입점
│   └── ui/                             재사용 UI·Pattern과 Story
├── src/main/java/site/omagotchi/frontend/
│   ├── auth/                           Identity 연동과 인증 use case
│   ├── global/                         Security·Session·HTTP·공통 Web 설정
│   ├── onboarding/                     온보딩 Page Controller
│   └── presentation/                   사용자 View Page Controller
├── src/main/resources/templates/
│   ├── pages/                          실제 사용자·인증·공개 Thymeleaf Page
│   ├── fragments/                      공통 Thymeleaf Fragment
│   ├── error/                          오류 Page
│   └── manager/                        관리자 화면
├── src/main/resources/static/
│   ├── css/ui/                         공통 디자인 토큰·UI Pattern
│   ├── css/home/                       실제 Home Layout·기능별 보정
│   ├── js/api.js                       Browser API 단일 진입점
│   ├── js/home.js                      Home 기능 조립·Overlay 템플릿
│   ├── js/home/                        기능별 Vanilla Controller
│   ├── js/home-react/                  Home·캐릭터 선택 Vite 산출물과 공통 chunk
│   ├── images/                         정적 이미지·캐릭터 Asset
│   ├── audio/                          BGM Asset
│   └── fonts/                          서비스 Font
├── package.json                        Frontend 실행·빌드 명령
├── vite.config.js                      Home React Island 번들 설정
└── pom.xml                             Spring Boot 빌드·리소스 설정
```

## 런타임 흐름

```text
Spring Controller
  → Thymeleaf Page
  → home-app.js가 React Island DOM을 먼저 렌더링
  → home.js가 data-* DOM 계약에 기능 Controller를 연결
  → window.OmagotchiApi
  → 같은 Origin /bff/v1/**
  → View BFF Client
  → Domain API
```

`home-app.js`는 소스가 아니다. `src/main/frontend/**`를 수정한 뒤 `npm run build:home`으로
생성한다. 실제 Home은 React가 표현 구조를, 기존 `home.js`와 `home/*.js`가 기능 상태를
나누어 소유하므로 같은 상태를 양쪽에서 동시에 갱신하지 않는다.

## 변경 목적별 소유권

| 변경 목적 | 기본 수정 경로 | 함께 확인할 경로 |
| --- | --- | --- |
| 공통 UI 추가 | `src/main/frontend/ui/**` | Story, `css/ui/**` |
| Home UI 구조 | `src/main/frontend/home-react/**` | Story, `home-app.js` 재생성 |
| 캐릭터 선택 UI | `src/main/frontend/character-selector/**` | Story, `character-selector-app.js` 재생성 |
| Home 기능 동작 | `static/js/home/*.js` | `home.js`, 관련 `data-*` |
| Browser API 연결 | `static/js/api.js` | 기능 Controller, View BFF DTO |
| 실제 Page DOM | `templates/pages/**` | Controller 선택자, 반응형 CSS |
| Home 배치·반응형 | `static/css/home/**` | 320·390·844·1024·1440px 검증 |
| 인증·Session | `auth/**`, `global/security/**`, 인증 Template | Identity 계약·회귀 테스트 |
| Backend 연동 문서 | `docs/integration/**` | `docs/prompt/**` 보호 규칙 |

## Backend 연동 시 수정하지 않는 경로

단순 API 연결 작업은 아래 경로를 변경하지 않는다.

```text
.storybook/**
src/main/frontend/ui/**
src/main/frontend/**/*.stories.*
src/main/resources/static/css/ui/**
src/main/resources/static/css/home/**
src/main/resources/static/js/home-react/**
docs/home-ui/**
docs/adr/**
package.json
package-lock.json
vite.config.js
```

UI 변경이 반드시 필요하면 Backend 연결 변경과 섞지 않고 Frontend 담당자와 별도 협의한다.

## 검증 명령

```bash
npm run build:home
npx vitest run
npm run build-storybook
./mvnw test
git diff --check
```

구조가 바뀌면 이 문서와 [기능별 연결 지도](../integration/frontend-backend-connection-map.md),
[Backend 연동 보호 규칙](../prompt/공통-보호규칙.md)을 같은 변경에서 갱신한다.
