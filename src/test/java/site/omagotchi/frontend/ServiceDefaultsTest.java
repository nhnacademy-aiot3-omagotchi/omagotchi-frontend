package site.omagotchi.frontend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.session.autoconfigure.SessionProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import site.omagotchi.frontend.auth.application.AccessTokenRefreshProperties;
import site.omagotchi.frontend.auth.infrastructure.RedisBrowserSessionRefreshLockProperties;

import java.time.Duration;

import static org.assertj.core.api.BDDAssertions.then;

class ServiceDefaultsTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withPropertyValues("spring.config.location=classpath:/application.yaml")
            .withUserConfiguration(PropertiesConfig.class);

    @Test
    @DisplayName("환경변수 없이 세션 12시간과 갱신 정책 기본값 적용")
    void bindsDefaultsWithoutPolicyEnvironmentVariables() {
        // Given: 운영·테스트 프로필의 덮어쓰기 없는 서비스 기본 설정
        // When
        contextRunner.run(context -> {
            // Then: 세션 기본값과 갱신 잠금의 시간 관계 유지
            then(context).hasNotFailed();
            then(context.getBean(SessionProperties.class).getTimeout())
                    .isEqualTo(Duration.ofHours(12));
            then(context.getBean(AccessTokenRefreshProperties.class).refreshBeforeExpiry())
                    .isPositive();
            RedisBrowserSessionRefreshLockProperties lock =
                    context.getBean(RedisBrowserSessionRefreshLockProperties.class);
            then(lock.pollInterval()).isLessThan(lock.waitTimeout());
            then(lock.lease()).isGreaterThan(lock.waitTimeout());
        });
    }

    @Test
    @DisplayName("기존 환경변수의 서비스 기본값 덮어쓰기 유지")
    void preservesLegacyEnvironmentOverrides() {
        // Given: Infra 전환 전의 기존 키
        // When
        contextRunner.withPropertyValues("SESSION_TIMEOUT=PT30M", "ACCESS_TOKEN_REFRESH_BEFORE_EXPIRY=15s")
                .run(context -> {
                    // Then
                    then(context).hasNotFailed();
                    then(context.getBean(SessionProperties.class).getTimeout())
                            .isEqualTo(Duration.ofMinutes(30));
                    then(context.getBean(AccessTokenRefreshProperties.class).refreshBeforeExpiry())
                            .isEqualTo(Duration.ofSeconds(15));
                });
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties({SessionProperties.class, AccessTokenRefreshProperties.class,
            RedisBrowserSessionRefreshLockProperties.class})
    static class PropertiesConfig {
    }
}
