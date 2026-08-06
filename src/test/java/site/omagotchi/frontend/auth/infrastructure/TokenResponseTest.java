package site.omagotchi.frontend.auth.infrastructure;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import site.omagotchi.frontend.auth.infrastructure.response.TokenResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class TokenResponseTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidRequiredValues")
    @DisplayName("필수 Token 응답값 누락·공백의 502 변환")
    void rejectsInvalidRequiredValue(
            String ignoredDescription,
            TokenResponse response
    ) {
        // Given: 필수값 하나가 누락되거나 공백인 Identity Token 응답
        // When: 브라우저 세션 Token 변환
        ThrowingCallable action = response::toTokenBundle;

        // Then: 호출 대상 응답 계약 위반 변환
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE)
                );
    }

    @Test
    @DisplayName("지원하지 않는 전역 Role의 502 변환")
    void rejectsUnsupportedGlobalRole() {
        // Given: Frontend가 지원하지 않는 Identity 전역 Role
        TokenResponse response = new TokenResponse(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "UNKNOWN_ROLE",
                "access-token-value",
                Instant.parse("2026-08-03T12:00:00Z"),
                "refresh-token-value",
                Instant.parse("2026-08-10T12:00:00Z")
        );

        // When: 브라우저 세션 Token 변환
        ThrowingCallable action = response::toTokenBundle;

        // Then: 호출 대상 응답 계약 위반 변환과 원인 보존
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertSoftly(softly -> {
                        softly.assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                        softly.assertThat(exception.getCause())
                                .isInstanceOf(IllegalArgumentException.class);
                    });
                });
    }

    @Test
    @DisplayName("Token 응답 문자열의 Access·Refresh Token 마스킹")
    void redactsTokensFromStringRepresentation() {
        // Given: Access·Refresh Token을 포함한 Identity 응답
        TokenResponse response = new TokenResponse(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "USER",
                "access-token-value",
                Instant.parse("2026-08-03T12:00:00Z"),
                "refresh-token-value",
                Instant.parse("2026-08-10T12:00:00Z")
        );

        // When: 응답 문자열 변환
        String rendered = response.toString();

        // Then: Token 원문 비노출
        assertThat(rendered)
                .contains("accessToken=[REDACTED]")
                .contains("refreshToken=[REDACTED]")
                .doesNotContain("access-token-value")
                .doesNotContain("refresh-token-value");
    }

    private static Stream<Arguments> invalidRequiredValues() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Instant accessTokenExpiresAt = Instant.parse("2026-08-03T12:00:00Z");
        Instant refreshTokenExpiresAt = Instant.parse("2026-08-10T12:00:00Z");

        return Stream.of(
                Arguments.of(
                        "userId 누락",
                        new TokenResponse(
                                null,
                                "USER",
                                "access-token-value",
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "globalRole 누락",
                        new TokenResponse(
                                userId,
                                null,
                                "access-token-value",
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "globalRole 공백",
                        new TokenResponse(
                                userId,
                                " ",
                                "access-token-value",
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "accessToken 누락",
                        new TokenResponse(
                                userId,
                                "USER",
                                null,
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "accessToken 공백",
                        new TokenResponse(
                                userId,
                                "USER",
                                " ",
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "accessTokenExpiresAt 누락",
                        new TokenResponse(
                                userId,
                                "USER",
                                "access-token-value",
                                null,
                                "refresh-token-value",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "refreshToken 누락",
                        new TokenResponse(
                                userId,
                                "USER",
                                "access-token-value",
                                accessTokenExpiresAt,
                                null,
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "refreshToken 공백",
                        new TokenResponse(
                                userId,
                                "USER",
                                "access-token-value",
                                accessTokenExpiresAt,
                                " ",
                                refreshTokenExpiresAt
                        )
                ),
                Arguments.of(
                        "refreshTokenExpiresAt 누락",
                        new TokenResponse(
                                userId,
                                "USER",
                                "access-token-value",
                                accessTokenExpiresAt,
                                "refresh-token-value",
                                null
                        )
                )
        );
    }

}
