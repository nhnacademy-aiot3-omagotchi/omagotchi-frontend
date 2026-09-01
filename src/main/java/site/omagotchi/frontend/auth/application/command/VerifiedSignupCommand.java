package site.omagotchi.frontend.auth.application.command;

public record VerifiedSignupCommand(
        String email,
        String password,
        String name,
        String challengeId,
        String code
) {

    @Override
    public String toString() {
        return "VerifiedSignupCommand[sensitive fields redacted]";
    }
}
