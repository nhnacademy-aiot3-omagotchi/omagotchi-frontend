package site.omagotchi.frontend.account.application.result;

public record AdminManagedCohort(
        Long cohortId,
        String cohortName,
        String role
) {
}
