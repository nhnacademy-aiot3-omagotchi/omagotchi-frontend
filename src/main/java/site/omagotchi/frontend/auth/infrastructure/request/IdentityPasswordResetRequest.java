package site.omagotchi.frontend.auth.infrastructure.request;

import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;

import java.util.UUID;

// Identity 비밀번호 재설정 요청 형식
public record IdentityPasswordResetRequest(
        String email,
        String newPassword,
        UUID challengeId,
        String code
) {

    // Application 입력의 Identity 요청 형식 변환
    public static IdentityPasswordResetRequest from(PasswordResetCommand command) {
        return new IdentityPasswordResetRequest(
                command.email(),
                command.newPassword(),
                command.challengeId(),
                command.code()
        );
    }

    @Override
    public String toString() {
        return "IdentityPasswordResetRequest[sensitive fields redacted]";
    }
}
