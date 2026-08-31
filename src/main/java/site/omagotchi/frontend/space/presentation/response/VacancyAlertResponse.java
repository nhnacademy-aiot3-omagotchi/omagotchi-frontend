package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.VacancyAlertView;

import java.time.OffsetDateTime;

public record VacancyAlertResponse(
        Long alertId,
        Long spaceId,
        Long cohortId,
        OffsetDateTime createdAt
) {
    public static VacancyAlertResponse from(VacancyAlertView view) {
        return new VacancyAlertResponse(
                view.alertId(), view.spaceId(), view.cohortId(), view.createdAt());
    }
}
