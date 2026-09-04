package site.omagotchi.frontend.auth.presentation.bff.request;

import jakarta.validation.constraints.NotBlank;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;

// Browser 비밀번호 재설정 OTP 발급 요청
public record PasswordResetEmailChallengeRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        String email
) {

    public PasswordResetEmailChallengeRequest {
        email = email == null ? null : email.trim();
    }

    // Browser 입력의 Application 명령 변환
    public PasswordResetEmailChallengeCommand toCommand() {
        return new PasswordResetEmailChallengeCommand(email);
    }

    @Override
    public String toString() {
        return "PasswordResetEmailChallengeRequest[sensitive fields redacted]";
    }
}
