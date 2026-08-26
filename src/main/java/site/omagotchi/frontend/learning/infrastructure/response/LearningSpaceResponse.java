package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record LearningSpaceResponse(
        Long spaceId,
        String name,
        String type,
        Integer capacity,
        String operationalStatus,
        String inactiveReason,
        Long cohortId,
        String status,
        OffsetDateTime occupancyExpiresAt,
        Long remainingTimeSeconds,
        boolean occupiedBySameCohort,
        Long occupancyCohortId,
        Long occupierMembershipId,
        UUID occupierUserId,
        List<UUID> participantUserIds
) {
}
