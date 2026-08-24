# System Admin BFF 연동 가이드

## 목적

`/system-admin-dashboard`의 실제 화면과 Storybook 미리보기를 분리하고, Frontend BFF가 Identity Service와 Learning Service를 조합하는 기준을 정의한다.

현재 Storybook은 [`src/main/resources/static/js/system-admin/dashboard/data/systemAdminMockRepository.js`](../../src/main/resources/static/js/system-admin/dashboard/data/systemAdminMockRepository.js), 실제 Thymeleaf 화면은 [`src/main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js`](../../src/main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js)를 주입한다. 실제 화면에서 목데이터로 대체하거나 Identity Service의 데이터베이스를 직접 조회하지 않는다.

## 현재 연결 상태

| 화면 기능 | 소유 서비스 | 상태 |
| --- | --- | --- |
| 기수 목록·활성 구성원 수·관리자 ID | Learning | 연결됨 (`GET /bff/v1/admin/cohorts`) |
| 기수 생성 | Learning | 연결됨 (`POST /bff/v1/admin/cohorts`) |
| 기수 상태 변경 | Learning | 연결됨 (`PATCH /bff/v1/admin/cohorts/{cohortId}/status`) |
| 기수 관리자 배치 | Learning | BFF 경로 준비됨. Identity 사용자 목록 연결 후 UI에서 사용 |
| 관리자 기간 중복 오류 | Learning | `409 COHORT_MANAGER_PERIOD_CONFLICT` 전달됨 |
| 사용자 목록·검색 | Identity | 미구현 |
| 전역 권한 변경 | Identity | 미구현 |
| 계정 상태 변경 | Identity | 미구현 |
| 구성원 수·관리자 목록 요약 | Learning | SYSTEM_ADMIN 전용 집계 응답 연결됨 |
| 기수 삭제 | Learning | PREPARING 기수만 삭제 가능하며 BFF 연결됨 |
| 감사 로그 | 별도 합의 필요 | 서버 계약 미구현 |

## 저장소 주입 경계

```text
Storybook
  src/main/frontend/system-admin/SystemAdminDashboard.stories.jsx
    -> createSystemAdminMockRepository()

실제 Thymeleaf 화면
  src/main/resources/static/js/system-admin/dashboard/index.js
    -> createSystemAdminApiRepository(window.OmagotchiApi)
```

[`src/main/resources/static/js/system-admin/dashboard/dashboardController.js`](../../src/main/resources/static/js/system-admin/dashboard/dashboardController.js)는 HTTP 경로나 목데이터를 알지 않는다. 다음 저장소 인터페이스만 사용한다.

```javascript
{
  loadDashboard(),
  updateUserPermissions(userId, permissions),
  createCohort(payload),
  changeCohortStatus(cohortId, status),
  deleteCohort(cohortId),
  appendAudit(entry)
}
```

## Identity Service에 필요한 계약

Identity 담당자와 아래 계약을 확정한 후 Frontend에 `IdentityHttpService`와 System Admin BFF Controller를 추가한다.

### 사용자 목록

```http
GET /api/v1/admin/users?page=0&size=20&keyword=&status=&globalRole=
Authorization: Bearer {SYSTEM_ADMIN access token}
```

```json
{
  "content": [
    {
      "userId": "uuid",
      "name": "홍길동",
      "email": "user@example.com",
      "globalRole": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-08-24T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 81,
  "totalPages": 5
}
```

### 전역 권한과 계정 상태 변경

```http
PATCH /api/v1/admin/users/{userId}/global-role
Content-Type: application/json

{"globalRole":"SYSTEM_ADMIN"}
```

```http
PATCH /api/v1/admin/users/{userId}/status
Content-Type: application/json

{"status":"ACTIVE"}
```

Identity Service가 결정해야 하는 정책은 자신의 관리자 권한 해제, 마지막 SYSTEM_ADMIN 보호, 허용할 AccountStatus 전이, 동일 값 재요청의 멱등 처리다.

## Frontend BFF 추가 기준

Browser에는 Identity Service 주소를 노출하지 않고 다음 BFF 경로만 제공한다.

```http
GET   /bff/v1/system-admin/users
PATCH /bff/v1/system-admin/users/{userId}/global-role
PATCH /bff/v1/system-admin/users/{userId}/status
```

구현 순서는 다음과 같다.

1. Identity 전용 HTTP Interface를 만든다.
2. Browser Session의 access token을 Bearer Token으로 전달한다.
3. BFF Controller에서 `ROLE_SYSTEM_ADMIN` 접근을 재검증한다.
4. Identity 오류 코드를 `ApiExceptionHandler`의 공개 가능한 하류 계약에 등록한다.
5. [`src/main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js`](../../src/main/resources/static/js/system-admin/dashboard/data/systemAdminApiRepository.js)의 `updateUserPermissions()`를 실제 BFF 호출로 교체한다.
6. Identity 사용자 ID와 Learning의 `managerUserId`가 동일한 UUID 계약인지 통합 테스트로 확인한다.

## 사용자 권한 저장 시 서비스 분리

한 번의 화면 저장이 두 서비스를 변경할 수 있다.

```text
globalRole, accountStatus -> Identity BFF
managerCohortIds          -> Learning BFF
```

두 서비스에 걸친 데이터베이스 트랜잭션을 만들지 않는다. Frontend는 각 호출 결과를 구분해 보여주고, 일부만 성공하면 화면을 다시 조회하여 실제 상태를 표시한다. 기수 관리자 배치는 Learning Service의 `COHORT_MANAGER_PERIOD_CONFLICT`를 최종 판정으로 사용한다.

## Learning 후속 계약

실제 화면은 SYSTEM_ADMIN 전용 기수 요약 API를 사용한다. `GET /api/v1/cohorts/{cohortId}/members`는 해당 기수의 활성 MANAGER 권한을 요구하므로 전체 현황 조회에 사용하지 않는다.

```json
{
  "id": 1,
  "name": "AIoT 3기",
  "startDate": "2026-08-01",
  "endDate": "2026-12-18",
  "status": "ACTIVE",
  "memberCount": 34,
  "managerUserIds": ["uuid"]
}
```

기수 삭제는 `DELETE /api/v1/cohorts/{cohortId}`를 사용하며 SYSTEM_ADMIN의 PREPARING 기수만 허용한다. Frontend BFF는 `DELETE /bff/v1/admin/cohorts/{cohortId}`로 전달한다.

## 완료 확인

- Storybook 실행 시 네트워크 요청 없이 사용자·기수 목데이터가 표시된다.
- 실제 `/system-admin-dashboard` 진입 시 `GET /bff/v1/admin/cohorts`가 호출된다.
- 실제 화면에는 목 사용자가 나타나지 않는다.
- Identity 미연동 영역은 빈 목록이 아니라 `Identity 관리자 API 연동 후` 안내를 표시한다.
- Learning의 409 오류 코드가 권한/기수 팝업 안에 표시된다.
- 모바일 화면에서도 사용자 테이블, 기수 카드, 팝업 스크롤이 유지된다.
