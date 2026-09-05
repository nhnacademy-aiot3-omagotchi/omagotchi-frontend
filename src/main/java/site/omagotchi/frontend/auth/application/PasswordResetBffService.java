package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.port.IdentityPasswordResetClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

// 익명 Browser 비밀번호 재설정 요청과 Identity 계약 연결
@Service
@RequiredArgsConstructor
public class PasswordResetBffService {

    private final IdentityPasswordResetClient identityPasswordResetClient;

    // 비밀번호 재설정용 이메일 OTP 요청
    public EmailVerificationChallenge requestEmailVerification(
            PasswordResetEmailChallengeCommand command
    ) {
        return identityPasswordResetClient.requestEmailVerification(command);
    }

    // 검증된 OTP와 새 비밀번호를 이용한 Identity 계정 비밀번호 재설정
    public void resetPassword(PasswordResetCommand command) {
        identityPasswordResetClient.resetPassword(command);
    }
}
