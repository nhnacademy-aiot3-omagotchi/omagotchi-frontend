package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.OffsetDateTime;

public record LearningVacancyAlertResponse(
        Long alertId,
        Long spaceId,
        Long cohortId,
        OffsetDateTime createdAt
) {
}
