package site.omagotchi.frontend.auth.application.command;

// 비밀번호 재설정 OTP 발급용 Application 입력
public record PasswordResetEmailChallengeCommand(String email) {

    @Override
    public String toString() {
        return "PasswordResetEmailChallengeCommand[sensitive fields redacted]";
    }
}
