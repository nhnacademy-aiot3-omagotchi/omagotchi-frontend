package site.omagotchi.frontend.auth.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.restdocs.headers.HeaderDescriptor;
import org.springframework.restdocs.operation.preprocess.OperationPreprocessor;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.PasswordResetBffService;
import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.presentation.bff.PasswordResetBffController;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

@WebMvcTest(PasswordResetBffController.class)
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
@Import({
    ServletApiErrorResponseWriter.class,
    BffApiExceptionResolver.class,
    BffApiSecurityErrorHandler.class,
    ApiExceptionHandler.class,
    SecurityConfig.class
})
class PasswordResetBffMvcTest {

    private static final UUID CHALLENGE_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000900001"
    );

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationService authenticationService;

    @MockitoBean
    private AccessTokenRefreshInterceptor accessTokenRefreshInterceptor;

    @MockitoBean
    private HttpErrorEventLogger errorEventLogger;

    @MockitoBean
    private PasswordResetBffService passwordResetBffService;

    @MockitoBean
    private BrowserSessionInvalidator sessionInvalidator;

    @MockitoBean
    private BrowserTokenSessionAuthenticationStrategy tokenSessionStrategy;

    @MockitoBean
    private IdentityLogoutHandler identityLogoutHandler;

    @MockitoBean
    private LoginAuthenticationFailureHandler loginFailureHandler;

    @Test
    @DisplayName("익명 Browser의 비밀번호 재설정 이메일 OTP 발급")
    void requestsPasswordResetEmailOtpAnonymously() throws Exception {
        PasswordResetEmailChallengeCommand command = new PasswordResetEmailChallengeCommand("user@example.com");
        given(passwordResetBffService.requestEmailVerification(command))
                .willReturn(new EmailVerificationChallenge(CHALLENGE_ID.toString(), 300));

        mockMvc.perform(post("/bff/v2/auth/password-reset/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\" user@example.com \"}"))
                .andExpectAll(
                        status().isAccepted(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.challengeId").value(CHALLENGE_ID.toString()),
                        jsonPath("$.expiresInSeconds").value(300))
                .andDo(document(
                        "signup-reset/password-reset-email-otp",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(fieldWithPath("email").description("비밀번호를 재설정할 이메일")),
                        responseHeaders(cacheControlHeader()),
                        responseFields(
                                fieldWithPath("challengeId")
                                        .description("이메일 인증 Challenge 식별자"),
                                fieldWithPath("expiresInSeconds")
                                        .description("인증 요청 유효 시간(초)"))));

        verify(passwordResetBffService).requestEmailVerification(command);
        verifyNoInteractions(accessTokenRefreshInterceptor);
    }

    @Test
    @DisplayName("익명 Browser의 OTP 기반 비밀번호 재설정")
    void resetsPasswordAnonymously() throws Exception {
        PasswordResetCommand command = new PasswordResetCommand(
                "user@example.com",
                "new-password-passphrase",
                CHALLENGE_ID,
                "123456"
        );

        mockMvc.perform(patch("/bff/v2/auth/password-reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": " user@example.com ",
                          "newPassword": "new-password-passphrase",
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "code": "123456"
                        }
                        """))
                .andExpectAll(
                        status().isNoContent(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andDo(document(
                        "signup-reset/password-reset",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(
                                fieldWithPath("email").description("비밀번호를 재설정할 이메일"),
                                fieldWithPath("newPassword").description("새 비밀번호"),
                                fieldWithPath("challengeId")
                                        .description("이메일 인증 Challenge 식별자"),
                                fieldWithPath("code").description("이메일 인증번호 6자리")),
                        responseHeaders(cacheControlHeader())));

        verify(passwordResetBffService).resetPassword(command);
        verifyNoInteractions(sessionInvalidator);
        verifyNoInteractions(accessTokenRefreshInterceptor);
    }

    @Test
    @DisplayName("비밀번호 재설정 BFF 쓰기 요청은 CSRF Token을 요구")
    void rejectsPasswordResetRequestsWithoutCsrf() throws Exception {
        mockMvc.perform(post("/bff/v2/auth/password-reset/email-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isForbidden(),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );
        mockMvc.perform(patch("/bff/v2/auth/password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isForbidden(),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );

        verifyNoInteractions(passwordResetBffService);
    }

    @Test
    @DisplayName("잘못된 OTP 형식은 Identity 호출 전 400으로 거절")
    void rejectsInvalidPasswordResetCodeFormat() throws Exception {
        mockMvc.perform(patch("/bff/v2/auth/password-reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "newPassword": "new-password-passphrase",
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "code": "ABCDEF"
                        }
                        """))
                .andExpectAll(
                        status().isBadRequest(), jsonPath("$.code").value("COMMON_INVALID_REQUEST"))
                .andDo(document(
                        "signup-reset/password-reset-invalid-code",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(
                                fieldWithPath("email").description("비밀번호를 재설정할 이메일"),
                                fieldWithPath("newPassword").description("새 비밀번호"),
                                fieldWithPath("challengeId")
                                        .description("이메일 인증 Challenge 식별자"),
                                fieldWithPath("code").description("이메일 인증번호 6자리")),
                        responseHeaders(cacheControlHeader()),
                        responseFields(errorFields())));

        verifyNoInteractions(passwordResetBffService);
    }

    @Test
    @DisplayName("OTP 공유 쿨다운의 Retry-After를 Browser 응답에 보존")
    void forwardsPasswordResetRetryAfterHeader() throws Exception {
        given(passwordResetBffService.requestEmailVerification(any()))
                .willThrow(new EmailVerificationCooldownException(
                        37,
                        new IllegalStateException("Identity cooldown")
                ));

        mockMvc.perform(post("/bff/v2/auth/password-reset/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\"}"))
                .andExpectAll(
                        status().isTooManyRequests(),
                        header().string(HttpHeaders.RETRY_AFTER, "37"),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("EMAIL_VERIFICATION_COOLDOWN_ACTIVE"))
                .andDo(document(
                        "signup-reset/password-reset-cooldown",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(fieldWithPath("email").description("비밀번호를 재설정할 이메일")),
                        responseHeaders(
                                headerWithName(HttpHeaders.CACHE_CONTROL)
                                        .description("응답을 저장하지 않음"),
                                headerWithName(HttpHeaders.RETRY_AFTER)
                                        .description("다음 OTP 발급까지 대기할 시간(초)")),
                        responseFields(errorFields())));
    }

    @Test
    @DisplayName("재설정 정보 거절을 계정 존재 여부를 숨기는 Browser 오류로 변환")
    void returnsNonEnumeratingPasswordResetError() throws Exception {
        willThrow(new BusinessException(AuthErrorCode.PASSWORD_RESET_INVALID))
                .given(passwordResetBffService)
                .resetPassword(any());

        mockMvc.perform(patch("/bff/v2/auth/password-reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {
                          "email": "user@example.com",
                          "newPassword": "new-password-passphrase",
                          "challengeId": "00000000-0000-0000-0000-000000900001",
                          "code": "123456"
                        }
                        """))
                .andExpectAll(
                        status().isBadRequest(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("AUTH_PASSWORD_RESET_INVALID"))
                .andDo(document(
                        "signup-reset/password-reset-domain-error",
                        preprocessRequest(prettyPrint(), secretValues()),
                        preprocessResponse(prettyPrint(), normalizeIds()),
                        requestFields(
                                fieldWithPath("email").description("비밀번호를 재설정할 이메일"),
                                fieldWithPath("newPassword").description("새 비밀번호"),
                                fieldWithPath("challengeId")
                                        .description("이메일 인증 Challenge 식별자"),
                                fieldWithPath("code").description("이메일 인증번호 6자리")),
                        responseHeaders(cacheControlHeader()),
                        responseFields(errorFields())));
    }

    private static OperationPreprocessor secretValues() {
        return replacePattern(
                Pattern.compile(
                        "(?:\\\"(?:password|newPassword|code|challengeId)\\\"\\s*:\\s*\\\")([^\\\"]+)"),
                "[REDACTED]");
    }

    private static OperationPreprocessor normalizeIds() {
        return replacePattern(Pattern.compile("00000000-0000-0000-0000-000000900001"), "[CHALLENGE_ID]");
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
