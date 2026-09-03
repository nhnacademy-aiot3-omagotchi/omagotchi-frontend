package site.omagotchi.frontend.team.presentation.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddTeamMemberRequest(
        @NotNull UUID targetUserId
) {
}
