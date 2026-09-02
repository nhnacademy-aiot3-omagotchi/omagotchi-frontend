package site.omagotchi.frontend.account.presentation.response;

import site.omagotchi.frontend.account.application.result.IdentityAdminAudit;

import java.time.Instant;
import java.util.UUID;

public record AdminAuditResponse(
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

    public static AdminAuditResponse from(IdentityAdminAudit audit) {
        return new AdminAuditResponse(
                audit.auditType(),
                audit.action(),
                audit.actorUserId(),
                audit.actorName(),
                audit.targetUserId(),
                audit.targetName(),
                audit.beforeValue(),
                audit.afterValue(),
                audit.reason(),
                audit.occurredAt()
        );
    }
}
