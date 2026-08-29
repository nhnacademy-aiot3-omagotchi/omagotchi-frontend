package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

// 로그인 사용자의 Bearer JWT가 필요한 Identity 비밀번호 변경 Interface
public interface IdentityPasswordClient {

    EmailVerificationChallenge requestEmailVerification(String bearerToken);

    void changePassword(String bearerToken, PasswordChangeCommand command);
}
