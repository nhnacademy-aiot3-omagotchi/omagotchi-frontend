package site.omagotchi.frontend.account.application.port;

import site.omagotchi.frontend.account.application.result.AdminManagedCohort;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface LearningCohortManagerClient {

    Map<UUID, List<AdminManagedCohort>> findManagedCohorts(
            String accessToken,
            List<UUID> accountIds
    );

    void assignManager(String accessToken, UUID userId, Long cohortId);

    void removeManager(String accessToken, UUID userId, Long cohortId);
}
