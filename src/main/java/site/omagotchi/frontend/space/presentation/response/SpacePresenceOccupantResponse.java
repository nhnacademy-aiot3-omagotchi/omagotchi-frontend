package site.omagotchi.frontend.space.presentation.response;

import java.util.UUID;

public record SpacePresenceOccupantResponse(
        UUID userId,
        String displayName
) {
}
