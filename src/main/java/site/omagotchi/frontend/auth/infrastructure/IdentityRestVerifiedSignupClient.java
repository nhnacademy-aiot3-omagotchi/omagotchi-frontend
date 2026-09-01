package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.port.IdentityVerifiedSignupClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupEmailChallengeRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityVerifiedSignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

// Identity v2 회원가입 응답을 Application 결과로 변환하는 Outbound Adapter
@Component
@RequiredArgsConstructor
public class IdentityRestVerifiedSignupClient implements IdentityVerifiedSignupClient {

    private final IdentitySignupV2HttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthErrorResolver errorResolver;

    @Override
    public EmailVerificationChallenge requestEmailVerification(
            SignupEmailChallengeCommand command
    ) {
        ResponseEntity<IdentityEmailVerificationChallengeResponse> response =
                callExecutor.execute(
                        () -> httpService.requestEmailOtp(
                                IdentitySignupEmailChallengeRequest.from(command)
                        ),
                        exception -> {
                            throw errorResolver.resolveFailure(
                                    exception,
                                    CommonErrorCode.INVALID_REQUEST,
                                    AccountErrorCode.INVALID_EMAIL,
                                    AccountErrorCode.INVALID_PASSWORD,
                                    AccountErrorCode.INVALID_NAME,
                                    AccountErrorCode.DUPLICATE_EMAIL,
                                    AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE
                            );
                        }
                );
        requireStatus(response, HttpStatus.ACCEPTED, "Signup email OTP");
        return requireChallenge(response, "Signup email OTP");
    }

    @Override
    public SignupResult signUp(VerifiedSignupCommand command) {
        return callExecutor.execute(
                () -> {
                    ResponseEntity<Void> response = httpService.signUp(
                            IdentityVerifiedSignupRequest.from(command)
                    );
                    requireStatus(response, HttpStatus.CREATED, "Verified signup");
                    return new SignupResult.Created();
                },
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            CommonErrorCode.INVALID_REQUEST,
                            AccountErrorCode.INVALID_EMAIL,
                            AccountErrorCode.INVALID_PASSWORD,
                            AccountErrorCode.INVALID_NAME,
                            AccountErrorCode.DUPLICATE_EMAIL,
                            AuthErrorCode.EMAIL_VERIFICATION_INVALID
                    );
                    return new SignupResult.Rejected(errorCode);
                }
        );
    }

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

    private static EmailVerificationChallenge requireChallenge(
            ResponseEntity<IdentityEmailVerificationChallengeResponse> response,
            String operation
    ) {
        IdentityEmailVerificationChallengeResponse body = response.getBody();
        if (body == null
                || !StringUtils.hasText(body.challengeId())
                || body.expiresInSeconds() <= 0) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity " + operation + " 성공 응답 Body 오류"
            );
        }
        return body.toResult();
    }
}
