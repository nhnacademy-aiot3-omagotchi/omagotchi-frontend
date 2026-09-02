package site.omagotchi.frontend.account.infrastructure.response;

import java.time.Instant;
import java.util.UUID;

public record IdentityAdminAccountResponse(
        UUID accountId,
        String email,
        String name,
        String role,
        String status,
        short failedLoginAttempts,
        Instant lockedUntil,
        Instant withdrawnAt,
        Instant createdAt
) {
}
