package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;

public record LearningTeamResponse(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt
) {
}
