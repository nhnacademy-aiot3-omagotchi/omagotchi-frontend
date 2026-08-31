package site.omagotchi.frontend.auth.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

import static org.assertj.core.api.BDDAssertions.then;

class AccessTokenRefreshPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PropertiesConfig.class);

    @Test
    @DisplayName("유효한 Access Token 선제 Refresh 설정 바인딩")
    void bindsValidProperties() {
        // Given: 양수(+) 선제 Refresh 시간
        // When: 설정 바인딩
        contextRunner
                .withPropertyValues(
                        "auth.access-token-refresh.refresh-before-expiry=30s"
                )
                .run(context -> {
                    // Then: Application Context 기동과 설정값 반영
                    then(context).hasNotFailed();
                    AccessTokenRefreshProperties properties =
                            context.getBean(AccessTokenRefreshProperties.class);
                    then(properties.refreshBeforeExpiry())
                            .isEqualTo(Duration.ofSeconds(30));
                });
    }

    @Test
    @DisplayName("Access Token 선제 Refresh 설정 누락의 기동 실패")
    void rejectsMissingProperty() {
        // Given: 선제 Refresh 시간 설정 누락
        // When: 설정 바인딩
        contextRunner.run(context -> {
            // Then: 필수 설정 오류를 포함한 Application Context 기동 실패
            then(context.getStartupFailure())
                    .isNotNull()
                    .hasStackTraceContaining(
                            "auth.access-token-refresh.refresh-before-expiry는 필수입니다."
                    );
        });
    }

    @Test
    @DisplayName("0인 Access Token 선제 Refresh 설정의 기동 실패")
    void rejectsNonPositiveDuration() {
        // Given: 0인 선제 Refresh 시간
        // When: 설정 바인딩
        contextRunner
                .withPropertyValues(
                        "auth.access-token-refresh.refresh-before-expiry=0s"
                )
                .run(context -> {
                    // Then: 양수 설정 오류를 포함한 Application Context 기동 실패
                    then(context.getStartupFailure())
                            .isNotNull()
                            .hasStackTraceContaining(
                                    "auth.access-token-refresh.refresh-before-expiry는 "
                                            + "0보다 커야 합니다."
                            );
                });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AccessTokenRefreshProperties.class)
    static class PropertiesConfig {
    }
}
