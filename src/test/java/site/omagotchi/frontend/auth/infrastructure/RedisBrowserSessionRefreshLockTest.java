package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.session.data.redis.autoconfigure.SessionDataRedisProperties;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RedisBrowserSessionRefreshLockTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    @DisplayName("Redis Lock 장애의 경계 예외 변환과 cause 보존")
    void wrapsRedisFailure() {
        // Given: 원자적 Lock 획득 중 발생한 Redis 연결 장애
        RedisConnectionFailureException redisFailure =
                new RedisConnectionFailureException("connection refused");
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                any(Duration.class)
        )).willThrow(redisFailure);
        SessionDataRedisProperties properties = new SessionDataRedisProperties();
        properties.setNamespace("omagotchi:session");
        RedisBrowserSessionRefreshLock refreshLock =
                new RedisBrowserSessionRefreshLock(
                        redisTemplate,
                        new RedisBrowserSessionRefreshLockProperties(
                                Duration.ofSeconds(2),
                                Duration.ofMillis(25),
                                Duration.ofSeconds(30)
                        ),
                        properties
                );

        // When: Browser Session Lock 획득
        // Then: Application이 실패 단계를 판단할 수 있는 예외와 원본 cause
        assertThatThrownBy(() -> refreshLock.execute(
                "browser-session-id",
                () -> "unused"
        )).isInstanceOfSatisfying(
                BrowserSessionStoreUnavailableException.class,
                exception -> assertThat(exception.getCause()).isSameAs(redisFailure)
        );
    }
}
