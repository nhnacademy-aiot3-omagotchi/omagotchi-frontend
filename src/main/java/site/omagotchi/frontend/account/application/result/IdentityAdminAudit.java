package site.omagotchi.frontend.account.application.result;

import java.time.Instant;
import java.util.UUID;

/**
 * Identity 권한 변경 감사 한 줄.
 *
 * <p>{@code actorName}과 {@code targetName}은 계정 조회에 실패하면 null 이다. 감사의
 * 주체는 UUID 가 보장하므로 이름이 없다고 행을 버리지 않는다.</p>
 *
 * <p>{@code beforeValue}, {@code afterValue}, {@code reason} 도 null 일 수 있다.
 * 최초 권한 부여에는 이전 값이 없고, 사유를 남기지 않는 작업도 있다.
 * 값이 없다는 사실은 화면이 표기한다.</p>
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
