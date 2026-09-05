package site.omagotchi.frontend.auth.infrastructure.response;

import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

import java.util.UUID;

// Identity 비밀번호 재설정 OTP 발급 응답 형식
public record IdentityPasswordResetEmailChallengeResponse(
        UUID challengeId,
        long expiresInSeconds
) {

    // Identity 응답의 Frontend Application 결과 변환
    public EmailVerificationChallenge toResult() {
        return new EmailVerificationChallenge(challengeId.toString(), expiresInSeconds);
    }
}
