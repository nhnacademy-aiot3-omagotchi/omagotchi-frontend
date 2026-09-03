package site.omagotchi.frontend.study.application.result;

import java.time.Instant;
import java.util.UUID;

public record StartTimerView(
        String resultCode,
        UUID timerRunId,
        TimerState state,
        Instant startedAt,
        long elapsedSeconds
) {
}
