package site.omagotchi.frontend.study.infrastructure.response;

import java.time.Instant;
import java.util.UUID;

public record LearningCurrentTimerResponse(
        LearningTimerState state,
        UUID timerRunId,
        Instant startedAt,
        Long elapsedSeconds
) {
}
