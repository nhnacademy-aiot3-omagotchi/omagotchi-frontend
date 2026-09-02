package site.omagotchi.frontend.account.presentation.response;

import site.omagotchi.frontend.account.application.result.AdminAccountView;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminAccountResponse(
        UUID accountId,
        String email,
        String name,
        String role,
        String status,
        short failedLoginAttempts,
        Instant lockedUntil,
        Instant withdrawnAt,
        Instant createdAt,
        List<AdminManagedCohortResponse> managedCohorts
) {

    public AdminAccountResponse {
        managedCohorts = List.copyOf(managedCohorts);
    }

    public static AdminAccountResponse from(AdminAccountView account) {
        return new AdminAccountResponse(
                account.accountId(),
                account.email(),
                account.name(),
                account.role(),
                account.status(),
                account.failedLoginAttempts(),
                account.lockedUntil(),
                account.withdrawnAt(),
                account.createdAt(),
                account.managedCohorts().stream()
                        .map(AdminManagedCohortResponse::from)
                        .toList()
        );
    }
}
