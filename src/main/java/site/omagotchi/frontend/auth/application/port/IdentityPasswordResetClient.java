package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

// 비밀번호 재설정용 Identity Outbound 경계
public interface IdentityPasswordResetClient {

    // Identity 비밀번호 재설정 OTP 발급 요청
    EmailVerificationChallenge requestEmailVerification(
            PasswordResetEmailChallengeCommand command
    );

    // Identity OTP 검증 및 비밀번호 교체 요청
    void resetPassword(PasswordResetCommand command);
}
