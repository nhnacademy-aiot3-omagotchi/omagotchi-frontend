package site.omagotchi.frontend.auth.application;

import site.omagotchi.frontend.global.exception.BusinessException;

// Identity가 확정한 OTP 재요청 대기 시간을 Browser 응답까지 전달
public class EmailVerificationCooldownException extends BusinessException {

    private final long retryAfterSeconds;

    public EmailVerificationCooldownException(
            long retryAfterSeconds,
            Throwable cause
    ) {
        super(AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE, cause);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
