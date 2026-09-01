package site.omagotchi.frontend.account.infrastructure.request;

import java.util.List;
import java.util.UUID;

public record LearningCohortManagerSearchRequest(
        List<UUID> userIds
) {

    public LearningCohortManagerSearchRequest {
        userIds = userIds == null ? List.of() : List.copyOf(userIds);
    }
}
