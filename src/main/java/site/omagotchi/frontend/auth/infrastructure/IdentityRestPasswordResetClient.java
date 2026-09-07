package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.port.IdentityPasswordResetClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetEmailChallengeRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityPasswordResetEmailChallengeResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

// Identity 비밀번호 재설정 응답의 Frontend Application 계약 변환
@Component
@RequiredArgsConstructor
public class IdentityRestPasswordResetClient implements IdentityPasswordResetClient {

    private final IdentityPasswordResetHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthErrorResolver errorResolver;

    // OTP 발급 성공 응답 및 공개 가능한 Identity 오류 변환
    @Override
    public EmailVerificationChallenge requestEmailVerification(
            PasswordResetEmailChallengeCommand command
    ) {
        ResponseEntity<IdentityPasswordResetEmailChallengeResponse> response =
                callExecutor.execute(
                        () -> httpService.requestEmailOtp(
                                IdentityPasswordResetEmailChallengeRequest.from(command)
                        ),
                        exception -> {
                            throw errorResolver.resolveFailure(
                                    exception,
                                    CommonErrorCode.INVALID_REQUEST,
                                    AccountErrorCode.INVALID_EMAIL,
                                    AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE
                            );
                        }
                );
        requireStatus(response, HttpStatus.ACCEPTED, "Password reset email OTP");

        IdentityPasswordResetEmailChallengeResponse body = response.getBody();
        if (body == null || body.challengeId() == null || body.expiresInSeconds() <= 0) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Password reset email OTP 성공 응답 Body 오류"
            );
        }
        return body.toResult();
    }

    // 비밀번호 재설정 성공 상태 및 공개 가능한 Identity 오류 변환
    @Override
    public void resetPassword(PasswordResetCommand command) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.resetPassword(IdentityPasswordResetRequest.from(command)),
                exception -> {
                    throw errorResolver.resolveFailure(
                            exception,
                            CommonErrorCode.INVALID_REQUEST,
                            AccountErrorCode.INVALID_EMAIL,
                            AccountErrorCode.INVALID_PASSWORD,
                            AuthErrorCode.PASSWORD_RESET_INVALID
                    );
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Password reset");
    }

    // Identity 성공 응답의 HTTP 상태 계약 검증
    private static void requireStatus(
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
}
