package site.omagotchi.frontend.auth.application.command;

import java.util.UUID;

// OTP 기반 비밀번호 재설정 Application 입력
public record PasswordResetCommand(
        String email,
        String newPassword,
        UUID challengeId,
        String code
) {

    @Override
    public String toString() {
        return "PasswordResetCommand[sensitive fields redacted]";
    }
}
