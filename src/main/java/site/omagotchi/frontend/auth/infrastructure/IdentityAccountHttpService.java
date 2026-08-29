package site.omagotchi.frontend.auth.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordChangeRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;

// 로그인 사용자 Bearer 인증이 필요한 Identity 계정 HTTP Interface
@HttpExchange("/api/v2/users/me/password")
public interface IdentityAccountHttpService {

    @PostExchange("/email-otp")
    ResponseEntity<IdentityEmailVerificationChallengeResponse>
            requestEmailVerification(
                    @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken
            );

    @PatchExchange
    ResponseEntity<Void> changePassword(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken,
            @RequestBody IdentityPasswordChangeRequest request
    );
}
