package site.omagotchi.frontend.account.infrastructure;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.port.IdentityAdminAccountClient;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccount;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangeAccountRoleRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangeAccountStatusRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityLoginUnlockRequest;
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
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class IdentityRestAdminAccountClient implements IdentityAdminAccountClient {

    private final IdentityAdminAccountHttpService httpService;
    private final IdentityAdminAccountStatusHttpService statusHttpService;
    private final IdentityAdminAccountRoleHttpService roleHttpService;
    private final RestClientCallExecutor callExecutor;
    private final ApiErrorContractResolver errorResolver;
    private final Validator validator;

    @Override
    public IdentityAdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            Boolean locked,
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
                        locked,
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
                .map(account -> {
                    if (account == null) {
                        throw new BusinessException(
                                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                                "Identity 관리자 계정 항목 응답 누락"
                        );
                    }
                    return account.toResult(validator);
                })
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

    @Override
    public void changeStatus(
            String accessToken,
            UUID userId,
            String status,
            String reason
    ) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> statusHttpService.changeStatus(
                        "Bearer " + accessToken,
                        userId,
                        new IdentityChangeAccountStatusRequest(status, reason)
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
        // Identity는 성공 시 204를 반환한다. 200이 오면 계약이 바뀐 것이므로 통과시키지 않는다.
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.NO_CONTENT,
                "Identity 관리자 계정 상태 변경"
        );
    }

    @Override
    public void changeRole(
            String accessToken,
            UUID userId,
            String role,
            String reason
    ) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> roleHttpService.changeRole(
                        "Bearer " + accessToken,
                        userId,
                        new IdentityChangeAccountRoleRequest(role, reason)
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
        // Identity는 성공 시 204를 반환한다. 200이 오면 계약이 바뀐 것이므로 통과시키지 않는다.
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.NO_CONTENT,
                "Identity 관리자 전역 역할 변경"
        );
    }

    @Override
    public void unlockLogin(String accessToken, UUID userId, String reason) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> statusHttpService.unlockLogin(
                        "Bearer " + accessToken,
                        userId,
                        new IdentityLoginUnlockRequest(reason)
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
                HttpStatus.NO_CONTENT,
                "Identity 관리자 로그인 잠금 해제"
        );
    }
}
