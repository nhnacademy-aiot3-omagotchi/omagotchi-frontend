# Frontend Backend Contract

The browser integrates through `window.OmagotchiApi` in `src/main/resources/static/js/api.js`.
Keep these browser-facing paths stable even if the server implementation later uses REST, OpenFeign, or another internal backend call style.

## Runtime Behavior

- Base path: `/api` by default.
- Override: set `window.OMAGOTCHI_API_BASE` or `<html data-api-base="...">`.
- Credentials: same-origin cookies are sent with every request.
- Fallback mode: failed API calls return `null` unless `window.OMAGOTCHI_API_STRICT = true`.
- Launch mode: set strict mode during QA so missing endpoints fail visibly.

## Auth And Profile

`POST /api/auth/login`

Request:
```json
{ "email": "student@example.com", "password": "password" }
```

Response:
```json
{ "user": { "email": "student@example.com", "name": "student" }, "redirectUrl": "/check-in" }
```

`POST /api/auth/register`

Request:
```json
{ "email": "student@example.com", "password": "password" }
```

Response:
```json
{ "redirectUrl": "/username" }
```

`PUT /api/me/profile`

Request:
```json
{ "email": "student@example.com", "username": "student" }
```

Response may be `204 No Content` or a user object.

`POST /api/auth/password-reset/lookup`

Request:
```json
{ "email": "student@example.com" }
```

Response:
```json
{ "exists": true }
```

`POST /api/auth/password-reset`

Request:
```json
{ "email": "student@example.com", "newPassword": "new-password" }
```

Response may be `204 No Content`.

## Character

`PUT /api/me/character`

Request:
```json
{ "characterId": "study", "colorId": "original" }
```

Response may be `204 No Content`.

## Attendance

`GET /api/attendance/history`

Response can be either an object keyed by date:
```json
{
  "2026-08-02": {
    "checkInAt": "2026-08-02T00:10:00Z",
    "checkOutAt": null
  }
}
```

Or an array:
```json
[
  {
    "date": "2026-08-02",
    "checkInAt": "2026-08-02T00:10:00Z",
    "checkOutAt": null
  }
]
```

`POST /api/attendance/check-in`

Response:
```json
{
  "date": "2026-08-02",
  "checkInAt": "2026-08-02T00:10:00Z",
  "status": "PRESENT"
}
```

`POST /api/attendance/check-out`

Response:
```json
{
  "date": "2026-08-02",
  "checkInAt": "2026-08-02T00:10:00Z",
  "checkOutAt": "2026-08-02T09:00:00Z",
  "status": "CHECKED_OUT"
}
```

## Presence

`GET /api/presence/lab`

Response:
```json
{
  "capacity": 50,
  "occupiedCount": 18,
  "users": [
    {
      "id": "user-1",
      "name": "Student",
      "email": "student@example.com",
      "status": "present",
      "characterImage": "/images/characters/study/study.png"
    }
  ]
}
```

`GET /api/presence/lab/stream`

SSE event data should use the same JSON shape as `/api/presence/lab`.

## Study Records

`GET /api/study-records`

Response:
```json
[
  {
    "id": "segment-1",
    "sessionId": "timer-1",
    "sequence": 1,
    "name": "1",
    "tags": ["Java"],
    "durationSeconds": 1800,
    "elapsedSeconds": 1800,
    "recordedAt": "2026-08-02T01:00:00Z",
    "updatedAt": "2026-08-02T01:00:00Z"
  }
]
```

`POST /api/study-records`

Request uses the same record shape. Response may return the saved record, including the server-generated `id`.

`PATCH /api/study-records/{id}`

Request uses the edited record shape. Response may be `204 No Content` or the saved record.

## Cohorts

`POST /api/cohorts/applications`

Request:
```json
{ "code": "AIOT3" }
```

Response:
```json
{ "message": "참가 신청이 완료되었습니다. 관리자 승인을 기다려주세요." }
```

If the code is invalid, prefer a non-2xx response with `{ "message": "..." }`.

## Community

`POST /api/community/posts`

Request:
```json
{
  "type": "free",
  "title": "게시글 제목",
  "content": "게시글 내용",
  "likes": 0,
  "comments": 0,
  "attachments": 0
}
```

Response may return the saved post, including server-generated fields.

## Manager

`POST /api/manager/auth/login`

Request:
```json
{ "email": "manager@example.com", "password": "password" }
```

Response:
```json
{ "manager": { "email": "manager@example.com", "name": "manager" }, "redirectUrl": "/manager-dashboard" }
```

`POST /api/manager/auth/register`

Request:
```json
{
  "email": "manager@example.com",
  "password": "password",
  "username": "manager",
  "organization": "NHN Academy"
}
```

Response may include `redirectUrl`.

`GET /api/manager/dashboard`

Response:
```json
{
  "selectedCohortId": "aiot-3",
  "cohorts": [],
  "applications": [],
  "notices": [],
  "audits": []
}
```
