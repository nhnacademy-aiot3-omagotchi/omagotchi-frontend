package site.omagotchi.frontend.global.session;

import org.springframework.data.redis.RedisConnectionFailureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SessionStoreFailuresTest {

    @Test
    @DisplayName("순환 원인 chain의 Redis 장애 오분류와 무한 순회 방지")
    void terminatesForCyclicCauseChain() {
        // Given: Redis와 무관한 순환 원인 chain
        RuntimeException first = new RuntimeException("first");
        RuntimeException second = new RuntimeException("second", first);
        first.initCause(second);

        // When: Session Store 장애 판별
        boolean result = SessionStoreFailures.isFailure(first);

        // Then: 무한 순회 없이 Redis 장애 아님 반환
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("순환 원인 chain 안의 Redis 연결 실패 식별")
    void detectsRedisFailureInsideCyclicCauseChain() {
        // Given: Redis 연결 실패를 포함한 순환 원인 chain
        RuntimeException first = new RuntimeException("first");
        RedisConnectionFailureException redisFailure =
                new RedisConnectionFailureException("connection refused", first);
        first.initCause(redisFailure);

        // When: Session Store 장애 판별
        boolean result = SessionStoreFailures.isFailure(first);

        // Then: 순환과 무관한 Redis 장애 식별
        assertThat(result).isTrue();
    }
}
