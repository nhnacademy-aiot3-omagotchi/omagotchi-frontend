package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAdminAccountResponse;
import site.omagotchi.frontend.global.http.response.PageResponse;

/** Identity Service의 시스템 관리자 계정 조회 계약. */
@HttpExchange("/api/v1/admin/users")
public interface IdentityAdminAccountHttpService {

    @GetExchange
    ResponseEntity<PageResponse<IdentityAdminAccountResponse>> getUsers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean locked,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    );
}
