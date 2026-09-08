package site.omagotchi.frontend.space.application.result;

import java.time.OffsetDateTime;

public record SpaceView(
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
        boolean occupiedByRequester,
        boolean participatingByRequester,
        Integer participantCount,
        long currentPresenceCount
) {
    public SpaceView(
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
            boolean occupiedByRequester,
            boolean participatingByRequester,
            Integer participantCount
    ) {
        this(
                spaceId, name, type, capacity, operationalStatus, inactiveReason,
                cohortId, status, occupancyExpiresAt, remainingTimeSeconds,
                occupiedBySameCohort, occupiedByRequester,
                participatingByRequester, participantCount, 0L
        );
    }
}
