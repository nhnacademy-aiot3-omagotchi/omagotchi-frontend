package site.omagotchi.frontend.account.infrastructure.response;

public record GatewayManagedCohortResponse(
        Long cohortId,
        String cohortName,
        String role
) {
}
