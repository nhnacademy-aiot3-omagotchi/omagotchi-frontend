package site.omagotchi.frontend.learning.infrastructure.response;

import java.util.List;

public record LearningSpacePresenceDetailResponse(
        Long spaceId,
        long totalCount,
        long cohortCount,
        long otherCohortCount,
        List<LearningSpacePresenceOccupantResponse> occupants
) {
}
