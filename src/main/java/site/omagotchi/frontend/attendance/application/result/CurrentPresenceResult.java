package site.omagotchi.frontend.attendance.application.result;

import java.time.Instant;

public record CurrentPresenceResult(
        Long spaceId,
        String state,
        Instant startedAt
) {
}
