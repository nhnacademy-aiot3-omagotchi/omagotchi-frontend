package site.omagotchi.frontend.account.infrastructure;

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
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.account.application.result.AccountSettings;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class IdentityRestAccountClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String ACCOUNT_PATH = "/api/v1/users/me";
    private static final String PASSWORD_PATH = ACCOUNT_PATH + "/password";
    private static final String ACCESS_TOKEN = "session-access-token";
    private static final String BEARER_TOKEN = "Bearer " + ACCESS_TOKEN;

    private IdentityRestAccountClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        IdentityAccountHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(IdentityAccountHttpService.class);
        client = new IdentityRestAccountClient(
                httpService,
                new RestClientCallExecutor(),
                new ApiErrorContractResolver(new ApiErrorResponseDecoder())
        );
    }

    @Test
    @DisplayName("인증 사용자 계정 조회의 Bearer 인증과 응답 축소")
    void getsOnlyAccountSettingsUsingUserBearerAuthentication() {
        // Given: 부가 필드를 포함한 Identity 계정 조회 성공 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "userId": "00000000-0000-0000-0000-000000000001",
                                  "email": "user@example.com",
                                  "name": "오마고치",
                                  "role": "USER",
                                  "status": "ACTIVE"
                                }
                                """));

        // When: 인증 사용자 계정 설정 조회
        AccountSettings accountSettings = client.getCurrentAccount(ACCESS_TOKEN);

        // Then: 사용자 Bearer 인증과 화면에 필요한 필드만 포함한 결과
        assertThat(accountSettings)
                .isEqualTo(new AccountSettings("user@example.com", "오마고치"));
        server.verify();
    }

    @Test
    @DisplayName("이름 변경 요청의 PATCH·Bearer·JSON 계약")
    void changesNameUsingPatchAndExpectedJson() {
        // Given: Identity 이름 변경 성공 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"name\":\"새 이름\"}"))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When: 인증 사용자 이름 변경
        client.changeName(ACCESS_TOKEN, "새 이름");

        // Then: Identity 이름 변경 HTTP 요청 계약
        server.verify();
    }

    @Test
    @DisplayName("비밀번호 변경 요청의 PATCH·Bearer·JSON 계약")
    void changesPasswordUsingPatchBearerAndExpectedJson() {
        // Given: Identity 비밀번호 변경 성공 응답
        server.expect(once(), requestTo(BASE_URL + PASSWORD_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "currentPassword": "current-password",
                          "newPassword": "new-password-value"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When: 인증 사용자 비밀번호 변경
        client.changePassword(
                ACCESS_TOKEN,
                "current-password",
                "new-password-value"
        );

        // Then: Identity 비밀번호 변경 HTTP 요청 계약
        server.verify();
    }

    @Test
    @DisplayName("계정 탈퇴 요청의 DELETE·Bearer·JSON 계약")
    void withdrawsUsingDeleteBearerAndExpectedJson() {
        // Given: Identity 계정 탈퇴 성공 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"currentPassword\":\"current-password\"}"))
                .andRespond(withSuccess(
                        "{\"recoveryDeadline\":\"2026-10-03T00:00:00Z\"}",
                        MediaType.APPLICATION_JSON
                ));

        // When: 인증 사용자 계정 탈퇴
        var result = client.withdraw(ACCESS_TOKEN, "current-password");

        // Then: Identity 계정 탈퇴 HTTP 요청 계약
        server.verify();
        assertThat(result)
                .isEqualTo(java.time.Instant.parse("2026-10-03T00:00:00Z"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedNameErrors")
    @DisplayName("이름 변경 API가 공개하는 Identity 오류 변환")
    void mapsExpectedIdentityNameError(
            String ignoredDescription,
            HttpStatus status,
            AccountErrorCode expectedErrorCode
    ) {
        // Given: 이름 변경 API가 공개하는 Identity 오류 응답
        expectError(
                HttpMethod.PATCH,
                ACCOUNT_PATH,
                status,
                expectedErrorCode.code()
        );

        // When: 인증 사용자 이름 변경
        ThrowingCallable action = () -> client.changeName(ACCESS_TOKEN, "새 이름");

        // Then: BFF가 공개하는 이름 변경 오류 변환
        assertError(action, expectedErrorCode);
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedPasswordErrors")
    @DisplayName("비밀번호 변경 API가 공개하는 Identity 오류 변환")
    void mapsExpectedIdentityPasswordError(
            String ignoredDescription,
            HttpStatus status,
            AccountErrorCode expectedErrorCode
    ) {
        // Given: 비밀번호 변경 API가 공개하는 Identity 오류 응답
        expectError(
                HttpMethod.PATCH,
                PASSWORD_PATH,
                status,
                expectedErrorCode.code()
        );

        // When: 인증 사용자 비밀번호 변경
        ThrowingCallable action = () -> client.changePassword(
                ACCESS_TOKEN,
                "current-password",
                "new-password-value"
        );

        // Then: BFF가 공개하는 비밀번호 변경 오류 변환
        assertError(action, expectedErrorCode);
        server.verify();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("expectedWithdrawalErrors")
    @DisplayName("계정 탈퇴 API가 공개하는 Identity 오류 변환")
    void mapsExpectedIdentityWithdrawalError(
            String ignoredDescription,
            HttpStatus status,
            ErrorCode expectedErrorCode
    ) {
        // Given: 계정 탈퇴 API가 공개하는 Identity 오류 응답
        expectError(
                HttpMethod.DELETE,
                ACCOUNT_PATH,
                status,
                expectedErrorCode.code()
        );

        // When: 인증 사용자 계정 탈퇴
        ThrowingCallable action = () -> client.withdraw(
                ACCESS_TOKEN,
                "current-password"
        );

        // Then: BFF가 공개하는 계정 탈퇴 오류 변환
        assertError(action, expectedErrorCode);
        server.verify();
    }

    @Test
    @DisplayName("계정 탈퇴의 계약 외 성공 상태 변환")
    void rejectsUnexpectedWithdrawalSuccessStatusAsBadGateway() {
        // Given: 계정 탈퇴 계약에 포함되지 않은 204 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When: 인증 사용자 계정 탈퇴
        ThrowingCallable action = () -> client.withdraw(
                ACCESS_TOKEN,
                "current-password"
        );

        // Then: 호출 대상 성공 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("계정 탈퇴의 성공 응답 본문 누락 변환")
    void rejectsMissingWithdrawalSuccessBodyAsBadGateway() {
        // Given: 복구 기한 본문이 없는 200 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 인증 사용자 계정 탈퇴
        ThrowingCallable action = () -> client.withdraw(
                ACCESS_TOKEN,
                "current-password"
        );

        // Then: 호출 대상 성공 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("계정 조회 API가 공개하는 계정 없음 오류 변환")
    void mapsMissingIdentityAccountError() {
        // Given: Identity 계정 없음 응답
        expectError(
                HttpMethod.GET,
                ACCOUNT_PATH,
                HttpStatus.NOT_FOUND,
                AccountErrorCode.NOT_FOUND.code()
        );

        // When: 인증 사용자 계정 설정 조회
        ThrowingCallable action = () -> client.getCurrentAccount(ACCESS_TOKEN);

        // Then: BFF가 공개하는 계정 없음 오류 변환
        assertError(action, AccountErrorCode.NOT_FOUND);
        server.verify();
    }

    @Test
    @DisplayName("만료된 Access Token의 인증 필요 오류 변환")
    void mapsExpiredIdentityAccessTokenToAuthenticationRequired() {
        // Given: Identity의 인증 필요 응답
        expectError(
                HttpMethod.GET,
                ACCOUNT_PATH,
                HttpStatus.UNAUTHORIZED,
                SecurityErrorCode.AUTHENTICATION_REQUIRED.code()
        );

        // When: 만료된 Access Token을 사용한 계정 설정 조회
        ThrowingCallable action = () -> client.getCurrentAccount(ACCESS_TOKEN);

        // Then: Frontend 인증 필요 오류 변환
        assertError(action, SecurityErrorCode.AUTHENTICATION_REQUIRED);
        server.verify();
    }

    @Test
    @DisplayName("Identity 오류 Code와 HTTP 상태 불일치의 502 변환")
    void rejectsErrorCodeAndStatusMismatchAsBadGateway() {
        // Given: 오류 Code와 HTTP 상태가 불일치하는 Identity 응답
        expectError(
                HttpMethod.PATCH,
                ACCOUNT_PATH,
                HttpStatus.CONFLICT,
                AccountErrorCode.INVALID_NAME.code()
        );

        // When: 인증 사용자 이름 변경
        ThrowingCallable action = () -> client.changeName(ACCESS_TOKEN, "새 이름");

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("공개하지 않은 Identity 오류 Code의 502 변환")
    void rejectsUnknownIdentityErrorAsBadGateway() {
        // Given: BFF가 공개하지 않는 Identity 내부 오류 응답
        expectError(
                HttpMethod.PATCH,
                ACCOUNT_PATH,
                HttpStatus.BAD_REQUEST,
                "ACCOUNT_INTERNAL_DETAIL"
        );

        // When: 인증 사용자 이름 변경
        ThrowingCallable action = () -> client.changeName(ACCESS_TOKEN, "새 이름");

        // Then: 호출 대상 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("이름 변경의 예상하지 않은 성공 상태 502 변환")
    void rejectsUnexpectedSuccessStatusAsBadGateway() {
        // Given: 204가 아닌 Identity 이름 변경 성공 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 인증 사용자 이름 변경
        ThrowingCallable action = () -> client.changeName(ACCESS_TOKEN, "새 이름");

        // Then: 호출 대상 성공 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("계정 조회 성공 응답의 필수 본문 누락 502 변환")
    void rejectsMissingCurrentAccountBodyAsBadGateway() {
        // Given: 본문 없는 Identity 계정 조회 성공 응답
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 인증 사용자 계정 설정 조회
        ThrowingCallable action = () -> client.getCurrentAccount(ACCESS_TOKEN);

        // Then: 호출 대상 성공 응답 계약 위반 변환
        assertError(action, CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        server.verify();
    }

    @Test
    @DisplayName("Identity 5xx의 503 변환")
    void mapsIdentityServerFailureToServiceUnavailable() {
        // Given: Identity 비밀번호 변경 API의 5xx 응답
        server.expect(once(), requestTo(BASE_URL + PASSWORD_PATH))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // When: 인증 사용자 비밀번호 변경
        ThrowingCallable action = () -> client.changePassword(
                ACCESS_TOKEN,
                "current-password",
                "new-password-value"
        );

        // Then: 서비스 일시 장애 변환
        assertError(action, CommonErrorCode.SERVICE_UNAVAILABLE);
        server.verify();
    }

    private static Stream<Arguments> expectedNameErrors() {
        return Stream.of(
                Arguments.of(
                        "이름 정책 오류",
                        HttpStatus.BAD_REQUEST,
                        AccountErrorCode.INVALID_NAME
                ),
                Arguments.of(
                        "계정 상태에 따른 이름 변경 제한",
                        HttpStatus.FORBIDDEN,
                        AccountErrorCode.NAME_CHANGE_NOT_ALLOWED
                ),
                Arguments.of(
                        "계정 없음",
                        HttpStatus.NOT_FOUND,
                        AccountErrorCode.NOT_FOUND
                )
        );
    }

    private static Stream<Arguments> expectedPasswordErrors() {
        return Stream.of(
                Arguments.of(
                        "비밀번호 정책 오류",
                        HttpStatus.BAD_REQUEST,
                        AccountErrorCode.INVALID_PASSWORD
                ),
                Arguments.of(
                        "현재 비밀번호 불일치",
                        HttpStatus.BAD_REQUEST,
                        AccountErrorCode.CURRENT_PASSWORD_MISMATCH
                ),
                Arguments.of(
                        "현재 비밀번호와 동일한 새 비밀번호",
                        HttpStatus.BAD_REQUEST,
                        AccountErrorCode.PASSWORD_UNCHANGED
                ),
                Arguments.of(
                        "계정 상태에 따른 비밀번호 변경 제한",
                        HttpStatus.FORBIDDEN,
                        AccountErrorCode.PASSWORD_CHANGE_NOT_ALLOWED
                ),
                Arguments.of(
                        "계정 없음",
                        HttpStatus.NOT_FOUND,
                        AccountErrorCode.NOT_FOUND
                )
        );
    }

    private static Stream<Arguments> expectedWithdrawalErrors() {
        return Stream.of(
                Arguments.of(
                        "인증 필요",
                        HttpStatus.UNAUTHORIZED,
                        SecurityErrorCode.AUTHENTICATION_REQUIRED
                ),
                Arguments.of(
                        "현재 비밀번호 불일치",
                        HttpStatus.BAD_REQUEST,
                        AccountErrorCode.CURRENT_PASSWORD_MISMATCH
                ),
                Arguments.of(
                        "계정 상태에 따른 탈퇴 제한",
                        HttpStatus.CONFLICT,
                        AccountErrorCode.WITHDRAWAL_NOT_ALLOWED
                ),
                Arguments.of(
                        "마지막 이용 가능 시스템 관리자 보호",
                        HttpStatus.CONFLICT,
                        AccountErrorCode.LAST_SYSTEM_ADMIN
                ),
                Arguments.of(
                        "계정 없음",
                        HttpStatus.NOT_FOUND,
                        AccountErrorCode.NOT_FOUND
                )
        );
    }

    private void expectError(
            HttpMethod httpMethod,
            String path,
            HttpStatus status,
            String code
    ) {
        server.expect(once(), requestTo(BASE_URL + path))
                .andExpect(method(httpMethod))
                .andExpect(header("Authorization", BEARER_TOKEN))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "%s",
                                  "message": "downstream message",
                                  "path": "%s",
                                  "requestId": "request-id"
                                }
                                """.formatted(code, path)));
    }

    private static void assertError(ThrowingCallable action, ErrorCode errorCode) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }
}
