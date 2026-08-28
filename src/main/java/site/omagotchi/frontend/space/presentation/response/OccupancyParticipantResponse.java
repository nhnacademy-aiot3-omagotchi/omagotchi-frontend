package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.OccupancyParticipantView;

import java.util.UUID;

public record OccupancyParticipantResponse(
        UUID userId,
        String displayName,
        boolean occupier
) {
    public static OccupancyParticipantResponse from(OccupancyParticipantView view) {
        return new OccupancyParticipantResponse(view.userId(), view.displayName(), view.occupier());
    }
}
