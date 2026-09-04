package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangeAccountStatusRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityLoginUnlockRequest;

import java.util.UUID;

/**
 * Identity Service의 관리자 계정 상태 변경 계약.
 *
 * <p>조회는 {@code /api/v1/admin/users}, 상태 변경은 {@code /api/v1/admin/accounts}로
 * base path가 다르다. 그래서 {@link IdentityAdminAccountHttpService}에 얹지 않고
 * 별도 인터페이스로 둔다.</p>
 */
@HttpExchange("/api/v1/admin/accounts")
public interface IdentityAdminAccountStatusHttpService {

    @PatchExchange("/{user-id}/status")
    ResponseEntity<Void> changeStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("user-id") UUID userId,
            @RequestBody IdentityChangeAccountStatusRequest request
    );

    @PostExchange("/{user-id}/login-lock/unlock")
    ResponseEntity<Void> unlockLogin(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("user-id") UUID userId,
            @RequestBody IdentityLoginUnlockRequest request
    );
}
