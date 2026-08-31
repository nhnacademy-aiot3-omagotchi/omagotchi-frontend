package site.omagotchi.frontend.space.presentation.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddParticipantRequest(
        @NotNull UUID targetUserId
) {
}
