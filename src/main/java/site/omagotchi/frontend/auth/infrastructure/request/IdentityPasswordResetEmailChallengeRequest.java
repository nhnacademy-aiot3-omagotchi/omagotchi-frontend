package site.omagotchi.frontend.auth.infrastructure.request;

import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;

// Identity 비밀번호 재설정 OTP 발급 요청 형식
public record IdentityPasswordResetEmailChallengeRequest(String email) {

    // Application 입력의 Identity 요청 형식 변환
    public static IdentityPasswordResetEmailChallengeRequest from(
            PasswordResetEmailChallengeCommand command
    ) {
        return new IdentityPasswordResetEmailChallengeRequest(command.email());
    }

    @Override
    public String toString() {
        return "IdentityPasswordResetEmailChallengeRequest[sensitive fields redacted]";
    }
}
