package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.port.IdentityVerifiedSignupClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityVerifiedSignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import static site.omagotchi.frontend.auth.infrastructure.IdentityResponseContract.requireChallenge;
import static site.omagotchi.frontend.auth.infrastructure.IdentityResponseContract.requireStatus;

// Identity v2 이메일 OTP 회원가입 응답을 Application 결과로 변환하는 Adapter
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
                                new IdentitySignupRequest(
                                        command.email(),
                                        command.password(),
                                        command.name()
                                )
                        ),
                        exception -> {
                            throw errorResolver.resolveFailure(
                                    exception,
                                    CommonErrorCode.INVALID_REQUEST,
                                    AuthErrorCode.INVALID_EMAIL,
                                    AuthErrorCode.INVALID_PASSWORD,
                            AuthErrorCode.INVALID_NAME,
                            AuthErrorCode.DUPLICATE_EMAIL,
                            AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE
                        );
                        }
                );
        requireStatus(response, HttpStatus.OK, "Signup email OTP");
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
                exception -> new SignupResult.Rejected(errorResolver.resolve(
                        exception,
                        CommonErrorCode.INVALID_REQUEST,
                        AuthErrorCode.INVALID_EMAIL,
                        AuthErrorCode.INVALID_PASSWORD,
                        AuthErrorCode.INVALID_NAME,
                        AuthErrorCode.DUPLICATE_EMAIL,
                        AuthErrorCode.EMAIL_VERIFICATION_INVALID
                ))
        );
    }
}
