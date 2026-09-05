package site.omagotchi.frontend.auth.infrastructure;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetEmailChallengeRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityPasswordResetEmailChallengeResponse;

// Identity 비밀번호 재설정 v2 HTTP 계약
@HttpExchange("/api/v2/auth/password-reset")
public interface IdentityPasswordResetHttpService {

    // Identity 비밀번호 재설정 이메일 OTP API 호출
    @PostExchange("/email-otp")
    ResponseEntity<IdentityPasswordResetEmailChallengeResponse> requestEmailOtp(
            @RequestBody IdentityPasswordResetEmailChallengeRequest request
    );

    // Identity 비밀번호 재설정 API 호출
    @PatchExchange
    ResponseEntity<Void> resetPassword(@RequestBody IdentityPasswordResetRequest request);
}
