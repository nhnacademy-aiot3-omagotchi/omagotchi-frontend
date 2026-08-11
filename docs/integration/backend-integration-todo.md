# 백엔드 연동 협의 정리

- 상태: 협의 중인 요구사항 — 구현 완료 문서 아님

> 현재 Browser 연결 기준은 [Frontend ↔ Backend 기능별 연결 지도](frontend-backend-connection-map.md)를
> 우선한다. 아래 `/api/**`, `/gamification/**` 표기는 Domain API 협의를 위한 후보이며 Browser
> JavaScript가 직접 호출하는 경로가 아니다.

프론트엔드에서 백엔드 연동 전 맞춰야 할 항목을 정리한 문서다.

현재 화면은 일부 기능이 `localStorage`, `sessionStorage`, 목업 데이터로 동작하므로, 실제 연동 시 아래 항목을 백엔드와 먼저 합의해야 한다.

## 0. 백엔드 현재 명세 확인 결과

백엔드에서 공유한 명세는 Learning Service 저장소의 `docs/frontend-api-spec.md`다.

현재 백엔드 명세 기준으로 프론트 문서와 바로 맞춰야 할 차이는 아래다.

| 항목 | 프론트 기존 가정 | 백엔드 현재 명세 | 맞출 내용 |
| --- | --- | --- | --- |
| 인증 | 쿠키 세션 또는 BFF 세션 권장 | 대부분 `Authorization: Bearer <accessToken>` 필요 | 토큰을 브라우저 JS에 노출할지, BFF에서 Bearer relay할지 결정 |
| 에러 응답 | `{ message, code }` | `{ status, code, message, path, requestId }` | 프론트 공통 에러 처리에서 백엔드 형식 수용 |
| 출석 경로 | `/api/attendance/check-in` | `/api/cohorts/{cohortId}/attendance-records/check-in` | 프론트가 `cohortId`를 어디서 얻을지 결정 |
| 출석 필드명 | `serviceDate`, `checkInAt`, `checkOutAt`, `attendanceStatus` | `attendanceDate`, `checkedInAt`, `checkedOutAt`, `finalStatus` | 프론트 어댑터에서 필드 변환 필요 |
| 출석 상태값 | `PRESENT`, `LATE`, `ABSENT`, `EARLY_LEAVE` 등 | `PRESENT`, `LATE`, `ABSENT`, `LEFT_EARLY`, `LATE_LEFT_EARLY`, `MISSING_CHECK_OUT` | 조퇴 enum 이름 통일 또는 매핑 |
| 학습 기록 경로 | `/api/study-records` | `/api/v1/cohorts/{cohortId}/study-records` | `cohortId` 기반으로 API 래퍼 수정 |
| 학습 기록 모델 | 구간 기록 `durationSeconds`, `elapsedSeconds`, `tags` | `date`, `startTime`, `endTime`, `studySeconds`, `version` | 현재 프론트 구간 기록 UI와 백엔드 모델 간 변환 방식 결정 |
| 타이머 쓰기 | 단순 start/pause 예상 | 별도 명령 ID 헤더 없음 | 멱등성 보장은 후속 범위이므로 일반 인증 요청으로 호출 |
| 학습 기록 삭제 | 미정 | `X-RESOURCE-VERSION` 필요 | 삭제 UI 추가 시 version 관리 필요 |
| 홈 요약 | `/api/home/summary` 예상 | `/gamification/home` | API base가 `/api`가 아닌 예외 처리 필요 |
| 퀘스트 | `/api/quests/...` 예상 | `/gamification/quests/...` | API 래퍼 분리 또는 base path 예외 처리 |
| 프로필 | `/api/me` 또는 `/api/me/profile` | `/api/users/me/profile`, `/api/users/me/nickname` | 사용자 정보 API 경로 수정 |
| 현재 상태 | SSE `/api/presence/lab/stream` 예상 | WebSocket/STOMP `/ws`, snapshot `/api/cohorts/me/presence` | SSE가 아니라 WebSocket 연동 여부 결정 |
| 상태 enum | `present`, `away`, `meeting`, `offline` | `ONLINE`, `AWAY`, `BUSY`, `OFFLINE` | 프론트 표시용 상태 매핑 필요 |
| 캐릭터 선택 저장 | `/api/me/character` 예상 | `/gamification/characters`, `/gamification/characters/representative` 추가됨 | 프론트 캐릭터 선택 화면을 `gameCharacterId`, `nickname` 모델로 변경 |

우선순위상 먼저 결정할 것:

1. 프론트가 Bearer 토큰을 직접 들고 갈지, 프론트 서버가 BFF처럼 토큰을 relay할지
2. 로그인 이후 현재 사용자의 `cohortId`를 `/api/users/me/profile`의 `approvedCohort.cohortId`에서 가져와도 되는지
3. 캐릭터 선택 화면의 기존 `characterId`, `colorId`를 백엔드 `gameCharacterId`, `nickname` 모델로 어떻게 매핑할지
4. 타이머/학습 기록 UI를 백엔드의 `startTime`/`endTime` 모델에 맞출지, 백엔드가 현재 프론트의 구간 기록 모델을 지원할지
5. Presence는 MVP에서 WebSocket까지 붙일지, 우선 snapshot API만 사용할지

### 추가 명세 기준으로 바로 맞출 부분

백엔드 `frontend-api-spec.md`에 추가된 것으로 보이는 프론트 영향 항목은 아래다.

| 영역 | 추가/확정된 백엔드 API | 프론트 반영 방향 |
| --- | --- | --- |
| 출결 정책 | `GET /api/cohorts/{cohortId}/attendance-policy`, `PUT /api/cohorts/{cohortId}/attendance-policy` | 관리자 화면에서 출석 기준 시간 설정이 필요하면 이 API 기준으로 연동 |
| 캐릭터 목록 | `GET /gamification/characters` | 캐릭터 선택 화면의 하드코딩 목록을 서버 목록으로 대체 가능 |
| 대표 캐릭터 생성 | `POST /gamification/characters/representative` | 선택 완료 시 `gameCharacterId`, `nickname`으로 저장 |
| 홈/성장/퀘스트 | `/gamification/home`, `/gamification/quests/daily`, `/gamification/progression` | 홈 요약과 퀘스트 API는 `/api` prefix 예외 처리 필요 |

캐릭터 선택 요청/응답은 아래 모델에 맞춘다.

```json
{
  "gameCharacterId": 1,
  "nickname": "오마"
}
```

```json
{
  "userCharacterId": 10,
  "gameCharacterId": 1,
  "gameCharacterCode": "NIGHT_CLASS",
  "gameCharacterName": "야간반",
  "nickname": "오마",
  "displayName": "오마",
  "totalXp": 0,
  "level": 1,
  "advancementStage": "BASE",
  "representative": true
}
```

프론트에서 추가로 확인할 점:

- 백엔드 `GameCharacterResponse`에는 이미지 경로가 없으므로, `gameCharacterCode`와 프론트 이미지 asset 매핑이 필요하다.
- 현재 프론트는 색상 선택 `colorId`가 있는데, 백엔드 캐릭터 모델에는 색상 필드가 없다. 색상 커스터마이징을 유지할지 MVP에서 제외할지 정해야 한다.
- `/gamification`은 기존 `window.OmagotchiApi`의 기본 `/api` base path와 다르므로 API 래퍼에서 base path 예외를 둬야 한다.

### Frontend API Handoff 추가 반영

백엔드 Handoff 기준 현재 프론트 연동 범위:

- 포함: `attendance`, `cohort`, `community`, `gamification`, `ranking`, `realtime`, `telegram`, `user`
- 제외: `space`, `team`, `occupancy`, 일반 타이머/학습 세션 CRUD
- 예외 포함: 게이미피케이션 진행도와 랭킹에서 노출되는 `studySeconds`, streak 관련 값

기존 문서와 겹치지 않게 추가로 반영할 항목은 아래다.

| 영역 | 추가된 항목 | 프론트 반영 |
| --- | --- | --- |
| User | `GET /api/users/me/profile`에서 `approvedCohort.cohortId` 제공 확정 | 기수별 API 호출 전 이 값을 캐싱해서 사용 |
| User | `PATCH /api/users/me/nickname` | 닉네임 설정/변경 화면은 이 API로 연결 |
| Cohort | `GET /api/cohorts/{cohortId}/audit-logs` | 관리자 감사 로그 화면의 로컬 저장소 대체 |
| Cohort | 출결 정책 요청/응답 필드 확정 | 관리자 출결 기준 설정 시 `timezone`, `scheduledStartTime`, `scheduledEndTime`, `absenceCutoffTime`, `allowedAwayMinutes` 사용 |
| Community | multipart 게시글 생성/수정 지원 | 첨부파일 UI 추가 시 `post` JSON part와 `attachments` 파일 part로 전송 |
| Community | 게시글 고정 `PATCH /api/community/posts/{postId}/pin` | 관리자/공지 고정 기능 추가 가능 |
| Gamification | 진행도 `GET /gamification/progression` | 홈/진행 화면에서 `studySeconds`, 4/6/8시간 달성, weekday streak 표시 가능 |
| Ranking | `GET /rankings/study` | 학습 시간 랭킹 화면 추가 시 사용 |
| Realtime | Presence snapshot `GET /api/cohorts/me/presence` | MVP는 snapshot 먼저 붙이고 WebSocket은 이후 확장 |
| Realtime | WebSocket/STOMP 경로 확정 | `/ws`, `/app/presence/heartbeat`, `/topic/cohorts/{cohortId}/presence`, `/user/queue/notifications` |
| Telegram | 텔레그램 링크/알림 API | 설정 화면에 텔레그램 연동 기능 추가 시 사용 |

Handoff 기준으로 기존 가정에서 조정할 내용:

- 일반 타이머/학습 세션 CRUD는 이번 연동 범위에서 제외한다.
- `studySeconds`는 직접 학습 기록 CRUD가 아니라 `/gamification/progression`, `/rankings/study`, `/api/users/me/profile` 응답값으로 표시한다.
- Presence 상태 enum은 `ONLINE`, `AWAY`, `OFFLINE` 기준으로 맞춘다. 기존 프론트의 `present`, `away`, `offline` 표시값과 매핑한다.
- 커뮤니티 타입은 `NOTICE`, `FREE`, 공개 범위는 `GLOBAL`, `COHORT` 기준으로 맞춘다.
- 캐릭터 asset은 백엔드 `assetKey` 또는 `gameCharacterCode`를 프론트 정적 이미지 경로에 매핑한다.

## 1. 공통 연동 방식

### API 기본 경로

- 프론트 공통 API 래퍼는 `window.OmagotchiApi`를 사용한다.
- Browser 기본 API prefix는 같은 Origin의 `/bff/v1`이다.
- Domain Service의 `/api/v1`, `/api/v2`, `/gamification` 차이는 View BFF에서 흡수한다.
- 필요 시 `window.OMAGOTCHI_API_BASE` 또는 `<html data-api-base="...">`로 API base path를 바꿀 수 있다.

### 인증 전달 방식

백엔드와 먼저 결정해야 할 부분:

- 서버 세션 쿠키 방식으로 갈지
- JWT를 사용할지
- JWT를 사용한다면 프론트 JavaScript에 토큰을 노출하지 않을지
- 관리자와 일반 사용자 인증을 같은 세션 체계로 둘지 분리할지

프론트 권장 방향:

- 브라우저 JavaScript에는 Access Token / Refresh Token을 저장하지 않는다.
- `localStorage`, `sessionStorage`에는 인증 토큰을 저장하지 않는다.
- 가능하면 HttpOnly 쿠키 기반 세션 또는 BFF 세션 방식으로 처리한다.

### 공통 응답 형식

에러 응답은 프론트에서 메시지를 표시할 수 있도록 아래 형태를 권장한다.

```json
{
  "message": "사용자에게 보여줄 메시지",
  "code": "OPTIONAL_ERROR_CODE"
}
```

성공 응답은 `204 No Content` 또는 JSON 응답 모두 가능하지만, 화면 이동이 필요한 API는 `redirectUrl` 제공 여부를 맞춰야 한다.

```json
{
  "redirectUrl": "/check-in"
}
```

## 2. 로그인 / 회원가입 / 사용자 정보

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 로그인 | `POST` | `/api/auth/login` | 일반 사용자 로그인 |
| 회원가입 | `POST` | `/api/auth/register` | 이메일, 비밀번호 기반 |
| 내 정보 수정 | `PUT` | `/api/me/profile` | 닉네임 설정 화면에서 사용 |
| 비밀번호 재설정 대상 확인 | `POST` | `/api/auth/password-reset/lookup` | 존재 여부 메시지 정책 협의 필요 |
| 비밀번호 재설정 | `POST` | `/api/auth/password-reset` | 실제 정책에 따라 토큰 방식으로 변경 가능 |
| 로그아웃 | `POST` | `/api/auth/logout` | 현재 프론트에 추가 연동 필요 |
| 내 정보 조회 | `GET` | `/api/me` | 홈 진입 시 사용자 이름, 캐릭터 여부 확인용 |

### 로그인 응답에서 필요한 값

```json
{
  "user": {
    "id": "user-1",
    "email": "student@example.com",
    "name": "홍길동",
    "hasCharacter": true
  },
  "redirectUrl": "/check-in"
}
```

협의할 점:

- 로그인 성공 후 이동 경로를 백엔드가 줄지, 프론트가 `hasCharacter` 기준으로 판단할지
- 최초 로그인 사용자가 캐릭터 선택 화면을 반드시 거쳐야 하는지
- 로그인 ID가 이메일인지 별도 아이디인지
- 비밀번호 찾기에서 사용자 존재 여부를 직접 노출해도 되는지

현재 프론트에서 제거해야 할 임시 처리:

- 로그인 비밀번호를 `sessionStorage`, `localStorage`에 저장하는 처리
- 회원가입 중 비밀번호를 `sessionStorage`에 임시 저장하는 처리
- 사용자 이름과 마지막 로그인 이메일을 로컬 저장소 기준으로 복원하는 처리

## 3. 캐릭터 선택

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 캐릭터 선택 저장 | `PUT` | `/api/me/character` | 최초 선택 및 변경 |
| 내 캐릭터 조회 | `GET` | `/api/me/character` | 홈 화면 렌더링 |

### 저장 요청 예시

```json
{
  "characterId": "study",
  "colorId": "pistachio"
}
```

### 조회 응답 예시

```json
{
  "characterId": "study",
  "characterName": "스터디",
  "colorId": "pistachio",
  "colorName": "피스타치오",
  "imagePath": "/images/characters/study/pistachio.png",
  "animatedImagePath": "/images/characters/study/study_eye.gif",
  "baseImagePath": "/images/characters/study/study.png",
  "customizedAt": "2026-08-10T09:00:00+09:00"
}
```

협의할 점:

- 이미지 경로를 백엔드가 내려줄지, 프론트가 `characterId`, `colorId`로 조합할지
- 캐릭터 변경 가능 여부
- 색상 ID 목록을 프론트 상수로 유지할지 백엔드 API로 받을지

현재 프론트에서 제거해야 할 임시 처리:

- 캐릭터 선택값을 `localStorage`, `sessionStorage`에 저장하는 처리
- 사용자별 캐릭터 선택 완료 여부를 `localStorage`로 판단하는 처리

## 4. 출석 / 퇴실

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 오늘 출석 상태 조회 | `GET` | `/api/attendance/today` | 체크인 화면, 홈 동기화 |
| 출석 기록 조회 | `GET` | `/api/attendance/history` | 홈 달력, 스트릭 |
| 입실 처리 | `POST` | `/api/attendance/check-in` | 서버 시간이 기준 |
| 퇴실 처리 | `POST` | `/api/attendance/check-out` | 하루 요약 응답 필요 |

### 오늘 출석 응답 예시

```json
{
  "serviceDate": "2026-08-10",
  "checkInAt": "2026-08-10T09:00:00+09:00",
  "checkOutAt": null,
  "attendanceStatus": "PRESENT",
  "spaceStatus": "IN_LAB"
}
```

### 퇴실 응답 예시

```json
{
  "serviceDate": "2026-08-10",
  "checkInAt": "2026-08-10T09:00:00+09:00",
  "checkOutAt": "2026-08-10T18:00:00+09:00",
  "attendanceStatus": "PRESENT",
  "summary": {
    "staySeconds": 32400,
    "studySeconds": 18000,
    "awaySeconds": 1800
  }
}
```

협의할 점:

- 서비스 날짜 전환 기준: 현재 프론트 일부 로직은 새벽 4시 기준, 타이머는 오전 7시 기준이 섞여 있다.
- 출석 판정 기준 시간: 지각, 조퇴, 결석 기준
- 주말/공휴일 출석 달력 표시 여부
- 체크인 중복 요청 시 응답 정책
- 체크아웃 없는 날의 처리 방식

현재 프론트에서 제거해야 할 임시 처리:

- 출석 기록을 `localStorage`에 저장하는 처리
- 브라우저 시간을 출석 시간처럼 사용하는 처리
- 홈 출석 상태와 체크인 화면 출석 상태를 로컬 이벤트로만 동기화하는 처리

## 5. 현재 상태 / 실습실 인원

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 실습실 현재 인원 조회 | `GET` | `/api/presence/lab` | 홈 우측 패널 |
| 실습실 현재 인원 스트림 | `GET` | `/api/presence/lab/stream` | SSE 사용 시 |
| 내 현재 상태 조회 | `GET` | `/api/me/status` | 재실, 부재중, 회의중, 퇴실 |
| 내 현재 상태 변경 | `PATCH` | `/api/me/status` | 부재중/복귀/회의실 이동 등 |

### 실습실 인원 응답 예시

```json
{
  "capacity": 50,
  "occupiedCount": 18,
  "users": [
    {
      "id": "user-1",
      "name": "홍길동",
      "email": "student@example.com",
      "status": "present",
      "characterImage": "/images/characters/study/study.png"
    }
  ]
}
```

프론트에서 현재 사용하는 상태값:

| 프론트 값 | 의미 |
| --- | --- |
| `present` | 재실 |
| `away` | 부재중 |
| `meeting` | 회의중 |
| `offline` | 퇴실 |

백엔드 값이 `IN_LAB`, `AWAY`, `MEETING`, `OFFLINE`처럼 다르면 프론트에서 변환 로직을 추가해야 한다.

협의할 점:

- SSE를 MVP에서 바로 사용할지, 우선 수동 새로고침/폴링으로 갈지
- 회의실 위치와 실습실 위치를 같은 상태 모델로 볼지
- 사용자 목록에 이메일을 노출해도 되는지

## 6. 학습 타이머 / 학습 기록

Handoff 기준 일반 타이머/학습 세션 CRUD는 이번 프론트 연동 범위에서 제외한다.  
아래 내용은 기존 프론트 목업 제거 시 참고용이며, 이번 우선 연동은 `/gamification/progression`, `/rankings/study`, `/api/users/me/profile`의 `studySeconds`와 streak 표시값을 사용한다.

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 오늘 타이머 상태 조회 | `GET` | `/api/study-timer/today` | 새로고침 복구용 |
| 타이머 시작 | `POST` | `/api/study-timer/start` | 서버 기준 시작 |
| 타이머 정지 | `POST` | `/api/study-timer/pause` | 누적 시간 갱신 |
| 학습 기록 목록 조회 | `GET` | `/api/study-records` | 일/월/년 보기 |
| 학습 기록 생성 | `POST` | `/api/study-records` | 구간 기록 |
| 학습 기록 수정 | `PATCH` | `/api/study-records/{id}` | 이름, 태그 수정 |

### 학습 기록 응답 예시

```json
{
  "id": "segment-1",
  "sessionId": "timer-1",
  "sequence": 1,
  "name": "1",
  "tags": ["Java"],
  "durationSeconds": 1800,
  "elapsedSeconds": 1800,
  "recordedAt": "2026-08-10T10:30:00+09:00",
  "updatedAt": "2026-08-10T10:30:00+09:00"
}
```

협의할 점:

- 타이머를 서버에서 정본으로 관리할지, 프론트는 화면 표시만 담당할지
- 새벽 마감 시간 정책: 현재 프론트는 학습일 시작 07:00, 마감 04:00 로직이 있다.
- 기록 생성 시 `id`, `sequence`, `recordedAt`을 서버가 최종 결정할지
- 태그 최대 개수와 글자 수 제한

현재 프론트에서 제거해야 할 임시 처리:

- 타이머 상태를 `localStorage`에 정본처럼 저장하는 처리
- 학습 기록 목록을 `localStorage`에 저장하는 처리
- 프론트에서 임시 ID와 기록 순서를 확정하는 처리

## 7. 성장 / 퀘스트 / 보상

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 홈 요약 조회 | `GET` | `/api/home/summary` | 사용자, 캐릭터, 레벨, 퀘스트 |
| 오늘 퀘스트 조회 | `GET` | `/api/quests/today` | 홈 퀘스트 목록 |
| 퀘스트 보상 수령 | `POST` | `/api/quests/{questId}/claim` | EXP, 포인트 반영 |
| 성장 정보 조회 | `GET` | `/api/me/growth` | 레벨, EXP, 포인트 |

### 홈 요약 응답 예시

```json
{
  "userName": "홍길동",
  "representativeBadgeName": "첫 출석",
  "character": {
    "characterId": "study",
    "colorId": "pistachio",
    "imagePath": "/images/characters/study/pistachio.png"
  },
  "level": {
    "level": 3,
    "currentExp": 400,
    "requiredExp": 1500,
    "totalExp": 2650,
    "expPercent": 26,
    "maxLevel": 30,
    "isMaxLevel": false
  },
  "point": 120,
  "todayQuests": [
    {
      "questId": "daily-attendance",
      "title": "실습실 출석",
      "rewardName": "100 EXP",
      "rewardExp": 100,
      "rewardPoint": 10,
      "status": "COMPLETED"
    }
  ]
}
```

협의할 점:

- EXP/레벨 계산은 서버 정본으로 둘지
- 퀘스트 상태값: `IN_PROGRESS`, `COMPLETED`, `CLAIMED`
- 보상 중복 수령 방지 정책
- `CLAIMED` 퀘스트를 오늘 목록에서 숨길지 표시할지

현재 프론트에서 제거해야 할 임시 처리:

- EXP, 퀘스트 수령 여부를 `localStorage`에 저장하는 처리
- 홈 화면의 임시 레벨/뱃지/퀘스트 값

## 8. 기수 신청 / 관리자 대시보드

### 일반 사용자 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 기수 코드 신청 | `POST` | `/api/cohorts/applications` | 홈 기수 신청 UI |
| 내 기수 신청 상태 조회 | `GET` | `/api/me/cohort-application` | 승인 대기/승인/거절 |

### 관리자 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 관리자 로그인 | `POST` | `/api/manager/auth/login` | 관리자 인증 |
| 관리자 회원가입 | `POST` | `/api/manager/auth/register` | 조직 정보 포함 |
| 대시보드 조회 | `GET` | `/api/manager/dashboard` | 현재 관리자 화면 초기 데이터 |
| 기수 생성/수정 | `POST/PATCH` | `/api/manager/cohorts` | 관리자 기수 관리 |
| 가입 신청 승인 | `POST` | `/api/manager/cohort-applications/{id}/approve` | 신청 승인 |
| 가입 신청 거절 | `POST` | `/api/manager/cohort-applications/{id}/reject` | 신청 거절 |
| 공지 생성 | `POST` | `/api/manager/notices` | 기수 공지 |
| 출석 상태 변경 | `PATCH` | `/api/manager/attendances/{id}/status` | 관리자 수동 변경 |
| 센서 임계값 저장 | `PUT` | `/api/manager/sensor-thresholds` | 온도/습도/CO2 |

협의할 점:

- 관리자 권한 모델: 최고 관리자, 기수 관리자, 멘토, 수강생
- 관리자 가입 후 바로 사용 가능한지, 승인 대기 상태가 필요한지
- 대시보드 데이터를 한 번에 내려줄지, 영역별 API로 나눌지
- 관리자 작업 감사 로그 필드

현재 프론트에서 제거해야 할 임시 처리:

- 기수, 신청, 공지, 감사 로그를 `localStorage`에 저장하는 처리
- 관리자 이메일/이름/조직을 `sessionStorage`에 저장하는 처리

## 9. 커뮤니티

### 필요한 API

| 기능 | Method | Path | 비고 |
| --- | --- | --- | --- |
| 게시글 목록 조회 | `GET` | `/api/community/posts` | 홈/커뮤니티 목록 |
| 게시글 작성 | `POST` | `/api/community/posts` | 글쓰기 화면 |
| 게시글 상세 조회 | `GET` | `/api/community/posts/{id}` | 상세 화면 추가 시 |
| 게시글 수정 | `PATCH` | `/api/community/posts/{id}` | 추후 |
| 게시글 삭제 | `DELETE` | `/api/community/posts/{id}` | 추후 |

### 게시글 작성 요청 예시

```json
{
  "type": "free",
  "title": "게시글 제목",
  "content": "게시글 내용"
}
```

협의할 점:

- 게시글 타입 enum
- 첨부파일 지원 여부
- 좋아요/댓글을 MVP에 포함할지
- 작성자 이름과 프로필 이미지 응답 범위

## 10. 프론트 연동 작업 순서 제안

1. 공통 인증 방식과 `/api` prefix 확정
2. 로그인, 회원가입, 내 정보 조회 연동
3. 캐릭터 선택 저장/조회 연동
4. 출석 오늘 상태, 입실, 퇴실, 기록 조회 연동
5. 홈 요약 API 연동
6. 게이미피케이션 진행도와 랭킹의 `studySeconds`, streak 표시 연동
7. Presence snapshot 연동 후 필요 시 WebSocket/STOMP 확장
8. 관리자 대시보드 로컬 저장소 제거
9. 커뮤니티 API 연동
10. 텔레그램 연동 UI가 생기면 링크/알림 API 연결

## 11. 백엔드와 꼭 먼저 맞출 결정 사항

| 항목 | 결정 필요 내용 |
| --- | --- |
| 인증 | 세션 쿠키 / JWT / BFF 중 선택 |
| 시간대 | 모든 서비스 기준 시간을 `Asia/Seoul`로 고정할지 |
| 서비스 날짜 | 출석일, 학습일 전환 시간을 몇 시로 볼지 |
| 응답 에러 | `{ message, code }` 형태로 통일할지 |
| 사용자 식별 | 프론트 요청에 userId를 보낼지, 세션에서만 식별할지 |
| 캐릭터 이미지 | 서버 응답 경로 사용 vs 프론트 조합 |
| 실시간 상태 | MVP snapshot 우선 vs WebSocket/STOMP 즉시 적용 |
| 저장 정본 | 출석, EXP, 퀘스트는 서버를 정본으로 두고 일반 타이머/학습 세션 CRUD는 이번 범위에서 제외 |
| 관리자 권한 | 관리자 역할과 접근 가능 API 범위 |
| 개인정보 | 사용자 목록에 이메일을 노출할지 |
