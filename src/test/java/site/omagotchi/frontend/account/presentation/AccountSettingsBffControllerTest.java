package site.omagotchi.frontend.account.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.headers.HeaderDocumentation;
import org.springframework.restdocs.payload.PayloadDocumentation;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import site.omagotchi.frontend.account.application.AccountErrorCode;
import site.omagotchi.frontend.account.application.AccountSettingsBffService;
import site.omagotchi.frontend.account.application.port.IdentityAccountClient;
import site.omagotchi.frontend.account.application.result.AccountSettings;
import site.omagotchi.frontend.account.presentation.request.ChangeAccountPasswordRequest;
import site.omagotchi.frontend.account.presentation.request.WithdrawAccountRequest;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;

@WebMvcTest(AccountSettingsBffController.class)
@AutoConfigureMockMvc
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
@Import({
    AccountSettingsBffControllerTest.AccountSettingsTestConfiguration.class,
    AccountSessionAuthorization.class
})
class AccountSettingsBffControllerTest extends FrontendMvcTestSupport {

    @Autowired
    private RecordingIdentityAccountClient identityClient;

    @Autowired
    private AccountSettingsBffService service;

    @Autowired
    private AccountSessionAuthorization authorization;

    @Autowired
    private BrowserSessionInvalidator sessionInvalidator;

    private AccountSettingsBffController controller;

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        identityClient.reset();
        controller = new AccountSettingsBffController(service, authorization, sessionInvalidator);
    }

    @Test
    @DisplayName("계정 설정 조회의 최소 응답과 캐시 저장 금지")
    void returnsMinimalAccountSettingsWithoutStore() throws Exception {
        // Given: Identity 계정 설정 조회 결과와 인증 브라우저 세션
        identityClient.accountSettings = new AccountSettings("user@example.com", "오마고치");

        // When: 현재 사용자 계정 설정 BFF 조회
        mockMvc.perform(get("/bff/v1/users/me")
                        .session(authenticatedSession())
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]")))
                .andExpectAll(
                        status().isOk(),
                        header().string("Cache-Control", "no-store"),
                        jsonPath("$.email").value("user@example.com"),
                        jsonPath("$.name").value("오마고치"))
                .andDo(document(
                        "account-settings-get",
                        requestCookies(
                                CookieDocumentation.cookieWithName("SESSION")
                                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                        HeaderDocumentation.responseHeaders(
                                headerWithName(HttpHeaders.CACHE_CONTROL)
                                        .description("개인 계정 정보가 저장되지 않도록 항상 `no-store`를 반환합니다.")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("email").description("현재 계정 이메일"),
                                fieldWithPath("name").description("현재 계정 이름"))));

        // Then: 브라우저 세션의 Access Token 전달
        assertThat(identityClient.accessToken).isEqualTo("session-access-token");
    }

    @Test
    @DisplayName("이름 변경의 독립 PATCH 계약")
    void changesNameWithIndependentPatchContract() throws Exception {
        // Given: 인증 브라우저 세션과 이름 변경 JSON
        MockHttpSession session = authenticatedSession();

        // When: 현재 사용자 이름 변경 BFF 요청
        mockMvc.perform(patch("/bff/v1/users/me")
                        .with(csrf())
                        .session(session)
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .contentType("application/json")
                        .content("{\"name\":\"새 이름\"}"))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "account-settings-name-patch",
                        requestCookies(
                                CookieDocumentation.cookieWithName("SESSION")
                                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("name")
                                        .description("변경할 이름입니다. 필수이며 `null`은 허용하지 않습니다."))));

        // Then: Access Token과 이름만 전달된 Identity 계정 요청
        assertThat(identityClient.accessToken).isEqualTo("session-access-token");
        assertThat(identityClient.name).isEqualTo("새 이름");
        assertThat(identityClient.currentPassword).isNull();
    }

    @Test
    @DisplayName("비밀번호 변경 성공 후 현재 브라우저 세션 폐기")
    void changesPasswordThenInvalidatesTheLocalBrowserSession() throws Exception {
        // Given: 인증 브라우저 세션과 현재 인증 Principal
        MockHttpSession session = authenticatedSession();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("user", null);

        // When: 현재 사용자 비밀번호 변경 BFF 요청
        MvcResult result = mockMvc.perform(patch("/bff/v1/users/me/password")
                                .with(csrf())
                                .session(session)
                                .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                                .principal(authentication)
                                .contentType("application/json")
                                .content(
                                        """
                        {
                          "currentPassword": "current-password",
                          "newPassword": "new-password-value"
                        }
                        """))
                        .andExpectAll(
                                status().isNoContent(),
                                header().string("Cache-Control", "no-store"))
                        .andDo(document(
                                "account-settings-password-patch",
                                requestCookies(
                                        CookieDocumentation.cookieWithName("SESSION")
                                                .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                                PayloadDocumentation.requestFields(
                                        fieldWithPath("currentPassword")
                                                .description("현재 비밀번호입니다. 필수이며 문서에는 `[REDACTED]`로 표시합니다."),
                                        fieldWithPath("newPassword")
                                                .description("새 비밀번호입니다. 필수이며 문서에는 `[REDACTED]`로 표시합니다.")),
                                HeaderDocumentation.responseHeaders(
                                        headerWithName(HttpHeaders.CACHE_CONTROL)
                                                .description("비밀번호 변경 응답이 저장되지 않도록 `no-store`를 반환합니다."))))
                        .andReturn();

        // Then: Access Token과 비밀번호 변경 입력이 전달된 Identity 계정 요청
        assertThat(identityClient.accessToken).isEqualTo("session-access-token");
        assertThat(identityClient.currentPassword).isEqualTo("current-password");
        assertThat(identityClient.newPassword).isEqualTo("new-password-value");

        // Then: 현재 HTTP 세션 폐기와 요청의 세션 연결 제거
        assertThat(session.isInvalid()).isTrue();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    @DisplayName("비밀번호 변경 실패 후 현재 브라우저 세션 유지")
    void keepsTheLocalBrowserSessionWhenPasswordChangeFails() {
        // Given: 인증 브라우저 요청과 Identity 비밀번호 변경 실패
        MockHttpServletRequest request = authenticatedRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(false);
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("user", null);
        BusinessException failure = new BusinessException(
                AccountErrorCode.CURRENT_PASSWORD_MISMATCH
        );
        identityClient.changePasswordFailure = failure;

        // When: Identity에서 거절된 비밀번호 변경
        ThrowingCallable action = () -> controller.changePassword(
                request,
                response,
                authentication,
                new ChangeAccountPasswordRequest("wrong-current-password", "new-password-value")
        );

        // Then: 원본 오류 전파와 현재 HTTP 세션 유지
        assertThatThrownBy(action).isSameAs(failure);
        assertThat(session.isInvalid()).isFalse();
    }

    @Test
    @DisplayName("비밀번호 불일치 시 공통 오류 응답")
    void documentsPasswordMismatchThroughMvcExceptionAdvice() throws Exception {
        // Given: 비밀번호 변경 실패 응답 준비
        identityClient.changePasswordFailure = new BusinessException(AccountErrorCode.CURRENT_PASSWORD_MISMATCH);

        // When & Then
        mockMvc.perform(patch("/bff/v1/users/me/password")
                        .with(csrf())
                        .session(authenticatedSession())
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .principal(new TestingAuthenticationToken("user", null))
                        .contentType("application/json")
                        .content(
                                "{\"currentPassword\":\"wrong-current-password\",\"newPassword\":\"new-password-value\"}"))
                .andExpectAll(
                        status().isBadRequest(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("ACCOUNT_CURRENT_PASSWORD_MISMATCH"),
                        jsonPath("$.message").value("현재 비밀번호가 올바르지 않습니다."),
                        jsonPath("$.path").value("/bff/v1/users/me/password"))
                .andDo(document(
                        "account-settings-password-mismatch",
                        PayloadDocumentation.requestFields(
                                fieldWithPath("currentPassword")
                                        .description("현재 비밀번호입니다. 문서에는 `[REDACTED]`로 표시합니다."),
                                fieldWithPath("newPassword")
                                        .description("새 비밀번호입니다. 문서에는 `[REDACTED]`로 표시합니다.")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("code").description("클라이언트 분기용 계정 오류 코드"),
                                fieldWithPath("message").description("사용자에게 표시할 오류 메시지"),
                                fieldWithPath("path").description("오류가 발생한 요청 경로"),
                                fieldWithPath("requestId")
                                        .description("요청 추적 ID입니다. 테스트에서 설정하지 않으면 `null`일 수 있습니다.")),
                        HeaderDocumentation.responseHeaders(
                                headerWithName(HttpHeaders.CACHE_CONTROL)
                                        .description("오류 응답이 저장되지 않도록 `no-store`를 반환합니다."))));
    }

    @Test
    @DisplayName("계정 탈퇴 성공 후 현재 브라우저 세션 폐기")
    void withdrawsThenInvalidatesTheLocalBrowserSession() throws Exception {
        // Given: 인증 브라우저 세션과 현재 인증 Principal
        MockHttpSession session = authenticatedSession();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("user", null);

        // When: 현재 사용자 계정 탈퇴 BFF 요청
        MvcResult result = mockMvc.perform(delete("/bff/v1/users/me")
                        .with(csrf())
                        .session(session)
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .principal(authentication)
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"current-password\"}"))
                        .andExpectAll(
                                status().isOk(),
                                jsonPath("$.recoveryDeadline").value("2026-10-03T00:00:00Z"),
                                header().string("Cache-Control", "no-store"))
                        .andDo(document(
                                "account-settings-delete",
                                requestCookies(
                                        CookieDocumentation.cookieWithName("SESSION")
                                                .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                                PayloadDocumentation.requestFields(
                                        fieldWithPath("currentPassword")
                                                .description("탈퇴 확인에 사용할 현재 비밀번호입니다. 필수이며 문서에는 `[REDACTED]`로 표시합니다.")),
                                HeaderDocumentation.responseHeaders(
                                        headerWithName(HttpHeaders.CACHE_CONTROL)
                                                .description("탈퇴 응답이 저장되지 않도록 `no-store`를 반환합니다.")),
                                PayloadDocumentation.responseFields(
                                        fieldWithPath("recoveryDeadline")
                                                .description("계정 복구 가능 기한(UTC ISO-8601 instant)"))))
                        .andReturn();

        // Then: Access Token과 현재 비밀번호가 전달된 Identity 탈퇴 요청
        assertThat(identityClient.accessToken).isEqualTo("session-access-token");
        assertThat(identityClient.withdrawalCurrentPassword)
                .isEqualTo("current-password");

        // Then: 현재 HTTP 세션 폐기와 요청의 세션 연결 제거
        assertThat(session.isInvalid()).isTrue();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    @DisplayName("계정 탈퇴 실패 후 현재 브라우저 세션 유지")
    void keepsTheLocalBrowserSessionWhenWithdrawalFails() {
        // Given: 인증 브라우저 요청과 Identity 계정 탈퇴 실패
        MockHttpServletRequest request = authenticatedRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(false);
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("user", null);
        BusinessException failure = new BusinessException(
                AccountErrorCode.CURRENT_PASSWORD_MISMATCH
        );
        identityClient.withdrawalFailure = failure;

        // When: Identity에서 거절된 계정 탈퇴
        ThrowingCallable action = () -> controller.withdraw(
                request,
                response,
                authentication,
                new WithdrawAccountRequest("wrong-current-password")
        );

        // Then: 원본 오류 전파와 현재 HTTP 세션 유지
        assertThatThrownBy(action).isSameAs(failure);
        assertThat(session.isInvalid()).isFalse();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidWithdrawalRequests")
    @DisplayName("계정 탈퇴 현재 비밀번호 누락·공백의 400 응답")
    void rejectsWithdrawalWithInvalidCurrentPassword(
            String ignoredDescription,
            String requestBody
    ) throws Exception {
        // Given: 인증 브라우저 세션과 유효하지 않은 현재 비밀번호
        MockHttpSession session = authenticatedSession();

        // When: 현재 사용자 계정 탈퇴 BFF 요청
        mockMvc.perform(delete("/bff/v1/users/me")
                        .with(csrf())
                        .session(session)
                        .contentType("application/json")
                        .content(requestBody))
                .andExpect(status().isBadRequest());

        // Then: Identity 탈퇴 요청 미수행과 현재 브라우저 세션 유지
        assertThat(identityClient.withdrawalCurrentPassword).isNull();
        assertThat(session.isInvalid()).isFalse();
    }

    private static Stream<Arguments> invalidWithdrawalRequests() {
        return Stream.of(
                Arguments.of("현재 비밀번호 누락", "{}"),
                Arguments.of("현재 비밀번호 빈 문자열", "{\"currentPassword\":\"\"}"),
                Arguments.of("현재 비밀번호 공백", "{\"currentPassword\":\"   \"}")
        );
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("missingRequiredFields")
    @DisplayName("계정 변경 필수 필드 누락의 400 응답")
    void rejectsMissingRequiredField(
            String ignoredDescription,
            String path,
            String requestBody
    ) throws Exception {
        // Given: 인증 브라우저 세션과 필수 필드가 누락된 계정 변경 JSON
        MockHttpSession session = authenticatedSession();

        // When: 현재 사용자 계정 변경 BFF 요청
        mockMvc.perform(patch(path)
                        .with(csrf())
                        .session(session)
                        .contentType("application/json")
                        .content(requestBody))
                .andExpect(status().isBadRequest());

        // Then: Identity 계정 요청 미수행과 현재 브라우저 세션 유지
        assertThat(identityClient.accessToken).isNull();
        assertThat(identityClient.name).isNull();
        assertThat(identityClient.currentPassword).isNull();
        assertThat(identityClient.newPassword).isNull();
        assertThat(session.isInvalid()).isFalse();
    }

    private static Stream<Arguments> missingRequiredFields() {
        return Stream.of(
                Arguments.of(
                        "이름 누락",
                        "/bff/v1/users/me",
                        "{}"
                ),
                Arguments.of(
                        "현재 비밀번호 누락",
                        "/bff/v1/users/me/password",
                        "{\"newPassword\":\"new-password-value\"}"
                ),
                Arguments.of(
                        "새 비밀번호 누락",
                        "/bff/v1/users/me/password",
                        "{\"currentPassword\":\"current-password\"}"
                )
        );
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class AccountSettingsTestConfiguration {
        @Bean
        RecordingIdentityAccountClient identityAccountClient() {
            return new RecordingIdentityAccountClient();
        }

        @Bean
        AccountSettingsBffService accountSettingsBffService(IdentityAccountClient identityAccountClient) {
            return new AccountSettingsBffService(identityAccountClient);
        }
    }

    @Override
    protected MockHttpSession authenticatedSession() {
        return (MockHttpSession) authenticatedRequest().getSession(false);
    }

    private MockHttpServletRequest authenticatedRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        authenticate(
                request.getSession(true),
                new BrowserSessionTokenBundle(
                        UUID.fromString("00000000-0000-0000-0000-000000000001"),
                        GlobalRole.USER,
                        "session-access-token",
                        Instant.parse("2099-08-20T10:00:00Z"),
                        "session-refresh-token",
                        Instant.parse("2099-08-27T10:00:00Z")));
        return request;
    }

    private static final class RecordingIdentityAccountClient
            implements IdentityAccountClient {

        private AccountSettings accountSettings;
        private String accessToken;
        private String name;
        private String currentPassword;
        private String newPassword;
        private String withdrawalCurrentPassword;
        private RuntimeException changePasswordFailure;
        private RuntimeException withdrawalFailure;

        void reset() {
            accountSettings = null;
            accessToken = null;
            name = null;
            currentPassword = null;
            newPassword = null;
            withdrawalCurrentPassword = null;
            changePasswordFailure = null;
            withdrawalFailure = null;
        }

        @Override
        public AccountSettings getCurrentAccount(String accessToken) {
            this.accessToken = accessToken;
            return accountSettings;
        }

        @Override
        public void changeName(String accessToken, String name) {
            this.accessToken = accessToken;
            this.name = name;
        }

        @Override
        public void changePassword(
                String accessToken,
                String currentPassword,
                String newPassword
        ) {
            if (changePasswordFailure != null) {
                throw changePasswordFailure;
            }
            this.accessToken = accessToken;
            this.currentPassword = currentPassword;
            this.newPassword = newPassword;
        }

        @Override
        public Instant withdraw(String accessToken, String currentPassword) {
            if (withdrawalFailure != null) {
                throw withdrawalFailure;
            }
            this.accessToken = accessToken;
            this.withdrawalCurrentPassword = currentPassword;
            return Instant.parse("2026-10-03T00:00:00Z");
        }
    }
}
