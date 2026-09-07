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
        List<UUID> participantUserIds,
        long currentPresenceCount
) {
    public LearningSpaceResponse(
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
        this(
                spaceId, name, type, capacity, operationalStatus, inactiveReason,
                cohortId, status, occupancyExpiresAt, remainingTimeSeconds,
                occupiedBySameCohort, occupancyCohortId, occupierMembershipId,
                occupierUserId, participantUserIds, 0L
        );
    }
}
