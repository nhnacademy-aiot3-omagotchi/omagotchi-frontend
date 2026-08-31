package site.omagotchi.frontend.space.application.result;

import java.time.OffsetDateTime;

public record OccupancyView(
        Long occupancyId,
        Long spaceId,
        String status,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        int extensionCount,
        long remainingSeconds
) {
}
