package site.omagotchi.frontend.account.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.port.IdentityAdminAccountClient;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccount;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAdminAccountResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.HttpResponseContractValidator;
import site.omagotchi.frontend.global.http.PageResponseContractValidator;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.List;

@Component
@RequiredArgsConstructor
public class IdentityRestAdminAccountClient implements IdentityAdminAccountClient {

    private final IdentityAdminAccountHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final ApiErrorContractResolver errorResolver;

    @Override
    public IdentityAdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            String role,
            Integer page,
            Integer size,
            String sort
    ) {
        ResponseEntity<PageResponse<IdentityAdminAccountResponse>> response = callExecutor.execute(
                () -> httpService.getUsers(
                        "Bearer " + accessToken,
                        query,
                        status,
                        role,
                        page,
                        size,
                        sort
                ),
                exception -> {
                    throw new BusinessException(errorResolver.resolve(
                            exception,
                            SecurityErrorCode.AUTHENTICATION_REQUIRED,
                            SecurityErrorCode.ACCESS_DENIED,
                            CommonErrorCode.INVALID_REQUEST,
                            AdminAccountErrorCode.ADMIN_ACCESS_NOT_ALLOWED
                    ), exception);
                }
        );
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "Identity 관리자 계정 조회"
        );
        PageResponse<IdentityAdminAccountResponse> body =
                PageResponseContractValidator.requireValid(
                        response.getBody(),
                        "Identity 관리자 계정 조회"
                );

        List<IdentityAdminAccount> items = body.items().stream()
                .map(IdentityRestAdminAccountClient::toAccount)
                .toList();
        PageInfo pageInfo = body.page();
        return new IdentityAdminAccountPage(
                items,
                new PageMetadata(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }

    private static IdentityAdminAccount toAccount(IdentityAdminAccountResponse account) {
        if (account == null
                || account.accountId() == null
                || account.email() == null
                || account.email().isBlank()
                || account.name() == null
                || account.name().isBlank()
                || account.role() == null
                || account.role().isBlank()
                || account.status() == null
                || account.status().isBlank()
                || account.failedLoginAttempts() < 0
                || account.createdAt() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity 관리자 계정 항목 응답 누락"
            );
        }
        return new IdentityAdminAccount(
                account.accountId(),
                account.email(),
                account.name(),
                account.role(),
                account.status(),
                account.failedLoginAttempts(),
                account.lockedUntil(),
                account.withdrawnAt(),
                account.createdAt()
        );
    }
}
