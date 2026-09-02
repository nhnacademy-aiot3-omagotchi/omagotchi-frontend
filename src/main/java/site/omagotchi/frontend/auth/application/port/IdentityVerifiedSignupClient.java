package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;

// 이메일 OTP를 사용하는 Identity v2 회원가입 Port
public interface IdentityVerifiedSignupClient {

    EmailVerificationChallenge requestEmailVerification(
            SignupEmailChallengeCommand command
    );

    SignupResult signUp(VerifiedSignupCommand command);
}
