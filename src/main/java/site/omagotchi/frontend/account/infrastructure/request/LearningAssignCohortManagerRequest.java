package site.omagotchi.frontend.account.infrastructure.request;

import java.util.UUID;

public record LearningAssignCohortManagerRequest(
        UUID userId
) {
}
