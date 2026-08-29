package site.omagotchi.frontend.auth.presentation.bff.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;

public record PasswordChangeRequest(
        @NotNull(message = "현재 비밀번호는 필수입니다.")
        String currentPassword,

        @NotNull(message = "새 비밀번호는 필수입니다.")
        String newPassword,

        @NotBlank(message = "Challenge ID는 필수입니다.")
        String challengeId,

        @NotBlank(message = "인증 코드는 필수입니다.")
        @Pattern(regexp = "\\d{6}", message = "인증 코드는 6자리 숫자여야 합니다.")
        String code
) {

    public PasswordChangeCommand toCommand() {
        return new PasswordChangeCommand(
                currentPassword,
                newPassword,
                challengeId,
                code
        );
    }

    @Override
    public String toString() {
        return "PasswordChangeRequest[sensitive fields=[REDACTED]]";
    }
}
