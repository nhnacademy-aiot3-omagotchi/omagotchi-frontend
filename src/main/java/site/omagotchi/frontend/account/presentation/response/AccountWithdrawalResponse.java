package site.omagotchi.frontend.account.presentation.response;

import java.time.Instant;

public record AccountWithdrawalResponse(
        Instant recoveryDeadline
) {
}
