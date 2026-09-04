package site.omagotchi.frontend.account.infrastructure.response;

import java.time.Instant;

public record IdentityAccountWithdrawalResponse(
        Instant recoveryDeadline
) {
}
