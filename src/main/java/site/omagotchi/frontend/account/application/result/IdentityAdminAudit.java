package site.omagotchi.frontend.account.application.result;

import java.time.Instant;
import java.util.UUID;

/**
 * Identity 권한 변경 감사 한 줄.
 *
 * <p>{@code actorName}과 {@code targetName}은 계정 조회에 실패하면 null 이다. 감사의
 * 주체는 UUID 가 보장하므로 이름이 없다고 행을 버리지 않는다.</p>
 */
public record IdentityAdminAudit(
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
