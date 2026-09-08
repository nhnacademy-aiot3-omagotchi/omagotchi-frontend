package site.omagotchi.frontend.space.presentation.response;

import java.util.List;

public record SpacePresenceDetailResponse(
        Long spaceId,
        long totalCount,
        long cohortCount,
        long otherCohortCount,
        List<SpacePresenceOccupantResponse> occupants
) {
}
