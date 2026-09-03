package site.omagotchi.frontend.attendance.infrastructure.response;

import java.time.Instant;

public record LearningCurrentPresenceResponse(
        Long spaceId,
        String state,
        Instant startedAt
) {
}
