package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

// Frontend 인증 처리에 필요한 Identity API
public interface IdentityAuthClient {

    void signUp(String email, String password, String name);

    BrowserSessionTokenBundle login(String email, String password);

    void logout(String refreshToken);
}
