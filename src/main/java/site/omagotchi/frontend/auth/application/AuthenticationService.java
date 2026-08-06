package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

// Page·Security 진입점과 Identity Client 사이의 인증 Use Case 경계
// Presentation의 Infrastructure 직접 의존 방지와 실패 계약의 변경 없는 전달 역할
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final IdentityAuthClient identityAuthClient;

    public void signUp(String email, String password, String name) {
        identityAuthClient.signUp(email, password, name);
    }

    public BrowserSessionTokenBundle login(String email, String password) {
        return identityAuthClient.login(email, password);
    }

    public void logout(BrowserSessionTokenBundle tokenBundle) {
        identityAuthClient.logout(tokenBundle.refreshToken());
    }
}
