package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.VerifiedSignupService;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.presentation.bff.SignupBffController;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SignupBffController.class)
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        BffApiSecurityErrorHandler.class,
        ApiExceptionHandler.class,
        SecurityConfig.class
})
class SignupBffMvcTest {

    @Autowired
    private MockMvc mockMvc;

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
                new SignupEmailChallengeCommand(
                        "user@example.com",
                        "password-passphrase",
                        "오마고치"
                )
        )).willReturn(new EmailVerificationChallenge("challenge-id", 600));

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
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
                        jsonPath("$.expiresInSeconds").value(600)
                );
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
                        .content("""
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
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store")
                );
        verify(verifiedSignupService).signUp(command);
        verifyNoInteractions(accessTokenRefreshInterceptor);
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
                        .content("""
                                {
                                  "email": "user@example.com",
                                  "password": "password-passphrase",
                                  "name": "오마고치",
                                  "challengeId": "challenge-id",
                                  "code": "ABCDEF"
                                }
                                """))
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code").value("COMMON_INVALID_REQUEST")
                );
        verifyNoInteractions(verifiedSignupService);
    }

    @Test
    @DisplayName("OTP 거절을 Browser 오류 계약으로 변환")
    void mapsRejectedVerifiedSignup() throws Exception {
        given(verifiedSignupService.signUp(any()))
                .willReturn(new SignupResult.Rejected(
                        AuthErrorCode.EMAIL_VERIFICATION_INVALID
                ));

        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
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
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code")
                                .value("EMAIL_VERIFICATION_INVALID_CHALLENGE")
                );
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
                        .content("""
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
                        jsonPath("$.code")
                                .value("EMAIL_VERIFICATION_COOLDOWN_ACTIVE")
                );
    }
}
