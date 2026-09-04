package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginUnlockRequest(
        @NotBlank(message = "로그인 잠금 해제 사유는 필수입니다.")
        @Size(max = 500, message = "로그인 잠금 해제 사유는 500자 이하여야 합니다.")
        String reason
) {

    public LoginUnlockRequest {
        reason = reason == null ? null : reason.strip();
    }
}
