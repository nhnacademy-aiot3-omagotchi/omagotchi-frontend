package site.omagotchi.frontend.auth.application.command;

public record PasswordChangeCommand(
        String currentPassword,
        String newPassword,
        String challengeId,
        String code
) {

    @Override
    public String toString() {
        return "PasswordChangeCommand[sensitive fields=[REDACTED]]";
    }
}
