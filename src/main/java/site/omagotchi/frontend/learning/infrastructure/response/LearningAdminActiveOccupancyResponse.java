package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LearningAdminActiveOccupancyResponse(
        Long spaceId,
        String spaceName,
        Long occupancyId,
        UUID occupierUserId,
        String occupierDisplayName,
        int participantCount,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        long remainingTimeSeconds,
        String status
) {
}
