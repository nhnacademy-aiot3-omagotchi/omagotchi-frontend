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
        boolean locked,
        Instant lockedUntil,
        Instant statusChangedAt,
        Instant recoveryDeadline,
        Instant createdAt,
        List<AdminManagedCohort> managedCohorts
) {

    public AdminAccountView {
        managedCohorts = managedCohorts == null ? List.of() : List.copyOf(managedCohorts);
    }

    public static AdminAccountView from(
            IdentityAdminAccount account,
            List<AdminManagedCohort> managedCohorts
    ) {
        return new AdminAccountView(
                account.accountId(),
                account.email(),
                account.name(),
                account.role(),
                account.status(),
                account.failedLoginAttempts(),
                account.locked(),
                account.lockedUntil(),
                account.statusChangedAt(),
                account.recoveryDeadline(),
                account.createdAt(),
                managedCohorts
        );
    }
}
