package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;
import site.omagotchi.frontend.auth.application.port.IdentityPasswordClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordChangeRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import static site.omagotchi.frontend.auth.infrastructure.IdentityResponseContract.requireChallenge;
import static site.omagotchi.frontend.auth.infrastructure.IdentityResponseContract.requireStatus;

// Browser Session Access JWT로 Identity 비밀번호 API를 호출하는 Adapter
@Component
@RequiredArgsConstructor
public class IdentityRestPasswordClient implements IdentityPasswordClient {

    private final IdentityAccountHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthErrorResolver errorResolver;

    @Override
    public EmailVerificationChallenge requestEmailVerification(String bearerToken) {
        ResponseEntity<IdentityEmailVerificationChallengeResponse> response =
                callExecutor.execute(
                        () -> httpService.requestEmailVerification(bearerToken),
                        exception -> {
                            throw errorResolver.resolveBearerFailure(
                                    exception,
                                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                                    AuthErrorCode.PASSWORD_CHANGE_NOT_ALLOWED,
                                    AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE
                            );
                        }
                );
        requireStatus(response, HttpStatus.ACCEPTED, "Password email verification");
        return requireChallenge(response, "Password email verification");
    }

    @Override
    public void changePassword(
            String bearerToken,
            PasswordChangeCommand command
    ) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.changePassword(
                        bearerToken,
                        IdentityPasswordChangeRequest.from(command)
                ),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolveBearer(
                            exception,
                            CommonErrorCode.INVALID_REQUEST,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            AuthErrorCode.INVALID_PASSWORD,
                            AuthErrorCode.CURRENT_PASSWORD_MISMATCH,
                            AuthErrorCode.PASSWORD_UNCHANGED,
                            AuthErrorCode.PASSWORD_CHANGE_NOT_ALLOWED,
                            AuthErrorCode.EMAIL_VERIFICATION_INVALID
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Password change");
    }
}
