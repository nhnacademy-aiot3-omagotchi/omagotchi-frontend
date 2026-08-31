package site.omagotchi.frontend.auth.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.session.data.redis.autoconfigure.SessionDataRedisProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.port.BrowserSessionRefreshLock;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.session.SessionStoreFailures;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

// Redis를 이용한 브라우저 세션별 토큰 갱신 잠금
@Slf4j
@Component
public class RedisBrowserSessionRefreshLock implements BrowserSessionRefreshLock {

    // 현재 소유자만 잠금을 해제하는 원자적 Redis 명령
    private static final DefaultRedisScript<Long> RELEASE_LOCK_SCRIPT =
            new DefaultRedisScript<>(
                    """
                    if redis.call('GET', KEYS[1]) == ARGV[1] then
                        return redis.call('DEL', KEYS[1])
                    end
                    return 0
                    """,
                    Long.class
    );

    private final StringRedisTemplate redisTemplate;
    private final RedisBrowserSessionRefreshLockProperties properties;
    private final String keyPrefix;

    public RedisBrowserSessionRefreshLock(
            StringRedisTemplate redisTemplate,
            RedisBrowserSessionRefreshLockProperties properties,
            SessionDataRedisProperties sessionProperties
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.keyPrefix = sessionProperties.getNamespace() + ":access-token-refresh:";
    }

    @Override
    public <T> T execute(String sessionId, Supplier<T> operation) {
        String lockKey = lockKey(sessionId);
        String ownerId = acquire(lockKey);
        try {
            return operation.get();
        } finally {
            release(lockKey, ownerId);
        }
    }

    private String acquire(String lockKey) {
        // 늦게 끝난 요청과 새 잠금 소유자를 구분하는 값
        String ownerId = UUID.randomUUID().toString();
        // 잠금 획득을 기다리는 최대 시점
        long deadline = System.nanoTime() + properties.waitTimeout().toNanos();

        do {
            // 만료 시간이 포함된 원자적 잠금 획득
            Boolean acquired = executeStoreOperation(() -> redisTemplate.opsForValue()
                    .setIfAbsent(lockKey, ownerId, properties.lease()));
            if (Boolean.TRUE.equals(acquired)) {
                return ownerId;
            }

            try {
                // 앞선 요청의 토큰 갱신 완료 대기
                Thread.sleep(properties.pollInterval());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new BusinessException(
                        CommonErrorCode.SERVICE_UNAVAILABLE,
                        exception
                );
            }
        } while (System.nanoTime() < deadline);

        throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE);
    }

    private void release(String lockKey, String ownerId) {
        try {
            Long released = executeStoreOperation(() -> redisTemplate.execute(
                    RELEASE_LOCK_SCRIPT,
                    List.of(lockKey),
                    ownerId
            ));
            if (!Long.valueOf(1L).equals(released)) {
                log.warn(
                        "Access Token Refresh Lock lease가 만료된 뒤 해제되었습니다."
                );
            }
        } catch (BrowserSessionStoreUnavailableException exception) {
            // 잠금 해제 실패 시 만료 시간을 통한 자동 정리
            log.warn(
                    "Access Token Refresh Lock 해제에 실패했습니다. lease TTL로 정리됩니다. exception={}",
                    exception.getClass().getName(),
                    exception
            );
        }
    }

    private static <T> T executeStoreOperation(Supplier<T> operation) {
        try {
            return operation.get();
        } catch (RuntimeException exception) {
            if (SessionStoreFailures.isFailure(exception)) {
                throw new BrowserSessionStoreUnavailableException(exception);
            }
            throw exception;
        }
    }

    private String lockKey(String sessionId) {
        return keyPrefix + sessionId;
    }
}
