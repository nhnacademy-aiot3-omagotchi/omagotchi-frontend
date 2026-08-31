package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.session.data.redis.autoconfigure.SessionDataRedisProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import site.omagotchi.frontend.auth.application.port.BrowserSessionRefreshLock;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class RedisBrowserSessionRefreshLockIT {

    @SuppressWarnings("resource")
    @Container
    @ServiceConnection(name = "redis")
    private static final GenericContainer<?> REDIS = new GenericContainer<>(
            DockerImageName.parse("redis:7.4-alpine")
    ).withExposedPorts(6379);

    @Autowired
    private BrowserSessionRefreshLock refreshLock;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private SessionDataRedisProperties sessionProperties;

    @Test
    @DisplayName("같은 Browser Session의 작업 직렬화")
    void serializesOperationsForSameSession() throws Exception {
        // Given: 같은 Session Lock에서 첫 작업이 진행 중인 상태
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch finishFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<String> first = executor.submit(() -> refreshLock.execute(
                    "serialized-session",
                    () -> {
                        firstStarted.countDown();
                        await(finishFirst);
                        return "first";
                    }
            ));
            assertThat(firstStarted.await(1, TimeUnit.SECONDS)).isTrue();

            Future<String> second = executor.submit(() -> refreshLock.execute(
                    "serialized-session",
                    () -> {
                        secondStarted.countDown();
                        return "second";
                    }
            ));

            // When: 첫 작업이 Lock을 해제하기 전
            // Then: 두 번째 작업은 실행되지 않음
            assertThat(secondStarted.await(150, TimeUnit.MILLISECONDS)).isFalse();

            finishFirst.countDown();
            assertThat(first.get(1, TimeUnit.SECONDS)).isEqualTo("first");
            assertThat(second.get(1, TimeUnit.SECONDS)).isEqualTo("second");
        } finally {
            finishFirst.countDown();
        }
    }

    @Test
    @DisplayName("lease가 끝난 이전 owner의 새 Lock 해제 방어")
    void preventsExpiredOwnerFromReleasingNewLock() throws Exception {
        // Given: 짧은 lease의 이전 작업과 그 뒤 Lock을 획득한 새 작업
        RedisBrowserSessionRefreshLock expiredOwner = lock(
                Duration.ofMillis(50),
                Duration.ofMillis(10),
                Duration.ofMillis(100)
        );
        RedisBrowserSessionRefreshLock newOwner = lock(
                Duration.ofSeconds(1),
                Duration.ofMillis(10),
                Duration.ofSeconds(3)
        );
        RedisBrowserSessionRefreshLock contender = lock(
                Duration.ofMillis(100),
                Duration.ofMillis(10),
                Duration.ofSeconds(3)
        );
        CountDownLatch expiredOwnerStarted = new CountDownLatch(1);
        CountDownLatch finishExpiredOwner = new CountDownLatch(1);
        CountDownLatch newOwnerStarted = new CountDownLatch(1);
        CountDownLatch finishNewOwner = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<String> expired = executor.submit(() -> expiredOwner.execute(
                    "owner-session",
                    () -> {
                        expiredOwnerStarted.countDown();
                        await(finishExpiredOwner);
                        return "expired-owner";
                    }
            ));
            assertThat(expiredOwnerStarted.await(1, TimeUnit.SECONDS)).isTrue();

            Future<String> current = executor.submit(() -> newOwner.execute(
                    "owner-session",
                    () -> {
                        newOwnerStarted.countDown();
                        await(finishNewOwner);
                        return "new-owner";
                    }
            ));
            assertThat(newOwnerStarted.await(2, TimeUnit.SECONDS)).isTrue();

            // When: lease가 끝난 이전 owner가 뒤늦게 작업을 종료
            finishExpiredOwner.countDown();
            assertThat(expired.get(1, TimeUnit.SECONDS)).isEqualTo("expired-owner");

            // Then: 새 owner의 Lock은 유지되어 세 번째 작업이 들어오지 못함
            AtomicBoolean contenderExecuted = new AtomicBoolean();
            assertThatThrownBy(() -> contender.execute(
                    "owner-session",
                    () -> {
                        contenderExecuted.set(true);
                        return "contender";
                    }
            )).isInstanceOfSatisfying(BusinessException.class, exception ->
                    assertThat(exception.getErrorCode())
                            .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE)
            );
            assertThat(contenderExecuted).isFalse();

            finishNewOwner.countDown();
            assertThat(current.get(1, TimeUnit.SECONDS)).isEqualTo("new-owner");
        } finally {
            finishExpiredOwner.countDown();
            finishNewOwner.countDown();
        }
    }

    private RedisBrowserSessionRefreshLock lock(
            Duration waitTimeout,
            Duration pollInterval,
            Duration lease
    ) {
        return new RedisBrowserSessionRefreshLock(
                redisTemplate,
                new RedisBrowserSessionRefreshLockProperties(
                        waitTimeout,
                        pollInterval,
                        lease
                ),
                sessionProperties
        );
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
