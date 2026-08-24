package site.omagotchi.frontend.profile.infrastructure.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateNicknameRequest(
        @NotBlank
        @Size(min = 2, max = 12)
        @Pattern(regexp = "^[가-힣A-Za-z0-9]+$")
        String nickname
) {
}
