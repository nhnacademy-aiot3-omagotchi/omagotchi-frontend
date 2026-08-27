package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotNull;

public record ChangeAccountPasswordRequest(
        @NotNull(message = "현재 비밀번호는 필수입니다.")
        String currentPassword,

        @NotNull(message = "새 비밀번호는 필수입니다.")
        String newPassword
) {

    @Override
    public String toString() {
        return "ChangeAccountPasswordRequest[sensitive fields redacted]";
    }
}
