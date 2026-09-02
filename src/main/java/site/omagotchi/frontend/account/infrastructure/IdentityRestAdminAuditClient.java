package site.omagotchi.frontend.account.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.port.IdentityAdminAuditClient;
import site.omagotchi.frontend.account.application.result.IdentityAdminAudit;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAdminAuditResponse;
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
public class IdentityRestAdminAuditClient implements IdentityAdminAuditClient {

    private final IdentityAdminAuditHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final ApiErrorContractResolver errorResolver;

    @Override
    public IdentityAdminAuditPage findAudits(String accessToken, Integer page, Integer size) {
        ResponseEntity<PageResponse<IdentityAdminAuditResponse>> response = callExecutor.execute(
                () -> httpService.getAudits("Bearer " + accessToken, page, size),
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
                "Identity 관리자 감사 로그 조회"
        );
        PageResponse<IdentityAdminAuditResponse> body =
                PageResponseContractValidator.requireValid(
                        response.getBody(),
                        "Identity 관리자 감사 로그 조회"
                );

        List<IdentityAdminAudit> items = body.items().stream()
                .map(IdentityRestAdminAuditClient::toAudit)
                .toList();
        PageInfo pageInfo = body.page();
        return new IdentityAdminAuditPage(
                items,
                new PageMetadata(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }

    /*
     * 이름은 없어도 되지만 나머지는 없으면 안 된다. 사유나 시각이 빠진 감사 한 줄은
     * 화면에 "누가 무엇을 했는지 모르겠다"를 그리게 되므로 응답 계약 위반으로 끊는다.
     */
    private static IdentityAdminAudit toAudit(IdentityAdminAuditResponse audit) {
        if (audit == null
                || audit.auditType() == null || audit.auditType().isBlank()
                || audit.action() == null || audit.action().isBlank()
                || audit.actorUserId() == null
                || audit.targetUserId() == null
                || audit.beforeValue() == null || audit.beforeValue().isBlank()
                || audit.afterValue() == null || audit.afterValue().isBlank()
                || audit.reason() == null || audit.reason().isBlank()
                || audit.occurredAt() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity 관리자 감사 로그 항목 응답 누락"
            );
        }
        return new IdentityAdminAudit(
                audit.auditType(),
                audit.action(),
                audit.actorUserId(),
                audit.actorName(),
                audit.targetUserId(),
                audit.targetName(),
                audit.beforeValue(),
                audit.afterValue(),
                audit.reason(),
                audit.occurredAt()
        );
    }
}
