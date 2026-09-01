package site.omagotchi.frontend.account.presentation.response;

import site.omagotchi.frontend.account.application.result.AdminManagedCohort;

public record AdminManagedCohortResponse(
        Long cohortId,
        String cohortName,
        String role
) {

    public static AdminManagedCohortResponse from(AdminManagedCohort cohort) {
        return new AdminManagedCohortResponse(
                cohort.cohortId(),
                cohort.cohortName(),
                cohort.role()
        );
    }
}
