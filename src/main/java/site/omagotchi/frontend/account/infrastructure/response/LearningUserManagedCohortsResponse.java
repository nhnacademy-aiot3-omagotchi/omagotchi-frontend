package site.omagotchi.frontend.account.infrastructure.response;

import java.util.List;
import java.util.UUID;

public record LearningUserManagedCohortsResponse(
        UUID userId,
        List<LearningManagedCohortResponse> cohorts
) {
}
