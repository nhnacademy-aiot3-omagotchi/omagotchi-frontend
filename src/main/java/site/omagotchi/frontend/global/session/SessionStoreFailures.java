package site.omagotchi.frontend.global.session;

import io.lettuce.core.RedisCommandTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

// Spring Session과 토큰 갱신 잠금에서 발생한 Redis 장애 판별
// 다른 Redis 기능 추가 시 적용 범위 재검토
public final class SessionStoreFailures {

    private SessionStoreFailures() {
    }

    public static boolean isFailure(Throwable exception) {
        // 중첩 원인과 순환 참조를 포함한 Redis 장애 탐색
        Throwable current = exception;
        Set<Throwable> inspected = Collections.newSetFromMap(new IdentityHashMap<>());
        while (current != null && inspected.add(current)) {
            if (current instanceof RedisConnectionFailureException
                    || current instanceof RedisCommandTimeoutException
            ) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
