package site.omagotchi.frontend.learning.infrastructure.request;

import java.util.UUID;

public record LearningAddParticipantRequest(UUID targetUserId) {
}
