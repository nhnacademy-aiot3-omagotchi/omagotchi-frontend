package site.omagotchi.frontend.auth.application.result;

public record EmailVerificationChallenge(
        String challengeId,
        long expiresInSeconds
) {
}
