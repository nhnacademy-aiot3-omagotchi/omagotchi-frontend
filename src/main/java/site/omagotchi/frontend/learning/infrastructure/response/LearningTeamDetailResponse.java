package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;
import java.util.List;

public record LearningTeamDetailResponse(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt,
        int memberCount,
        Long myMemberId,
        String myRole,
        List<LearningTeamMemberResponse> members
) {
}
