package site.omagotchi.frontend.account.infrastructure.response;

public record LearningManagedCohortResponse(
        Long cohortId,
        String cohortName,
        String role
) {
}
