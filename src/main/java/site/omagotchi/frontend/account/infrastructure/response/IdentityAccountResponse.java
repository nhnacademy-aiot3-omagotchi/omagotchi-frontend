package site.omagotchi.frontend.account.infrastructure.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record IdentityAccountResponse(
        String email,
        String name
) {
}
