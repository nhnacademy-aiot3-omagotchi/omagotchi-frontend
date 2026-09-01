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
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestVerifiedSignupClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String SIGNUP_PATH = "/api/v2/auth/signup";
    private static final String EMAIL_OTP_PATH = SIGNUP_PATH + "/email-otp";

    private IdentityRestVerifiedSignupClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        IdentitySignupV2HttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(IdentitySignupV2HttpService.class);
        client = new IdentityRestVerifiedSignupClient(
                httpService,
                new RestClientCallExecutor(),
                new IdentityAuthErrorResolver(
                        new ApiErrorContractResolver(new ApiErrorResponseDecoder())
                )
        );
    }

    @Test
    @DisplayName("v2 회원가입 이메일 OTP 요청과 응답 계약")
    void requestsSignupEmailOtp() {
        server.expect(once(), requestTo(BASE_URL + EMAIL_OTP_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "challengeId": "challenge-id",
                                  "expiresInSeconds": 600
                                }
                                """));

        EmailVerificationChallenge result = client.requestEmailVerification(
                signupEmailChallengeCommand()
        );

        assertThat(result)
                .isEqualTo(new EmailVerificationChallenge("challenge-id", 600));
        server.verify();
    }

    @Test
    @DisplayName("v2 최종 회원가입 요청 JSON 계약")
    void signsUpWithVerificationCode() {
        server.expect(once(), requestTo(BASE_URL + SIGNUP_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치",
                          "challengeId": "challenge-id",
                          "code": "123456"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.CREATED));

        SignupResult result = client.signUp(verifiedSignupCommand());

        assertThat(result).isEqualTo(new SignupResult.Created());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "42"})
    @DisplayName("v2 회원가입 OTP 재요청 제한의 Retry-After 보존")
    void mapsSignupEmailOtpCooldown(String retryAfter) {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.TOO_MANY_REQUESTS,
                "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                HttpHeaders.RETRY_AFTER,
                retryAfter
        );

        assertThatThrownBy(() -> client.requestEmailVerification(
                signupEmailChallengeCommand()
        )).isInstanceOfSatisfying(
                EmailVerificationCooldownException.class,
                exception -> assertThat(exception.retryAfter().value())
                        .isEqualTo(Long.parseLong(retryAfter))
        );
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "later"})
    @DisplayName("OTP cooldown의 잘못된 Retry-After는 계약 오류로 변환")
    void rejectsInvalidRetryAfter(String retryAfter) {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.TOO_MANY_REQUESTS,
                "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                HttpHeaders.RETRY_AFTER,
                retryAfter
        );

        assertBusinessError(
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @Test
    @DisplayName("OTP cooldown 응답에 Retry-After가 없으면 계약 오류")
    void rejectsCooldownWithoutRetryAfter() {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.TOO_MANY_REQUESTS,
                "EMAIL_VERIFICATION_COOLDOWN_ACTIVE"
        );

        assertBusinessError(
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("invalidChallengeResponses")
    @DisplayName("OTP 성공 응답의 상태·Challenge·만료 시간 계약 검증")
    void rejectsInvalidChallengeResponse(HttpStatus status, String body) {
        server.expect(once(), requestTo(BASE_URL + EMAIL_OTP_PATH))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body));

        assertBusinessError(
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedVerifiedSignupResults")
    @DisplayName("v2 회원가입 공개 거절의 Application 결과 변환")
    void mapsExpectedVerifiedSignupResults(
            String ignoredDescription,
            HttpStatus status,
            String code,
            ErrorCode expectedErrorCode
    ) {
        expectError(SIGNUP_PATH, status, code);

        SignupResult result = client.signUp(verifiedSignupCommand());

        assertThat(result).isEqualTo(new SignupResult.Rejected(expectedErrorCode));
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
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        server.verify();
    }

    @Test
    @DisplayName("Identity 오류 Code와 HTTP 상태가 다르면 502 계약 오류")
    void rejectsMismatchedErrorCodeAndStatus() {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.BAD_REQUEST,
                "ACCOUNT_DUPLICATE_EMAIL"
        );

        assertBusinessError(
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
        );
        server.verify();
    }

    @Test
    @DisplayName("메일 전달 5xx는 공통 서비스 일시 장애로 은닉")
    void mapsSignupEmailDeliveryFailure() {
        expectError(
                EMAIL_OTP_PATH,
                HttpStatus.SERVICE_UNAVAILABLE,
                "EMAIL_DELIVERY_FAILED"
        );

        assertBusinessError(
                () -> client.requestEmailVerification(signupEmailChallengeCommand()),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        server.verify();
    }

    private void expectError(
            String path,
            HttpStatus status,
            String code
    ) {
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
                        assertThat(exception.getErrorCode())
                                .isEqualTo(expectedErrorCode));
    }

    private static SignupEmailChallengeCommand signupEmailChallengeCommand() {
        return new SignupEmailChallengeCommand(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        );
    }

    private static VerifiedSignupCommand verifiedSignupCommand() {
        return new VerifiedSignupCommand(
                "user@example.com",
                "password-passphrase",
                "오마고치",
                "challenge-id",
                "123456"
        );
    }

    private static Stream<Arguments> expectedVerifiedSignupResults() {
        return Stream.of(
                Arguments.of(
                        "OTP 오류",
                        HttpStatus.BAD_REQUEST,
                        "EMAIL_VERIFICATION_INVALID_CHALLENGE",
                        AuthErrorCode.EMAIL_VERIFICATION_INVALID
                ),
                Arguments.of(
                        "중복 이메일",
                        HttpStatus.CONFLICT,
                        "ACCOUNT_DUPLICATE_EMAIL",
                        AccountErrorCode.DUPLICATE_EMAIL
                )
        );
    }

    private static Stream<Arguments> invalidChallengeResponses() {
        return Stream.of(
                Arguments.of(HttpStatus.OK, """
                        {"challengeId":"challenge-id","expiresInSeconds":600}
                        """),
                Arguments.of(HttpStatus.ACCEPTED, ""),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {"expiresInSeconds":600}
                        """),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {"challengeId":" ","expiresInSeconds":600}
                        """),
                Arguments.of(HttpStatus.ACCEPTED, """
                        {"challengeId":"challenge-id","expiresInSeconds":0}
                        """)
        );
    }
}
