# 백엔드 연동 전 Frontend 완료 체크리스트

- 작성일: 2026-08-14
- 상태: Frontend 완료, Backend 종단 연동 대기
- 대상 브랜치: `feature/mobile-ui`
- 백엔드 연동 보호 규칙: [공통 보호 규칙](../../prompt/공통-보호규칙.md)

## 목적

백엔드 API가 준비되기 전에 완료할 수 있는 UI·접근성·반응형·상태 표현 작업과, API 계약이
확정된 뒤에만 할 작업을 분리한다. 백엔드 담당자 또는 해당 담당자의 AI 도구가 Frontend
구조를 다시 생성하거나 인증·React Island 계약을 변경하지 않도록 작업 경계를 함께 기록한다.

## 백엔드 없이 완료하는 범위

### 개발 환경과 공통 UI

- [x] Storybook, Radix UI, Motion, Vitest 개발환경 구성
- [x] Home 컴포넌트와 공통 UI·화면 Pattern Story 작성
- [x] PC·태블릿·모바일 세로·가로 검증용 Story 구성
- [x] 공통 색상·간격·스크롤·버튼·카드·입력 디자인 토큰 정리
- [x] Radix `GameDialog`·`GameTabs`와 Motion reduced-motion 대응 작성

### 실제 Home 연결

- [x] 도움말·설정 Overlay를 Radix Dialog와 Motion shell에 연결하고 뷰포트 중앙 배치·접근성 제목 중복 방지
- [x] Dialog를 기존 `[data-home-overlay-root]` 안에 유지해 `data-*` 이벤트 위임 보존
- [x] 닫기 버튼·배경·Esc 닫기와 열기 전 요소로 포커스 복귀 처리
- [x] 진행 Overlay의 탭을 Radix Tabs로 전환하고 기존 탭 계약 회귀 확인
- [x] Storybook AttendanceBook 디자인을 실제 출석 DOM에 연결하고 기존 출석 Controller 선택자 보존
- [x] 실제 출석 요약을 2×2 카드가 아닌 한 열 `항목 → 값` 목록으로 고정하고 320px 줄바꿈 확인
- [x] 출석 패널의 `hidden` 상태를 Controller와 동기화하고 닫기·바깥 클릭·Esc·포커스 복귀 계약 확인
- [x] Storybook AuthScreen 디자인을 실제 Thymeleaf 로그인·회원가입 Form에 적용하고 인증 계약 보존
- [x] 실제 Home 메뉴 내용을 Storybook 공통 패널 어댑터로 감싸고 mock 데이터 유입 차단
- [x] Storybook에서 1440×900, 1024×768, 390×844, 844×390, 320×568 외곽 이탈 확인
- [x] 실제 Home template·bundle 통합 fixture에서 1440×900, 1024×768, 390×844, 844×390, 320×568 확인
- [x] 타이머·BGM·재실·채팅·출석 버튼·Overlay 상호 배타 동작 회귀 확인
- [ ] Identity·View·Domain Service를 함께 실행한 인증·실제 API 종단 회귀 확인

### API 응답 전 상태

- [x] Storybook에서 기본·빈 값·로딩·오류·비활성 상태를 서버 없이 검증
- [x] 실제 화면 Controller가 로딩·빈 값·오류를 구분해 표시하는지 점검
- [x] API 응답을 UI 상태로 바꾸는 변환 지점을 기능별 Controller 한 곳으로 고정
- [x] 임시 성공 mock과 브라우저 저장소 fallback 위치에 `[API-REPLACE]` 추적 주석 유지
- [x] 서버 응답이 없거나 잘못되었을 때 성공 화면으로 처리하지 않는지 확인

출석 Controller는 `loading / empty / active / complete / error`를 구분한다. 서버 출석 이력이
실패하면 `data-ui-source="local-prototype"`과 안내 문구를 남겨 로컬 기록이 서버 성공 결과처럼
보이지 않게 한다. 재실 API가 없을 때도 더 이상 `0명` 성공 응답을 만들지 않고 오류 상태를
표시한다. 학습 기록은 기존 `loadErrorMessage` 경로를 유지한다.

## 2026-08-14 진행률

- Frontend 단독 구현·자동 검증 항목: 완료 (`100%`)
- 실제 서비스 종단 검증: Backend API 준비 대기 (`1개`)
- 기능별 adapter·Controller·보존 계약: [연결 지도](../../integration/frontend-backend-connection-map.md)에 정리

Storybook과 정적 통합 fixture 검증 완료는 실제 서비스 종단 실행 완료를 뜻하지 않는다.
남은 1개는 Frontend 미구현이 아니라 실제 API가 준비된 뒤 서비스 조합에서 기존 기능이
그대로 동작하는지 확인하는 통합 검증이다.

## API 계약이 준비된 뒤에만 하는 범위

다음 항목은 백엔드 작업자가 임의의 필드명이나 URL을 가정해 먼저 구현하지 않는다.

- 출석 승인 기수, 입실·퇴실 시각과 월별 출석 기록의 실제 응답 연결
- 학습 기록 목록·기간 집계·저장 응답 연결
- 재실 인원, 캐릭터 성장, 커뮤니티, 공간 데이터의 실제 응답 연결
- API 버전 변경에 따른 View BFF Client·DTO 매핑
- Identity Service 로그인·회원가입·세션 동작 변경

브라우저는 `/bff/v1/**`만 호출한다. Domain Service의 `/api/v1/**`, `/api/v2/**` 차이는
View BFF Java Client 또는 Gateway가 흡수하며 React·Vanilla UI에 노출하지 않는다.

## 백엔드 담당자와 AI 도구의 작업 경계

백엔드 연동 작업을 시작하기 전에 반드시
[공통 보호 규칙](../../prompt/공통-보호규칙.md)과 담당 기능 프롬프트를 함께 입력한다.

기본적으로 수정 가능한 곳은 다음과 같다.

```text
src/main/resources/static/js/api.js
해당 기능의 기존 JavaScript Controller·응답 매핑
해당 기능의 View BFF Controller·Client·DTO·Error 처리
해당 기능의 API 계약 문서
```

다음 경로는 Frontend 담당자 협의 없이 수정하지 않는다.

```text
.storybook/**
src/main/frontend/ui/**
src/main/frontend/**/*.stories.*
src/main/resources/static/css/ui/**
src/main/resources/static/js/home-react/home-app.js
package.json
package-lock.json
vite.config.js
인증·세션·JWT·Identity 관련 코드
```

`home-app.js`는 직접 고치는 소스가 아니라 Vite 산출물이다. React 변경이 필요하면
`src/main/frontend/**`를 수정하고 Frontend 담당자가 `npm run build:home`으로 다시 만든다.

## 완료 검증

```bash
npm run build:home
npx vitest run
npm run build-storybook
./mvnw test
```

실제 브라우저에서는 키보드만으로 Dialog와 Tabs를 조작하고, 모바일에서 외곽 이탈·가로
스크롤·배경 스크롤·닫기 후 포커스 복귀를 확인한다.
