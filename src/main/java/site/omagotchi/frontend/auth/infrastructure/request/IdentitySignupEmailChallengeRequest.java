package site.omagotchi.frontend.auth.infrastructure.request;

import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;

public record IdentitySignupEmailChallengeRequest(
        String email,
        String password,
        String name
) {

    public static IdentitySignupEmailChallengeRequest from(
            SignupEmailChallengeCommand command
    ) {
        return new IdentitySignupEmailChallengeRequest(
                command.email(),
                command.password(),
                command.name()
        );
    }

    @Override
    public String toString() {
        return "IdentitySignupEmailChallengeRequest[sensitive fields redacted]";
    }
}
