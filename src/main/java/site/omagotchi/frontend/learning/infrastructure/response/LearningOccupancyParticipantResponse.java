package site.omagotchi.frontend.learning.infrastructure.response;

import java.util.UUID;

public record LearningOccupancyParticipantResponse(
        UUID userId,
        String displayName,
        boolean occupier
) {
}
