package site.omagotchi.frontend.auth.infrastructure;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

// Redis 갱신 잠금의 획득 대기·재확인·유지 시간
@Validated
@ConfigurationProperties(prefix = "auth.access-token-refresh.lock")
public record RedisBrowserSessionRefreshLockProperties(
        @NotNull(message = "auth.access-token-refresh.lock.wait-timeout은 필수입니다.")
        @DurationMin(
                nanos = 1,
                message = "auth.access-token-refresh.lock.wait-timeout은 0보다 커야 합니다."
        )
        Duration waitTimeout,

        @NotNull(message = "auth.access-token-refresh.lock.poll-interval은 필수입니다.")
        @DurationMin(
                nanos = 1,
                message = "auth.access-token-refresh.lock.poll-interval은 0보다 커야 합니다."
        )
        Duration pollInterval,

        @NotNull(message = "auth.access-token-refresh.lock.lease는 필수입니다.")
        @DurationMin(
                nanos = 1,
                message = "auth.access-token-refresh.lock.lease는 0보다 커야 합니다."
        )
        Duration lease
) {

    // 대기 시간 안에 잠금 획득을 다시 확인할 수 있는 Poll 간격
    @AssertTrue(
            message = "auth.access-token-refresh.lock.poll-interval은 "
                    + "wait-timeout보다 짧아야 합니다."
    )
    public boolean isPollIntervalShorterThanWaitTimeout() {
        return pollInterval == null
                || waitTimeout == null
                || pollInterval.compareTo(waitTimeout) < 0;
    }
}
