package site.omagotchi.frontend.auth.application;

import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

// Access Token 선제 갱신 기준
@Validated
@ConfigurationProperties(prefix = "auth.access-token-refresh")
public record AccessTokenRefreshProperties(
        @NotNull(message = "auth.access-token-refresh.refresh-before-expiry는 필수입니다.")
        @DurationMin(
                nanos = 1,
                message = "auth.access-token-refresh.refresh-before-expiry는 0보다 커야 합니다."
        )
        Duration refreshBeforeExpiry
) {
}
