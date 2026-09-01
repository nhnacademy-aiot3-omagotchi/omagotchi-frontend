# Presence 로컬 운영형 실행 가이드

## 목적

Testcontainers 대신 실제 로컬 PostgreSQL·Redis와 각 애플리케이션 프로세스를 사용해
운영과 같은 HTTP 경로를 검증한다. 테스트 클래스나 E2E 실행기는 운영 프로세스에 포함하지 않는다.

## 인프라 실행

Docker 호환 런타임이 실행 중이어야 한다.

```bash
# View 저장소: Frontend Session과 Learning Presence가 함께 사용할 실제 Redis
docker compose -f compose.local-runtime.yaml up -d redis

# Learning 저장소: 실제 PostgreSQL
docker compose up -d postgres
```

Redis는 두 애플리케이션이 논리 DB 0을 함께 사용해도 된다. Frontend Session에는
`SESSION_REDIS_NAMESPACE`가 적용되고 Learning Presence는 `realtime:*`, `presence:*` 키를 사용한다.

## 필수 환경값

View `.env.local`:

```dotenv
SESSION_REDIS_HOST=localhost
SESSION_REDIS_PORT=6379
SESSION_REDIS_DATABASE=0
```

Learning `.env.local`:

```dotenv
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DATABASE=0
REALTIME_PRESENCE_SESSION_TTL=120s
```

## 실행 순서

```text
Redis/PostgreSQL
→ Identity :8083
→ Learning :8084
→ Gateway :8080
→ View :8082
```

각 저장소는 `local` profile과 실제 `.env.local`을 사용한다. Gateway의 Learning route에는
`/api/v1/cohorts/**`가 이미 포함되어 있어 별도 WebSocket route는 필요하지 않다.

## 확인 기준

1. 사용자 A가 Home에 들어오면 30초 이내 ONLINE이다.
2. 사용자 B가 다른 브라우저에서 접속하면 snapshot에 A와 B가 함께 표시된다.
3. A가 다른 탭으로 이동해도 ONLINE을 유지한다.
4. A가 탭을 두 개 열고 하나를 닫아도 ONLINE을 유지한다.
5. A의 모든 탭을 닫으면 최대 120초 후 목록에서 사라진다.
6. Learning 또는 Redis를 중단하면 화면은 `0명`이 아니라 `실시간 재실 확인 불가`를 표시한다.
7. 복구 후 다음 heartbeat에서 자동으로 다시 등록된다.

운영 배포 전 검증일 뿐 운영 서버에서 E2E/Testcontainers를 실행한다는 의미는 아니다.
