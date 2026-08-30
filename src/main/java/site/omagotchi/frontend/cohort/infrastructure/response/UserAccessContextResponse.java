package site.omagotchi.frontend.cohort.infrastructure.response;

import java.util.List;

public record UserAccessContextResponse(
        String globalRole,
        String accessType,
        List<CohortAccessSummaryResponse> managedCohorts,
        List<CohortAccessSummaryResponse> studentCohorts
) {
    public UserAccessContextResponse {
        managedCohorts = managedCohorts == null ? List.of() : List.copyOf(managedCohorts);
        studentCohorts = studentCohorts == null ? List.of() : List.copyOf(studentCohorts);
    }

    public boolean isCohortManager() {
        return "COHORT_MANAGER".equals(accessType);
    }
}
