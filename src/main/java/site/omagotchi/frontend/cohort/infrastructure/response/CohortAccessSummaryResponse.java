package site.omagotchi.frontend.cohort.infrastructure.response;

import java.time.LocalDate;

public record CohortAccessSummaryResponse(
        Long cohortId,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        String status
) {
}
