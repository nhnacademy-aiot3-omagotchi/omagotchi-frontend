package site.omagotchi.frontend.auth.presentation.bff.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;

public record SignupEmailChallengeRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        String email,

        @NotNull(message = "비밀번호는 필수입니다.")
        String password,

        @NotBlank(message = "이름은 필수입니다.")
        String name
) {

    public SignupEmailChallengeRequest {
        email = email == null ? null : email.trim();
    }

    public SignupEmailChallengeCommand toCommand() {
        return new SignupEmailChallengeCommand(email, password, name);
    }

    @Override
    public String toString() {
        return "SignupEmailChallengeRequest[sensitive fields redacted]";
    }
}
