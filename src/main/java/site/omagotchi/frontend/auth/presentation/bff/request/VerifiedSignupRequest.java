package site.omagotchi.frontend.auth.presentation.bff.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;

public record VerifiedSignupRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        String email,

        @NotNull(message = "비밀번호는 필수입니다.")
        String password,

        @NotBlank(message = "이름은 필수입니다.")
        String name,

        @NotBlank(message = "Challenge ID는 필수입니다.")
        String challengeId,

        @NotBlank(message = "인증 코드는 필수입니다.")
        @Pattern(regexp = "\\d{6}", message = "인증 코드는 6자리 숫자여야 합니다.")
        String code
) {

    public VerifiedSignupRequest {
        email = email == null ? null : email.trim();
    }

    public VerifiedSignupCommand toCommand() {
        return new VerifiedSignupCommand(email, password, name, challengeId, code);
    }

    @Override
    public String toString() {
        return "VerifiedSignupRequest[sensitive fields redacted]";
    }
}
