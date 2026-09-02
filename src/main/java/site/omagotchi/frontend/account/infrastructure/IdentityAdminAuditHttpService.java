package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAdminAuditResponse;
import site.omagotchi.frontend.global.http.response.PageResponse;

/** Identity Service의 권한 변경 감사 조회 계약. */
@HttpExchange("/api/v1/admin/audits")
public interface IdentityAdminAuditHttpService {

    @GetExchange
    ResponseEntity<PageResponse<IdentityAdminAuditResponse>> getAudits(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    );
}
