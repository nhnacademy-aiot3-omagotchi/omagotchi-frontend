package site.omagotchi.frontend.auth.infrastructure;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

final class IdentityResponseContract {

    private IdentityResponseContract() {
    }

    static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expectedStatus,
            String operation
    ) {
        if (response.getStatusCode().value() != expectedStatus.value()) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity " + operation + " 성공 응답 Status 불일치 expected="
                            + expectedStatus.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }

    static EmailVerificationChallenge requireChallenge(
            ResponseEntity<IdentityEmailVerificationChallengeResponse> response,
            String operation
    ) {
        IdentityEmailVerificationChallengeResponse body = response.getBody();
        if (body == null
                || body.challengeId() == null
                || body.challengeId().isBlank()
                || body.expiresInSeconds() <= 0) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity " + operation + " 성공 응답 Body 오류"
            );
        }
        return body.toResult();
    }
}
