package site.omagotchi.frontend.account.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.account.application.port.IdentityAccountClient;
import site.omagotchi.frontend.account.application.result.AccountSettings;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangePasswordRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityUpdateNameRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityWithdrawAccountRequest;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAccountResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

@Component
@RequiredArgsConstructor
public class IdentityRestAccountClient implements IdentityAccountClient {

    private final IdentityAccountHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final ApiErrorContractResolver errorResolver;

    @Override
    public AccountSettings getCurrentAccount(String accessToken) {
        ResponseEntity<IdentityAccountResponse> response = callExecutor.execute(
                () -> httpService.getCurrentAccount("Bearer " + accessToken),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            AccountErrorCode.NOT_FOUND
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.OK, "Current account query");

        IdentityAccountResponse body = response.getBody();
        if (body == null
                || !StringUtils.hasText(body.email())
                || !StringUtils.hasText(body.name())) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Current account 성공 응답 필수 필드 누락"
            );
        }
        return new AccountSettings(body.email(), body.name());
    }

    @Override
    public void changeName(String accessToken, String name) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.changeName(
                        "Bearer " + accessToken,
                        new IdentityUpdateNameRequest(name)
                ),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            AccountErrorCode.INVALID_NAME,
                            AccountErrorCode.NAME_CHANGE_NOT_ALLOWED,
                            AccountErrorCode.NOT_FOUND
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Name change");
    }

    @Override
    public void changePassword(
            String accessToken,
            String currentPassword,
            String newPassword
    ) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.changePassword(
                        "Bearer " + accessToken,
                        new IdentityChangePasswordRequest(currentPassword, newPassword)
                ),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            AccountErrorCode.INVALID_PASSWORD,
                            AccountErrorCode.CURRENT_PASSWORD_MISMATCH,
                            AccountErrorCode.PASSWORD_UNCHANGED,
                            AccountErrorCode.PASSWORD_CHANGE_NOT_ALLOWED,
                            AccountErrorCode.NOT_FOUND
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Password change");
    }

    @Override
    public void withdraw(String accessToken, String currentPassword) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.withdraw(
                        "Bearer " + accessToken,
                        new IdentityWithdrawAccountRequest(currentPassword)
                ),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            AccountErrorCode.CURRENT_PASSWORD_MISMATCH,
                            AccountErrorCode.WITHDRAWAL_NOT_ALLOWED,
                            AccountErrorCode.LAST_SYSTEM_ADMIN,
                            AccountErrorCode.NOT_FOUND
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Account withdrawal");
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
}
