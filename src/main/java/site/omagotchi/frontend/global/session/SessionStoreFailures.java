package site.omagotchi.frontend.global.session;

import io.lettuce.core.RedisCommandTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

// Spring Session 단일 Redis 사용을 전제로 한 연결 실패·명령 시간 초과 판별
// 다른 Redis 용도 추가 시 발생 경계 기반 분류 재검토 필요
public final class SessionStoreFailures {

    private SessionStoreFailures() {
    }

    public static boolean isFailure(Throwable exception) {
        // 최상위 예외부터 근본 원인까지의 순환 안전 검사
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
