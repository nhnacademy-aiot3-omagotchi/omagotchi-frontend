package site.omagotchi.frontend.space.application.result;

import java.util.UUID;

public record ParticipantCandidateView(
        UUID userId,
        String displayName,
        String email,
        String status
) {
}
