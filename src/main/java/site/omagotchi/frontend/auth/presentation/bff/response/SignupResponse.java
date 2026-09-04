package site.omagotchi.frontend.auth.presentation.bff.response;

public record SignupResponse(
        Outcome outcome
) {

    public enum Outcome {
        CREATED,
        RECOVERED
    }

    public static SignupResponse created() {
        return new SignupResponse(Outcome.CREATED);
    }

    public static SignupResponse recovered() {
        return new SignupResponse(Outcome.RECOVERED);
    }
}
