package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.application.result.SignupResult;

// Frontend 인증 Use Case의 Application 진입점
// 외부 진입점의 Identity HTTP 구현 직접 의존 방지
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final IdentityAuthClient identityAuthClient;

    public SignupResult signUp(String email, String password, String name) {
        return identityAuthClient.signUp(email, password, name);
    }

    public BrowserSessionTokenBundle login(String email, String password) {
        return identityAuthClient.login(email, password);
    }

    public void logout(BrowserSessionTokenBundle tokenBundle) {
        identityAuthClient.logout(tokenBundle.refreshToken());
    }
}
