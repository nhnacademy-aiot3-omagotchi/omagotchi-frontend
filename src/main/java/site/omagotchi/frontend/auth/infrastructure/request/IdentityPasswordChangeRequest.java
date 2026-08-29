package site.omagotchi.frontend.auth.infrastructure.request;

import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;

public record IdentityPasswordChangeRequest(
        String currentPassword,
        String newPassword,
        String challengeId,
        String code
) {

    public static IdentityPasswordChangeRequest from(PasswordChangeCommand command) {
        return new IdentityPasswordChangeRequest(
                command.currentPassword(),
                command.newPassword(),
                command.challengeId(),
                command.code()
        );
    }

    @Override
    public String toString() {
        return "IdentityPasswordChangeRequest[sensitive fields=[REDACTED]]";
    }
}
