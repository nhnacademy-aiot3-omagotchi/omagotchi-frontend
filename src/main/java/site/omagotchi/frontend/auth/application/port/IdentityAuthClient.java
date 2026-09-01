package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.application.result.SignupResult;

// Frontend 인증 처리에 필요한 Identity API
public interface IdentityAuthClient {

    SignupResult signUp(String email, String password, String name);

    BrowserSessionTokenBundle login(String email, String password);

    BrowserSessionTokenBundle refresh(String refreshToken);

    void logout(String refreshToken);
}
