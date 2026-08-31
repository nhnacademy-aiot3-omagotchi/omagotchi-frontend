package site.omagotchi.frontend.account.application.result;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminAccountView(
        UUID accountId,
        String email,
        String name,
        String role,
        String status,
        short failedLoginAttempts,
        Instant lockedUntil,
        Instant withdrawnAt,
        Instant createdAt,
        List<AdminManagedCohort> managedCohorts
) {

    public AdminAccountView {
        managedCohorts = managedCohorts == null ? List.of() : List.copyOf(managedCohorts);
    }
}
