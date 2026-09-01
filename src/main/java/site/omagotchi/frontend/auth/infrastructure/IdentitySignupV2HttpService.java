package site.omagotchi.frontend.auth.infrastructure;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupEmailChallengeRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityVerifiedSignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.IdentityEmailVerificationChallengeResponse;

// 이메일 OTP를 사용하는 Identity v2 회원가입 HTTP 계약
@HttpExchange("/api/v2/auth/signup")
public interface IdentitySignupV2HttpService {

    @PostExchange("/email-otp")
    ResponseEntity<IdentityEmailVerificationChallengeResponse> requestEmailOtp(
            @RequestBody IdentitySignupEmailChallengeRequest request
    );

    @PostExchange
    ResponseEntity<Void> signUp(@RequestBody IdentityVerifiedSignupRequest request);
}
