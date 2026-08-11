package site.omagotchi.frontend.auth.infrastructure.response;

import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Instant;
import java.util.UUID;

// Identity Login 2xx 응답 본문
public record TokenResponse(
        UUID userId,
        String globalRole,
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt
) {

    public BrowserSessionTokenBundle toTokenBundle() {
        // 필수값 누락: Identity 성공 응답 계약 위반의 502 변환
        if (userId == null
                || globalRole == null || globalRole.isBlank()
                || accessToken == null || accessToken.isBlank()
                || accessTokenExpiresAt == null
                || refreshToken == null || refreshToken.isBlank()
                || refreshTokenExpiresAt == null
        ) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        }

        // Global Role 해석 실패: Identity 성공 응답 계약 위반의 502 변환
        try {
            return new BrowserSessionTokenBundle(
                    userId,
                    GlobalRole.valueOf(globalRole),
                    accessToken,
                    accessTokenExpiresAt,
                    refreshToken,
                    refreshTokenExpiresAt
            );
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }
    }

    // 응답 로그의 Access·Refresh Token 마스킹
    @Override
    public String toString() {
        return "TokenResponse[userId=" + userId
                + ", globalRole=" + globalRole
                + ", accessToken=[REDACTED]"
                + ", accessTokenExpiresAt=" + accessTokenExpiresAt
                + ", refreshToken=[REDACTED]"
                + ", refreshTokenExpiresAt=" + refreshTokenExpiresAt + "]";
    }
}
