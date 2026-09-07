package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestPasswordResetClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String PASSWORD_RESET_PATH = "/api/v2/auth/password-reset";
    private static final String EMAIL_OTP_PATH = PASSWORD_RESET_PATH + "/email-otp";
    private static final UUID CHALLENGE_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000900001"
    );

    private IdentityRestPasswordResetClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        IdentityPasswordResetHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(IdentityPasswordResetHttpService.class);
        client = new IdentityRestPasswordResetClient(
                httpService,
                new RestClientCallExecutor(),
                new IdentityAuthErrorResolver(
                        new ApiErrorContractResolver(new ApiErrorResponseDecoder())
                )
        );
    }

    @Test
    @DisplayName("Identity 비밀번호 재설정 OTP 요청·응답 계약")
    void requestsPasswordResetEmailOtp() {
        server.expect(once(), requestTo(BASE_URL + EMAIL_OTP_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"email\":\"user@example.com\"}"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "challengeId": "00000000-0000-0000-0000-000000900001",
                                  "expiresInSeconds": 300
                                }
                                """));

        EmailVerificationChallenge result = client.requestEmailVerification(
                emailChallengeCommand()
        );

        assertThat(result).isEqualTo(
                new EmailVerificationChallenge(CHALLENGE_ID.toString(), 300)
        );
        server.verify();
    }

    @Test
    @DisplayName("Identity 비밀번호 재설정 PATCH 요청 계약")
    void resetsPassword() {
        server.expect(once(), requestTo(BASE_URL + PASSWORD_RESET_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "email": "user@example.com",
                          "newPassword": "new-password-passphrase",
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "code": "123456"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        client.resetPassword(resetCommand());

        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "42"})
    @DisplayName("비밀번호 재설정 OTP 공유 쿨다운의 Retry-After 보존")
    void mapsPasswordResetEmailOtpCooldown(String retryAfter) {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.TOO_MANY_REQUESTS,
                "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                HttpHeaders.RETRY_AFTER,
                retryAfter
        );

        assertThatThrownBy(() -> client.requestEmailVerification(emailChallengeCommand()))
                .isInstanceOfSatisfying(
                        EmailVerificationCooldownException.class,
                        exception -> assertThat(exception.retryAfter().value())
                                .isEqualTo(Long.parseLong(retryAfter))
                );
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedPasswordResetErrors")
    @DisplayName("Identity 비밀번호 재설정의 공개 가능한 비즈니스 오류 변환")
    void mapsExpectedPasswordResetErrors(
            String ignoredDescription,
            String path,
            String code,
            ErrorCode expectedErrorCode
    ) {
        expectError(path, HttpStatus.BAD_REQUEST, code);

        if (EMAIL_OTP_PATH.equals(path)) {
            assertBusinessError(
                    () -> client.requestEmailVerification(emailChallengeCommand()),
                    expectedErrorCode
            );
        } else {
            assertBusinessError(() -> client.resetPassword(resetCommand()), expectedErrorCode);
        }
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("invalidChallengeResponses")
    @DisplayName("OTP 성공 응답의 상태·UUID·만료 시간 계약 검증")
    void rejectsInvalidChallengeResponse(HttpStatus status, String body) {
        server.expect(once(), requestTo(BASE_URL + EMAIL_OTP_PATH))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body));

        assertBusinessError(
                () -> client.requestEmailVerification(emailChallengeCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @Test
    @DisplayName("Identity 비밀번호 재설정 성공 상태가 다르면 502 계약 오류")
    void rejectsUnexpectedResetSuccessStatus() {
        server.expect(once(), requestTo(BASE_URL + PASSWORD_RESET_PATH))
                .andRespond(withStatus(HttpStatus.OK));

        assertBusinessError(
                () -> client.resetPassword(resetCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @Test
    @DisplayName("Frontend Basic 인증 거절은 사용자 401이 아닌 503으로 변환")
    void mapsFrontendCredentialFailureToServiceUnavailable() {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.UNAUTHORIZED,
                "AUTH_AUTHENTICATION_REQUIRED"
        );

        assertBusinessError(
                () -> client.requestEmailVerification(emailChallengeCommand()),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        server.verify();
    }

    @Test
    @DisplayName("Identity 오류 Code와 HTTP 상태가 다르면 502 계약 오류")
    void rejectsMismatchedErrorCodeAndStatus() {
        expectError(
                PASSWORD_RESET_PATH,
                HttpStatus.CONFLICT,
                "AUTH_PASSWORD_RESET_INVALID"
        );

        assertBusinessError(
                () -> client.resetPassword(resetCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @Test
    @DisplayName("Identity 메일 전달 5xx는 공통 서비스 일시 장애로 은닉")
    void mapsPasswordResetEmailDeliveryFailure() {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.SERVICE_UNAVAILABLE,
                "EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE"
        );

        assertBusinessError(
                () -> client.requestEmailVerification(emailChallengeCommand()),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        server.verify();
    }

    private void expectError(String path, HttpStatus status, String code) {
        server.expect(once(), requestTo(BASE_URL + path))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(errorBody(code, path)));
    }

    private void expectError(
            String path,
            HttpStatus status,
            String code,
            String headerName,
            String headerValue
    ) {
        server.expect(once(), requestTo(BASE_URL + path))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(errorBody(code, path))
                        .header(headerName, headerValue));
    }

    private static String errorBody(String code, String path) {
        return """
                {
                  "code": "%s",
                  "message": "Identity 오류",
                  "path": "%s"
                }
                """.formatted(code, path);
    }

    private static void assertBusinessError(
            org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
            ErrorCode expectedErrorCode
    ) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(expectedErrorCode));
    }

    private static PasswordResetEmailChallengeCommand emailChallengeCommand() {
        return new PasswordResetEmailChallengeCommand("user@example.com");
    }

    private static PasswordResetCommand resetCommand() {
        return new PasswordResetCommand(
                "user@example.com",
                "new-password-passphrase",
                CHALLENGE_ID,
                "123456"
        );
    }

    private static Stream<Arguments> expectedPasswordResetErrors() {
        return Stream.of(
                Arguments.of(
                        "OTP 이메일 형식 오류",
                        EMAIL_OTP_PATH,
                        "ACCOUNT_INVALID_EMAIL",
                        AccountErrorCode.INVALID_EMAIL
                ),
                Arguments.of(
                        "새 비밀번호 정책 오류",
                        PASSWORD_RESET_PATH,
                        "ACCOUNT_INVALID_PASSWORD",
                        AccountErrorCode.INVALID_PASSWORD
                ),
                Arguments.of(
                        "재설정 정보 오류",
                        PASSWORD_RESET_PATH,
                        "AUTH_PASSWORD_RESET_INVALID",
                        AuthErrorCode.PASSWORD_RESET_INVALID
                )
        );
    }

    private static Stream<Arguments> invalidChallengeResponses() {
        return Stream.of(
                Arguments.of(HttpStatus.OK, """
                        {
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "expiresInSeconds": 300
                        }
                        """),
                Arguments.of(HttpStatus.ACCEPTED, ""),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {"expiresInSeconds":300}
                        """),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {"challengeId":"not-a-uuid","expiresInSeconds":300}
                        """),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "expiresInSeconds": 0
                        }
                        """)
        );
    }
}
