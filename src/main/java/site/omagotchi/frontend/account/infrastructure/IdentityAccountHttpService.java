package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangePasswordRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityUpdateNameRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityWithdrawAccountRequest;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAccountResponse;

@HttpExchange("/api/v1/users/me")
public interface IdentityAccountHttpService {

    @GetExchange
    ResponseEntity<IdentityAccountResponse> getCurrentAccount(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken
    );

    @PatchExchange
    ResponseEntity<Void> changeName(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken,
            @RequestBody IdentityUpdateNameRequest request
    );

    @PatchExchange("/password")
    ResponseEntity<Void> changePassword(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken,
            @RequestBody IdentityChangePasswordRequest request
    );

    @DeleteExchange
    ResponseEntity<Void> withdraw(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken,
            @RequestBody IdentityWithdrawAccountRequest request
    );
}
