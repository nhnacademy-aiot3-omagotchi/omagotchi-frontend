package site.omagotchi.frontend.study.application.result;

import java.time.Instant;
import java.util.UUID;

public record CurrentTimerView(
        TimerState state,
        UUID timerRunId,
        Instant startedAt,
        long elapsedSeconds
) {
}
