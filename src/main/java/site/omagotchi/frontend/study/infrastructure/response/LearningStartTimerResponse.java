package site.omagotchi.frontend.study.infrastructure.response;

import java.time.Instant;
import java.util.UUID;

public record LearningStartTimerResponse(
        String resultCode,
        UUID timerRunId,
        LearningTimerState state,
        Instant startedAt,
        Long elapsedSeconds
) {
}
