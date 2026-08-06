package site.omagotchi.frontend.auth.infrastructure;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestAuthClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String SIGNUP_PATH = "/api/v1/auth/signup";
    private static final String LOGIN_PATH = "/api/v1/auth/login";
    private static final String LOGOUT_PATH = "/api/v1/auth/logout";

    private IdentityRestAuthClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        IdentityAuthHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(IdentityAuthHttpService.class);
        client = new IdentityRestAuthClient(
                httpService,
                new RestClientCallExecutor(),
                new IdentityAuthFailureTranslator(new ApiErrorResponseDecoder())
        );
    }

    @Test
    @DisplayName("회원가입 요청 JSON 계약")
    void signsUpWithExpectedRequest() {
        // Given: Identity 회원가입 성공 응답
        server.expect(once(), requestTo(BASE_URL + SIGNUP_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.CREATED));

        // When: 회원가입 요청
        client.signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        );

        // Then: HTTP 요청 계약 충족
        server.verify();
    }

    @Test
    @DisplayName("로그인 요청 JSON과 Token Bundle 변환")
    void logsInAndMapsTokenBundle() {
        // Given: Identity 로그인 성공 응답
        server.expect(once(), requestTo(BASE_URL + LOGIN_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "userId": "00000000-0000-0000-0000-000000000001",
                                  "globalRole": "USER",
                                  "accessToken": "access-token",
                                  "accessTokenExpiresAt": "2026-08-03T12:00:00Z",
                                  "refreshToken": "refresh-token",
                                  "refreshTokenExpiresAt": "2026-08-10T12:00:00Z"
                                }
                                """));

        // When: 로그인 요청
        BrowserSessionTokenBundle tokenBundle = client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 브라우저 세션 저장용 Token Bundle
        assertThat(tokenBundle).isEqualTo(new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-03T12:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-10T12:00:00Z")
        ));
        server.verify();
    }

    @Test
    @DisplayName("읽을 수 없는 로그인 성공 응답의 502 변환")
    void rejectsUnreadableLoginResponse() {
        // Given: JSON으로 읽을 수 없는 Identity 로그인 성공 응답
        server.expect(once(), requestTo(BASE_URL + LOGIN_PATH))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{invalid-json"));

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("누락된 로그인 성공 응답 본문의 502 변환")
    void rejectsMissingLoginResponseBody() {
        // Given: 본문 없는 Identity 로그인 성공 응답
        server.expect(once(), requestTo(BASE_URL + LOGIN_PATH))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("로그아웃 요청 JSON 계약")
    void logsOutWithExpectedRequest() {
        // Given: Identity 로그아웃 성공 응답
        server.expect(once(), requestTo(BASE_URL + LOGOUT_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "refreshToken": "refresh-token"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When: 로그아웃 요청
        client.logout("refresh-token");

        // Then: HTTP 요청 계약 충족
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedSignupErrors")
    @DisplayName("회원가입 API가 공개하는 Identity 거절의 Frontend 오류 변환")
    void mapsExpectedSignupErrors(
            String ignoredDescription,
            HttpStatus status,
            String code,
            ErrorCode expectedErrorCode
    ) {
        // Given: 회원가입 API가 공개하는 4xx 응답
        expectError(SIGNUP_PATH, status, code);

        // When: 회원가입 요청
        ThrowingCallable action = () -> client.signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        );

        // Then: 동일한 공개 Error Code의 BusinessException 변환
        assertError(action, expectedErrorCode);
        server.verify();
    }

    @Test
    @DisplayName("잘못된 사용자 자격 증명의 로그인 실패 변환")
    void mapsInvalidCredentials() {
        // Given: 사용자 로그인 자격 증명 거절 응답
        expectError(
                LOGIN_PATH,
                HttpStatus.UNAUTHORIZED,
                "AUTH_INVALID_CREDENTIALS"
        );

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "wrong-password"
        );

        // Then: 사용자 인증 실패 변환
        assertError(action, AuthErrorCode.INVALID_CREDENTIALS);
        server.verify();
    }

    @Test
    @DisplayName("Frontend 프로세스 인증 거절의 503 변환")
    void reportsFrontendCredentialFailureAsServiceUnavailable() {
        // Given: Frontend 프로세스 인증 거절 응답
        expectError(
                LOGIN_PATH,
                HttpStatus.UNAUTHORIZED,
                "AUTH_AUTHENTICATION_REQUIRED"
        );

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 서비스 일시 장애 변환과 원인 보존
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertSoftly(softly -> {
                        softly.assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE);
                        softly.assertThat(exception.getCause())
                                .isInstanceOf(RestClientResponseException.class);
                    });
                });
        server.verify();
    }

    @Test
    @DisplayName("Frontend 프로세스 인증 오류 Code와 HTTP 상태 불일치의 502 변환")
    void rejectsFrontendCredentialErrorWithUnexpectedStatus() {
        // Given: 401이 아닌 Frontend 프로세스 인증 거절 응답
        expectError(
                LOGIN_PATH,
                HttpStatus.BAD_REQUEST,
                "AUTH_AUTHENTICATION_REQUIRED"
        );

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidSignupErrorContracts")
    @DisplayName("회원가입 오류 Code와 HTTP 상태의 계약 위반 거절")
    void rejectsInvalidSignupErrorContract(
            String ignoredDescription,
            HttpStatus httpStatus,
            String code
    ) {
        // Given: 오류 Code와 HTTP 상태의 불일치
        expectError(SIGNUP_PATH, httpStatus, code);

        // When: 회원가입 요청
        ThrowingCallable action = () -> client.signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        );

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("로그인 API가 공개하지 않는 오류 Code 거절")
    void rejectsUnexpectedLoginError() {
        // Given: 로그인 API가 공개하지 않는 오류 응답
        expectError(
                LOGIN_PATH,
                HttpStatus.CONFLICT,
                "ACCOUNT_DUPLICATE_EMAIL"
        );

        // When: 로그인 요청
        ThrowingCallable action = () -> client.login(
                "user@example.com",
                "password-passphrase"
        );

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    private static Stream<Arguments> expectedSignupErrors() {
        return Stream.of(
                Arguments.of(
                        "공통 입력 오류",
                        HttpStatus.BAD_REQUEST,
                        "COMMON_INVALID_REQUEST",
                        CommonErrorCode.INVALID_REQUEST
                ),
                Arguments.of(
                        "가입 입력 오류",
                        HttpStatus.BAD_REQUEST,
                        "ACCOUNT_INVALID_SIGNUP_INPUT",
                        AuthErrorCode.INVALID_SIGNUP_INPUT
                ),
                Arguments.of(
                        "이메일 중복",
                        HttpStatus.CONFLICT,
                        "ACCOUNT_DUPLICATE_EMAIL",
                        AuthErrorCode.DUPLICATE_EMAIL
                )
        );
    }

    private static Stream<Arguments> invalidSignupErrorContracts() {
        return Stream.of(
                Arguments.of(
                        "이메일 중복 오류의 400 상태",
                        HttpStatus.BAD_REQUEST,
                        "ACCOUNT_DUPLICATE_EMAIL"
                ),
                Arguments.of(
                        "공통 입력 오류의 415 상태",
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "COMMON_INVALID_REQUEST"
                )
        );
    }

    private void expectError(
            String path,
            HttpStatus httpStatus,
            String code
    ) {
        server.expect(once(), requestTo(BASE_URL + path))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(httpStatus)
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
