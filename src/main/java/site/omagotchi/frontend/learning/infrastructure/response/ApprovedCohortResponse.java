package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.LocalDate;

public record ApprovedCohortResponse(
        Long cohortId,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        String cohortStatus,
        String role,
        String membershipStatus
) {
}
