package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;

public record LearningTeamMemberResponse(
        Long memberId,
        String displayName,
        String role,
        OffsetDateTime joinedAt
) {
}
