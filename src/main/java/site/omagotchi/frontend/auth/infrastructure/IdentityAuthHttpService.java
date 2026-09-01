package site.omagotchi.frontend.auth.infrastructure;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityLoginRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityRefreshTokenRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.TokenResponse;

// Identity 인증 API의 HTTP 요청·응답 계약
@HttpExchange("/api/v1/auth")
public interface IdentityAuthHttpService {

    @PostExchange("/signup")
    ResponseEntity<Void> signUp(@RequestBody IdentitySignupRequest request);

    @PostExchange("/login")
    ResponseEntity<TokenResponse> login(@RequestBody IdentityLoginRequest request);

    @PostExchange("/refresh")
    ResponseEntity<TokenResponse> refresh(@RequestBody IdentityRefreshTokenRequest request);

    @PostExchange("/logout")
    ResponseEntity<Void> logout(@RequestBody IdentityRefreshTokenRequest request);
}
