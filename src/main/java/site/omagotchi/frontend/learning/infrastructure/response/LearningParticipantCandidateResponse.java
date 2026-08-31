package site.omagotchi.frontend.learning.infrastructure.response;

import java.util.UUID;

public record LearningParticipantCandidateResponse(
        UUID userId,
        String displayName,
        String email,
        String status
) {
}
