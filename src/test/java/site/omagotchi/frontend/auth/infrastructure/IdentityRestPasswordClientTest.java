package site.omagotchi.frontend.auth.infrastructure;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestPasswordClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String PASSWORD_PATH = "/api/v2/users/me/password";
    private static final String CHALLENGE_PATH =
            PASSWORD_PATH + "/email-otp";

    private IdentityRestPasswordClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        IdentityAccountHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(IdentityAccountHttpService.class);
        client = new IdentityRestPasswordClient(
                httpService,
                new RestClientCallExecutor(),
                new IdentityAuthErrorResolver(new ApiErrorResponseDecoder())
        );
    }

    @Test
    @DisplayName("비밀번호 변경 이메일 인증 Challenge의 Bearer 요청 계약")
    void requestsPasswordChangeEmailVerification() {
        server.expect(once(), requestTo(BASE_URL + CHALLENGE_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "challengeId": "password-challenge-id",
                                  "expiresInSeconds": 600
                                }
                                """));

        EmailVerificationChallenge result = client.requestEmailVerification(
                "Bearer access-token"
        );

        assertThat(result).isEqualTo(new EmailVerificationChallenge(
                "password-challenge-id",
                600
        ));
        server.verify();
    }

    @Test
    @DisplayName("OTP를 포함한 비밀번호 변경 Bearer 요청 계약")
    void changesPasswordWithVerificationCode() {
        server.expect(once(), requestTo(BASE_URL + PASSWORD_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "currentPassword": "current-password-passphrase",
                          "newPassword": "new-password-passphrase",
                          "challengeId": "password-challenge-id",
                          "code": "123456"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        client.changePassword(
                "Bearer access-token",
                new PasswordChangeCommand(
                        "current-password-passphrase",
                        "new-password-passphrase",
                        "password-challenge-id",
                        "123456"
                )
        );

        server.verify();
    }

    @Test
    @DisplayName("Bearer 인증 실패는 Browser 401 오류로 유지")
    void mapsBearerAuthenticationFailure() {
        expectError(
                CHALLENGE_PATH,
                HttpStatus.UNAUTHORIZED,
                "AUTH_AUTHENTICATION_REQUIRED"
        );

        assertError(
                () -> client.requestEmailVerification("Bearer expired-token"),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
        server.verify();
    }

    @Test
    @DisplayName("비밀번호 변경 OTP 오류를 공개 오류로 변환")
    void mapsInvalidVerificationCode() {
        server.expect(once(), requestTo(BASE_URL + PASSWORD_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "EMAIL_VERIFICATION_INVALID",
                                  "message": "인증 코드가 올바르지 않습니다.",
                                  "path": "/api/v2/users/me/password"
                                }
                                """));

        assertError(
                () -> client.changePassword(
                        "Bearer access-token",
                        new PasswordChangeCommand(
                                "current-password-passphrase",
                                "new-password-passphrase",
                                "password-challenge-id",
                                "000000"
                        )
                ),
                AuthErrorCode.EMAIL_VERIFICATION_INVALID
        );
        server.verify();
    }

    @Test
    @DisplayName("비밀번호 변경 인증번호 재요청 제한의 Retry-After 보존")
    void mapsPasswordChallengeCooldown() {
        server.expect(once(), requestTo(BASE_URL + CHALLENGE_PATH))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .header(HttpHeaders.RETRY_AFTER, "51")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                                  "message": "잠시 후 다시 요청해 주세요.",
                                  "path": "/api/v2/users/me/password/email-otp"
                                }
                                """));

        assertThatThrownBy(() -> client.requestEmailVerification("Bearer access-token"))
                .isInstanceOfSatisfying(
                        EmailVerificationCooldownException.class,
                        exception -> assertThat(exception.retryAfterSeconds()).isEqualTo(51)
                );
        server.verify();
    }

    private void expectError(String path, HttpStatus status, String code) {
        server.expect(once(), requestTo(BASE_URL + path))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "%s",
                                  "message": "Identity 오류",
                                  "path": "%s"
                                }
                                """.formatted(code, path)));
    }

    private static void assertError(
            ThrowingCallable action,
            ErrorCode expectedErrorCode
    ) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(expectedErrorCode)
                );
    }
}
