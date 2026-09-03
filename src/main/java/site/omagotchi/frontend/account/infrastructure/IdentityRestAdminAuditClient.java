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
     * 감사 한 줄이 성립하려면 "언제 · 누가 · 누구에게 · 무엇을" 네 가지가 있어야 한다.
     * 그 넷이 빠지면 화면에 그릴 수 없는 행이므로 응답 계약 위반으로 끊는다.
     *
     * 반대로 beforeValue, afterValue, reason 은 비어 있는 것이 정상인 경우가 있다.
     * 최초 권한 부여에는 이전 값이 없고, 사유를 남기지 않는 작업도 있다.
     * 이 셋까지 필수로 두었더니 그런 행 하나에 감사 패널 전체가 오류로 막혔다.
     * 값이 없다는 사실은 화면이 표기하고, 여기서는 null 로 통과시킨다.
     *
     * auditType 도 마찬가지다. 화면이 쓰지 않는 분류 값이라 없다고 행을 버릴 이유가 없다.
     */
    private static IdentityAdminAudit toAudit(IdentityAdminAuditResponse audit) {
        if (audit == null
                || audit.action() == null || audit.action().isBlank()
                || audit.actorUserId() == null
                || audit.targetUserId() == null
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
                blankToNull(audit.beforeValue()),
                blankToNull(audit.afterValue()),
                blankToNull(audit.reason()),
                audit.occurredAt()
        );
    }

    /** 빈 문자열과 null 을 한 가지로 모은다. 화면이 두 경우를 따로 다루지 않게 한다. */
    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
