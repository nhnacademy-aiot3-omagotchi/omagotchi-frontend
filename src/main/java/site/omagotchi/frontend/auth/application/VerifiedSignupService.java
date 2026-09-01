package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.port.IdentityVerifiedSignupClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;

// 이메일 OTP 기반 v2 회원가입의 Application 진입점
@Service
@RequiredArgsConstructor
public class VerifiedSignupService {

    private final IdentityVerifiedSignupClient identityVerifiedSignupClient;

    public EmailVerificationChallenge requestEmailVerification(
            SignupEmailChallengeCommand command
    ) {
        return identityVerifiedSignupClient.requestEmailVerification(command);
    }

    public SignupResult signUp(VerifiedSignupCommand command) {
        return identityVerifiedSignupClient.signUp(command);
    }
}
