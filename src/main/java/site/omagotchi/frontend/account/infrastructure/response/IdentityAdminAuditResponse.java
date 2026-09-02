package site.omagotchi.frontend.account.infrastructure.response;

import java.time.Instant;
import java.util.UUID;

public record IdentityAdminAuditResponse(
        String auditType,
        String action,
        UUID actorUserId,
        String actorName,
        UUID targetUserId,
        String targetName,
        String beforeValue,
        String afterValue,
        String reason,
        Instant occurredAt
) {
}
