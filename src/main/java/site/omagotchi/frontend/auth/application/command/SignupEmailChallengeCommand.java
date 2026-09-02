package site.omagotchi.frontend.auth.application.command;

public record SignupEmailChallengeCommand(
        String email,
        String password,
        String name
) {

    @Override
    public String toString() {
        return "SignupEmailChallengeCommand[sensitive fields redacted]";
    }
}
