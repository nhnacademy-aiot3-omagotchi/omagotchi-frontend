package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangeAccountRoleRequest;

import java.util.UUID;

/**
 * Identity Service의 관리자 전역 역할 변경 계약.
 *
 * <p>상태 변경과 base path는 같지만 경로와 본문 계약이 다르다. 한 인터페이스에 섞으면
 * 어느 쪽 계약이 깨졌는지 오류에서 구분되지 않으므로 나눠 둔다.</p>
 */
@HttpExchange("/api/v1/admin/accounts")
public interface IdentityAdminAccountRoleHttpService {

    @PatchExchange("/{user-id}/role")
    ResponseEntity<Void> changeRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("user-id") UUID userId,
            @RequestBody IdentityChangeAccountRoleRequest request
    );
}
