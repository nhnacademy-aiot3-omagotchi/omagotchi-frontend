package site.omagotchi.frontend.auth.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.responseHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.replacePattern;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.restdocs.headers.HeaderDescriptor;
import org.springframework.restdocs.operation.preprocess.OperationPreprocessor;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.VerifiedSignupService;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.presentation.bff.SignupBffController;
import site.omagotchi.frontend.auth.presentation.page.SignupPageController;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

@WebMvcTest({SignupBffController.class, SignupPageController.class})
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
@Import({
    ServletApiErrorResponseWriter.class,
    BffApiExceptionResolver.class,
    BffApiSecurityErrorHandler.class,
    ApiExceptionHandler.class,
    SecurityConfig.class
})
class SignupBffMvcTest {

    private static final String CHALLENGE_ID = "[CHALLENGE_ID]";

    private static final Pattern CSRF_META_PATTERN = Pattern.compile(
            "<meta\\b(?=[^>]*\\bname=[\\\"']%s[\\\"'])"
                    + "(?=[^>]*\\bcontent=[\\\"']([^\\\"']+)[\\\"'])[^>]*>",
            Pattern.CASE_INSENSITIVE
    );

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HttpErrorEventLogger errorEventLogger;

    @MockitoBean
    private AuthenticationService authenticationService;

    @MockitoBean
    private AccessTokenRefreshInterceptor accessTokenRefreshInterceptor;

    @MockitoBean
    private VerifiedSignupService verifiedSignupService;

    @MockitoBean
    private BrowserSessionInvalidator sessionInvalidator;

    @MockitoBean
    private BrowserTokenSessionAuthenticationStrategy tokenSessionStrategy;

    @MockitoBean
    private IdentityLogoutHandler identityLogoutHandler;

    @MockitoBean
    private LoginAuthenticationFailureHandler loginFailureHandler;

    @Test
    @DisplayName("익명 Browser의 회원가입 이메일 인증 Challenge 발급")
    void requestsSignupEmailVerificationAnonymously() throws Exception {
        given(verifiedSignupService.requestEmailVerification(
                new SignupEmailChallengeCommand("user@example.com", "password-passphrase", "오마고치")
        )).willReturn(new EmailVerificationChallenge("challenge-id", 600));

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": " user@example.com ",
                          "password": "password-passphrase",
                          "name": "오마고치"
                        }
                        """))
                .andExpectAll(
                        status().isAccepted(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.challengeId").value("challenge-id"),
                        jsonPath("$.expiresInSeconds").value(600))
                .andDo(document(
                        "signup-reset/signup-email-otp",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(
                                fieldWithPath("email").description("인증 메일을 받을 이메일"),
                                fieldWithPath("password").description("회원가입 비밀번호"),
                                fieldWithPath("name").description("표시 이름")),
                        responseHeaders(headerWithName(HttpHeaders.CACHE_CONTROL).description("응답을 저장하지 않음")),
                        responseFields(
                                fieldWithPath("challengeId")
                                        .description("이메일 인증 Challenge 식별자"),
                                fieldWithPath("expiresInSeconds")
                                        .description("인증 요청 유효 시간(초)"))));
        verifyNoInteractions(accessTokenRefreshInterceptor);
    }

    @Test
    @DisplayName("익명 Browser의 OTP 소비 회원가입 완료")
    void completesSignupAnonymously() throws Exception {
        VerifiedSignupCommand command = new VerifiedSignupCommand(
                "user@example.com",
                "password-passphrase",
                "오마고치",
                "challenge-id",
                "123456"
        );
        given(verifiedSignupService.signUp(command))
                .willReturn(new SignupResult.Created());

        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치",
                          "challengeId": "challenge-id",
                          "code": "123456"
                        }
                        """))
                .andExpectAll(
                        status().isCreated(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.outcome").value("CREATED"))
                .andDo(document(
                        "signup-reset/signup-created",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(signupFields()),
                        responseHeaders(cacheControlHeader()),
                        responseFields(fieldWithPath("outcome").description("회원가입 처리 결과: CREATED"))));
        verify(verifiedSignupService).signUp(command);
        verifyNoInteractions(accessTokenRefreshInterceptor);
    }

    @Test
    @DisplayName("탈퇴 계정 복구 완료는 200과 RECOVERED 결과를 반환")
    void completesAccountRecoveryAnonymously() throws Exception {
        VerifiedSignupCommand command = new VerifiedSignupCommand(
                "user@example.com",
                "new-password-passphrase",
                "새 이름",
                "recovery-challenge-id",
                "654321"
        );
        given(verifiedSignupService.signUp(command))
                .willReturn(new SignupResult.Recovered());

        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "password": "new-password-passphrase",
                          "name": "새 이름",
                          "challengeId": "recovery-challenge-id",
                          "code": "654321"
                        }
                        """))
                .andExpectAll(
                        status().isOk(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.outcome").value("RECOVERED"))
                .andDo(document(
                        "signup-reset/signup-recovered",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(signupFields()),
                        responseHeaders(cacheControlHeader()),
                        responseFields(fieldWithPath("outcome").description("탈퇴 계정 복구 결과: RECOVERED"))));
        verify(verifiedSignupService).signUp(command);
        verifyNoInteractions(accessTokenRefreshInterceptor);
    }

    @Test
    @DisplayName("회원가입 Page가 발급한 CSRF Token으로 익명 v2 회원가입 요청")
    void acceptsSignupRequestsWithCsrfTokenFromSignupPage() throws Exception {
        given(verifiedSignupService.requestEmailVerification(any()))
                .willReturn(new EmailVerificationChallenge("challenge-id", 600));
        given(verifiedSignupService.signUp(any()))
                .willReturn(new SignupResult.Created());

        MvcResult pageResult = mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession anonymousSession = (MockHttpSession) pageResult.getRequest().getSession(false);
        String page = pageResult.getResponse().getContentAsString();
        String csrfToken = metaContent(page, "_csrf");
        String csrfHeader = metaContent(page, "_csrf_header");

        assertThat(anonymousSession).isNotNull();

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .session(anonymousSession)
                        .header(csrfHeader, csrfToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "user@example.com",
                                  "password": "password-passphrase",
                                  "name": "오마고치"
                                }
                                """))
                .andExpect(status().isAccepted());

        mockMvc.perform(post("/bff/v2/auth/signup")
                        .session(anonymousSession)
                        .header(csrfHeader, csrfToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "user@example.com",
                                  "password": "password-passphrase",
                                  "name": "오마고치",
                                  "challengeId": "challenge-id",
                                  "code": "123456"
                                }
                                """))
                .andExpect(status().isCreated());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/bff/v2/auth/signup/email-otp",
            "/bff/v2/auth/signup"
    })
    @DisplayName("다른 익명 Session은 회원가입 Page의 CSRF Token을 재사용할 수 없음")
    void rejectsSignupRequestWithCsrfTokenFromAnotherSession(String path) throws Exception {
        MvcResult pageResult = mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andReturn();
        String page = pageResult.getResponse().getContentAsString();

        mockMvc.perform(post(path)
                        .session(new MockHttpSession())
                        .header(metaContent(page, "_csrf_header"), metaContent(page, "_csrf"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isForbidden(),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );
        verifyNoInteractions(verifiedSignupService);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/bff/v2/auth/signup/email-otp",
            "/bff/v2/auth/signup"
    })
    @DisplayName("회원가입 v2 BFF 쓰기 요청은 CSRF Token을 요구")
    void rejectsSignupRequestWithoutCsrf(String path) throws Exception {
        mockMvc.perform(post(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isForbidden(),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );
        verifyNoInteractions(verifiedSignupService);
    }

    @Test
    @DisplayName("회원가입 외 v2 BFF는 기존 Session 인증 정책 적용")
    void protectsOtherV2BffPaths() throws Exception {
        mockMvc.perform(get("/bff/v2/private"))
                .andExpectAll(
                        status().isUnauthorized(),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED")
                );
    }

    @Test
    @DisplayName("OTP 형식이 아닌 회원가입 요청의 400 변환")
    void rejectsInvalidSignupCodeFormat() throws Exception {
        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치",
                          "challengeId": "challenge-id",
                          "code": "ABCDEF"
                        }
                        """))
                .andExpectAll(
                        status().isBadRequest(), jsonPath("$.code").value("COMMON_INVALID_REQUEST"))
                .andDo(document(
                        "signup-reset/signup-invalid-code",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(signupFields()),
                        responseHeaders(cacheControlHeader()),
                        responseFields(errorFields())));
        verifyNoInteractions(verifiedSignupService);
    }

    @Test
    @DisplayName("OTP 거절을 Browser 오류 계약으로 변환")
    void mapsRejectedVerifiedSignup() throws Exception {
        given(verifiedSignupService.signUp(any()))
                .willReturn(new SignupResult.Rejected(AuthErrorCode.EMAIL_VERIFICATION_INVALID));

        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치",
                          "challengeId": "challenge-id",
                          "code": "123456"
                        }
                        """))
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code").value("EMAIL_VERIFICATION_INVALID_CHALLENGE"))
                .andDo(document(
                        "signup-reset/signup-domain-error",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(signupFields()),
                        responseHeaders(cacheControlHeader()),
                        responseFields(errorFields())));
    }

    @Test
    @DisplayName("Cooldown 남은 시간을 Browser Retry-After Header로 전달")
    void forwardsRetryAfterHeader() throws Exception {
        given(verifiedSignupService.requestEmailVerification(any()))
                .willThrow(new EmailVerificationCooldownException(
                        37,
                        new IllegalStateException("Identity cooldown")
                ));

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "password": "password-passphrase",
                          "name": "오마고치"
                        }
                        """))
                .andExpectAll(
                        status().isTooManyRequests(),
                        header().string(HttpHeaders.RETRY_AFTER, "37"),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("EMAIL_VERIFICATION_COOLDOWN_ACTIVE"))
                .andDo(document(
                        "signup-reset/signup-cooldown",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(
                                fieldWithPath("email").description("인증 메일을 받을 이메일"),
                                fieldWithPath("password").description("회원가입 비밀번호"),
                                fieldWithPath("name").description("표시 이름")),
                        responseHeaders(
                                headerWithName(HttpHeaders.CACHE_CONTROL)
                                        .description("응답을 저장하지 않음"),
                                headerWithName(HttpHeaders.RETRY_AFTER)
                                        .description("다음 OTP 발급까지 대기할 시간(초)")),
                        responseFields(errorFields())));
    }

    private static String metaContent(String page, String name) {
        Matcher matcher = Pattern.compile(
                CSRF_META_PATTERN.pattern().formatted(Pattern.quote(name)),
                CSRF_META_PATTERN.flags()
        ).matcher(page);
        assertThat(matcher.find())
                .as("%s meta content", name)
                .isTrue();
        return matcher.group(1);
    }

    private static OperationPreprocessor secretValues() {
        return replacePattern(
                Pattern.compile(
                        "(?:\\\"(?:password|newPassword|code|challengeId)\\\"\\s*:\\s*\\\")([^\\\"]+)"),
                "[REDACTED]");
    }

    private static OperationPreprocessor normalizeIds() {
        return replacePattern(
                Pattern.compile(
                        "(?:challenge-id|recovery-challenge-id|00000000-0000-0000-0000-000000900001)"),
                CHALLENGE_ID);
    }

    private static FieldDescriptor[] signupFields() {
        return new FieldDescriptor[] {
            fieldWithPath("email").description("인증된 이메일"),
            fieldWithPath("password").description("회원가입 비밀번호"),
            fieldWithPath("name").description("표시 이름"),
            fieldWithPath("challengeId").description("이메일 인증 Challenge 식별자"),
            fieldWithPath("code").description("이메일 인증번호 6자리")
        };
    }

    private static HeaderDescriptor[] cacheControlHeader() {
        return new HeaderDescriptor[] {
            headerWithName(HttpHeaders.CACHE_CONTROL).description("응답을 저장하지 않음")
        };
    }

    private static FieldDescriptor[] errorFields() {
        return new FieldDescriptor[] {
            fieldWithPath("code").description("클라이언트 분기용 오류 코드"),
            fieldWithPath("message").description("사용자에게 표시할 오류 설명"),
            fieldWithPath("path").description("오류가 발생한 요청 경로"),
            fieldWithPath("requestId").description("요청 추적 식별자")
        };
    }
}
