package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

import static org.assertj.core.api.BDDAssertions.then;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class RedisBrowserSessionRefreshLockPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PropertiesConfig.class);

    @Test
    @DisplayName("유효한 Redis Refresh Lock 설정 바인딩")
    void bindsValidProperties() {
        // Given: 양수이고 대기 시간보다 짧은 Poll 간격
        // When: 설정 바인딩
        contextRunner
                .withPropertyValues(
                        "auth.access-token-refresh.lock.wait-timeout=20s",
                        "auth.access-token-refresh.lock.poll-interval=250ms",
                        "auth.access-token-refresh.lock.lease=45s"
                )
                .run(context -> {
                    // Then: Application Context 기동과 설정값 반영
                    then(context).hasNotFailed();
                    RedisBrowserSessionRefreshLockProperties properties =
                            context.getBean(RedisBrowserSessionRefreshLockProperties.class);
                    assertSoftly(softly -> {
                        softly.assertThat(properties.waitTimeout())
                                .isEqualTo(Duration.ofSeconds(20));
                        softly.assertThat(properties.pollInterval())
                                .isEqualTo(Duration.ofMillis(250));
                        softly.assertThat(properties.lease())
                                .isEqualTo(Duration.ofSeconds(45));
                    });
                });
    }

    @Test
    @DisplayName("Redis Refresh Lock 설정 누락의 기동 실패")
    void rejectsMissingProperties() {
        // Given: Redis Refresh Lock 설정 누락
        // When: 설정 바인딩
        contextRunner.run(context -> {
            // Then: 필수 설정 오류를 포함한 Application Context 기동 실패
            then(context.getStartupFailure())
                    .isNotNull()
                    .hasStackTraceContaining(
                            "auth.access-token-refresh.lock.wait-timeout은 필수입니다."
                    )
                    .hasStackTraceContaining(
                            "auth.access-token-refresh.lock.poll-interval은 필수입니다."
                    )
                    .hasStackTraceContaining(
                            "auth.access-token-refresh.lock.lease는 필수입니다."
                    );
        });
    }

    @Test
    @DisplayName("0인 Redis Refresh Lock 시간 설정의 기동 실패")
    void rejectsNonPositiveDuration() {
        // Given: 0인 Lock 대기 시간
        // When: 설정 바인딩
        contextRunner
                .withPropertyValues(
                        "auth.access-token-refresh.lock.wait-timeout=0s",
                        "auth.access-token-refresh.lock.poll-interval=250ms",
                        "auth.access-token-refresh.lock.lease=45s"
                )
                .run(context -> {
                    // Then: 양수 설정 오류를 포함한 Application Context 기동 실패
                    then(context.getStartupFailure())
                            .isNotNull()
                            .hasStackTraceContaining(
                                    "auth.access-token-refresh.lock.wait-timeout은 "
                                            + "0보다 커야 합니다."
                            );
                });
    }

    @Test
    @DisplayName("Lock 대기보다 짧지 않은 Poll 간격의 기동 실패")
    void rejectsPollIntervalNotShorterThanWaitTimeout() {
        // Given: 대기 상한과 같은 Poll 간격
        // When: 설정 바인딩
        contextRunner
                .withPropertyValues(
                        "auth.access-token-refresh.lock.wait-timeout=100ms",
                        "auth.access-token-refresh.lock.poll-interval=100ms",
                        "auth.access-token-refresh.lock.lease=10s"
                )
                .run(context -> {
                    // Then: Polling 관계 오류를 포함한 Application Context 기동 실패
                    then(context.getStartupFailure())
                            .isNotNull()
                            .hasStackTraceContaining(
                                    "auth.access-token-refresh.lock.poll-interval은 "
                                            + "wait-timeout보다 짧아야 합니다."
                            );
                });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(RedisBrowserSessionRefreshLockProperties.class)
    static class PropertiesConfig {
    }
}
