package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.OccupancyView;

import java.time.OffsetDateTime;

public record OccupancyResponse(
        Long occupancyId,
        Long spaceId,
        String status,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        int extensionCount,
        long remainingSeconds
) {

    public static OccupancyResponse from(OccupancyView view) {
        return new OccupancyResponse(
                view.occupancyId(),
                view.spaceId(),
                view.status(),
                view.startedAt(),
                view.expiresAt(),
                view.extensionCount(),
                view.remainingSeconds()
        );
    }
}
