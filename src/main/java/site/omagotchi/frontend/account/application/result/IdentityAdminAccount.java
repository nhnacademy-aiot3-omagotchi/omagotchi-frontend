package site.omagotchi.frontend.account.application.result;

import java.time.Instant;
import java.util.UUID;

/** Identity가 소유하는 관리자 계정 조회 결과다. Learning 기수 정보는 포함하지 않는다. */
public record IdentityAdminAccount(
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
        Instant createdAt
) {
}
