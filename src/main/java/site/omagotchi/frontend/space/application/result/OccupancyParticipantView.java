package site.omagotchi.frontend.space.application.result;

import java.util.UUID;

public record OccupancyParticipantView(
        UUID userId,
        String displayName,
        boolean occupier
) {
}
