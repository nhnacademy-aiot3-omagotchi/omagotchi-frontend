package site.omagotchi.frontend.auth.infrastructure.response;

import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

public record IdentityEmailVerificationChallengeResponse(
        String challengeId,
        long expiresInSeconds
) {

    public EmailVerificationChallenge toResult() {
        return new EmailVerificationChallenge(challengeId, expiresInSeconds);
    }
}
