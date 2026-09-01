package site.omagotchi.frontend.auth.application;

import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.RetryAfterMetadata;
import site.omagotchi.frontend.global.exception.RetryAfterSeconds;

// Identity가 확정한 OTP 재요청 대기 시간을 Browser 응답까지 전달
public class EmailVerificationCooldownException
        extends BusinessException
        implements RetryAfterMetadata {

    private final RetryAfterSeconds retryAfter;

    public EmailVerificationCooldownException(
            long retryAfterSeconds,
            Throwable cause
    ) {
        super(AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE, cause);
        this.retryAfter = new RetryAfterSeconds(retryAfterSeconds);
    }

    @Override
    public RetryAfterSeconds retryAfter() {
        return retryAfter;
    }
}
