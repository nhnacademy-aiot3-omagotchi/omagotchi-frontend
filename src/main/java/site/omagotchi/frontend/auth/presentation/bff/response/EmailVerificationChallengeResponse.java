package site.omagotchi.frontend.auth.presentation.bff.response;

import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

public record EmailVerificationChallengeResponse(
        String challengeId,
        long expiresInSeconds
) {

    public static EmailVerificationChallengeResponse from(
            EmailVerificationChallenge challenge
    ) {
        return new EmailVerificationChallengeResponse(
                challenge.challengeId(),
                challenge.expiresInSeconds()
        );
    }
}
