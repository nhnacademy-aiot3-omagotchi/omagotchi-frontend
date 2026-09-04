package site.omagotchi.frontend.account.infrastructure.response;

import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccount;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Instant;
import java.util.UUID;

public record IdentityAdminAccountResponse(
        @NotNull
        UUID accountId,
        @NotBlank
        String email,
        @NotBlank
        String name,
        @NotNull
        @Pattern(regexp = "USER|SYSTEM_ADMIN")
        String role,
        @NotNull
        @Pattern(regexp = "ACTIVE|DISABLED|WITHDRAWN")
        String status,
        @NotNull
        @PositiveOrZero
        Short failedLoginAttempts,
        @NotNull
        Boolean locked,
        Instant lockedUntil,
        @NotNull
        Instant statusChangedAt,
        Instant recoveryDeadline,
        @NotNull
        Instant createdAt
) {

    public IdentityAdminAccount toResult(Validator validator) {
        if (validator.validate(this).isEmpty() && hasConsistentState()) {
            return new IdentityAdminAccount(
                    accountId,
                    email,
                    name,
                    role,
                    status,
                    failedLoginAttempts,
                    locked,
                    lockedUntil,
                    statusChangedAt,
                    recoveryDeadline,
                    createdAt
            );
        }
        throw new BusinessException(
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                "Identity 관리자 계정 항목 응답 오류"
        );
    }

    private boolean hasConsistentState() {
        if (failedLoginAttempts == null || locked == null || status == null) {
            return false;
        }

        boolean active = "ACTIVE".equals(status);
        if (!active && (locked || lockedUntil != null || failedLoginAttempts != 0)) {
            return false;
        }
        if (locked && (lockedUntil == null || failedLoginAttempts == 0)) {
            return false;
        }
        return "WITHDRAWN".equals(status) == (recoveryDeadline != null);
    }
}
