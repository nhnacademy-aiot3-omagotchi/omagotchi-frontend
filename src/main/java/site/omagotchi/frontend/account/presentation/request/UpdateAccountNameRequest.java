package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotNull;

public record UpdateAccountNameRequest(
        @NotNull(message = "이름은 필수입니다.")
        String name
) {
}
