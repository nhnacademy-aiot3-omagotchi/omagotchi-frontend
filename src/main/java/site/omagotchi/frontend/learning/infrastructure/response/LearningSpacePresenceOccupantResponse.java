package site.omagotchi.frontend.learning.infrastructure.response;

import java.util.UUID;

public record LearningSpacePresenceOccupantResponse(
        UUID userId,
        String displayName
) {
}
