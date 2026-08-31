package site.omagotchi.frontend.space.application.result;

import java.time.OffsetDateTime;

public record VacancyAlertView(
        Long alertId,
        Long spaceId,
        Long cohortId,
        OffsetDateTime createdAt
) {
}
