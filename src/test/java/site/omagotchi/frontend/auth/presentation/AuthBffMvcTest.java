package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.auth.application.PasswordChangeService;
import site.omagotchi.frontend.auth.application.VerifiedSignupService;
import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;
import site.omagotchi.frontend.auth.application.command.SignupEmailChallengeCommand;
import site.omagotchi.frontend.auth.application.command.VerifiedSignupCommand;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.presentation.bff.PasswordChangeBffController;
import site.omagotchi.frontend.auth.presentation.bff.SignupBffController;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.IdentitySessionAuthorization;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({SignupBffController.class, PasswordChangeBffController.class})
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        BffApiSecurityErrorHandler.class,
        ApiExceptionHandler.class,
        SecurityConfig.class
})
class AuthBffMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationService authenticationService;

    @MockitoBean
    private VerifiedSignupService verifiedSignupService;

    @MockitoBean
    private PasswordChangeService passwordChangeService;

    @MockitoBean
    private IdentitySessionAuthorization sessionAuthorization;

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

        mockMvc.perform(post(
                        "/bff/v2/auth/signup/email-otp"
                )
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
                        status().isOk(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.challengeId").value("challenge-id"),
                        jsonPath("$.expiresInSeconds").value(600)
                );
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
    }

    @Test
    @DisplayName("메일 제공자 실패 시 OTP 화면 전환용 성공 응답을 반환하지 않음")
    void rejectsSignupEmailVerificationWhenDeliveryFails() throws Exception {
        given(verifiedSignupService.requestEmailVerification(
                org.mockito.ArgumentMatchers.any()
        )).willThrow(new site.omagotchi.frontend.global.exception.BusinessException(
                site.omagotchi.frontend.global.exception.CommonErrorCode.SERVICE_UNAVAILABLE
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
                        status().isServiceUnavailable(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_SERVICE_UNAVAILABLE")
                );
    }

    @Test
    @DisplayName("v2 회원가입 OTP 거절의 Browser 오류 변환")
    void mapsRejectedVerifiedSignup() throws Exception {
        VerifiedSignupCommand command = new VerifiedSignupCommand(
                "user@example.com",
                "password-passphrase",
                "오마고치",
                "challenge-id",
                "123456"
        );
        given(verifiedSignupService.signUp(command))
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
                        jsonPath("$.code").value("EMAIL_VERIFICATION_INVALID")
                );
        verify(verifiedSignupService).signUp(command);
    }

    @ParameterizedTest
    @CsvSource({
            "POST, /bff/v2/auth/signup/email-otp",
            "POST, /bff/v2/auth/signup",
            "POST, /bff/v2/users/me/password/email-otp",
            "PATCH, /bff/v2/users/me/password"
    })
    @DisplayName("가입·비밀번호 변경 BFF의 모든 쓰기 요청은 CSRF Token을 요구")
    void rejectsAuthBffRequestWithoutCsrf(String method, String path) throws Exception {
        mockMvc.perform(request(HttpMethod.valueOf(method), path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isForbidden(),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );
        verifyNoInteractions(verifiedSignupService, passwordChangeService, sessionAuthorization);
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

    @ParameterizedTest
    @CsvSource({
            "POST, /bff/v2/users/me/password/email-otp",
            "PATCH, /bff/v2/users/me/password"
    })
    @DisplayName("익명 Browser의 비밀번호 변경 BFF 요청 차단")
    void rejectsAnonymousPasswordRequest(String method, String path) throws Exception {
        mockMvc.perform(request(HttpMethod.valueOf(method), path)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isUnauthorized(),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED")
                );
        verifyNoInteractions(passwordChangeService, sessionAuthorization);
    }

    @Test
    @WithMockUser
    @DisplayName("인증 Session의 비밀번호 변경 이메일 인증 Challenge 발급")
    void requestsPasswordChangeEmailVerification() throws Exception {
        given(sessionAuthorization.bearerToken(org.mockito.ArgumentMatchers.any()))
                .willReturn("Bearer access-token");
        given(passwordChangeService.requestEmailVerification("Bearer access-token"))
                .willReturn(new EmailVerificationChallenge(
                        "password-challenge-id",
                        600
                ));

        mockMvc.perform(post(
                        "/bff/v2/users/me/password/email-otp"
                ).with(csrf()))
                .andExpectAll(
                        status().isAccepted(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.challengeId").value("password-challenge-id"),
                        jsonPath("$.expiresInSeconds").value(600)
                );
    }

    @Test
    @WithMockUser
    @DisplayName("비밀번호 변경 성공 뒤 Frontend Session 종료")
    void changesPasswordAndInvalidatesSession() throws Exception {
        given(sessionAuthorization.bearerToken(org.mockito.ArgumentMatchers.any()))
                .willReturn("Bearer access-token");
        PasswordChangeCommand command = new PasswordChangeCommand(
                "current-password-passphrase",
                "new-password-passphrase",
                "password-challenge-id",
                "123456"
        );

        mockMvc.perform(patch("/bff/v2/users/me/password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "current-password-passphrase",
                                  "newPassword": "new-password-passphrase",
                                  "challengeId": "password-challenge-id",
                                  "code": "123456"
                                }
                                """))
                .andExpectAll(
                        status().isNoContent(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store")
                );

        verify(passwordChangeService).changePassword("Bearer access-token", command);
        verify(sessionInvalidator).invalidate(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Cooldown 남은 시간을 Browser Retry-After Header로 전달")
    void forwardsRetryAfterHeader() throws Exception {
        given(verifiedSignupService.requestEmailVerification(
                org.mockito.ArgumentMatchers.any()
        )).willThrow(new EmailVerificationCooldownException(
                37,
                new IllegalStateException("Identity cooldown")
        ));

        mockMvc.perform(post(
                        "/bff/v2/auth/signup/email-otp"
                )
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
