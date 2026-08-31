package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;

public record LearningOccupancyResponse(
        Long occupancyId,
        Long spaceId,
        String status,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        int extensionCount,
        long remainingSeconds
) {
}
