package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotBlank;

public record WithdrawAccountRequest(
        @NotBlank(message = "현재 비밀번호는 필수입니다.")
        String currentPassword
) {

    @Override
    public String toString() {
        return "WithdrawAccountRequest[sensitive fields redacted]";
    }
}
