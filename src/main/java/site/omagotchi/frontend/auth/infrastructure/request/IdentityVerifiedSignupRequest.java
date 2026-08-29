package site.omagotchi.frontend.auth.infrastructure.request;

import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;

public record IdentityVerifiedSignupRequest(
        String email,
        String password,
        String name,
        String challengeId,
        String code
) {

    public static IdentityVerifiedSignupRequest from(VerifiedSignupCommand command) {
        return new IdentityVerifiedSignupRequest(
                command.email(),
                command.password(),
                command.name(),
                command.challengeId(),
                command.code()
        );
    }

    @Override
    public String toString() {
        return "IdentityVerifiedSignupRequest[sensitive fields=[REDACTED]]";
    }
}
