package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.SpaceView;

import java.time.OffsetDateTime;

public record SpaceResponse(
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

    public static SpaceResponse from(SpaceView view) {
        return new SpaceResponse(
                view.spaceId(),
                view.name(),
                view.type(),
                view.capacity(),
                view.operationalStatus(),
                view.inactiveReason(),
                view.cohortId(),
                view.status(),
                view.occupancyExpiresAt(),
                view.remainingTimeSeconds(),
                view.occupiedBySameCohort(),
                view.occupiedByRequester(),
                view.participatingByRequester(),
                view.participantCount()
        );
    }
}
