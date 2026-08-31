package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.WebAttributes;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.page.LoginPageController;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(LoginPageController.class)
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        AuthenticationService.class,
        BrowserSessionTokens.class,
        BrowserTokenSessionAuthenticationStrategy.class,
        BffApiSecurityErrorHandler.class,
        IdentityLogoutHandler.class,
        LoginAuthenticationFailureHandler.class,
        BrowserSessionInvalidator.class,
        SecurityConfig.class
})
class AuthenticationSecurityMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @Autowired
    private BrowserSessionTokens browserSessionTokens;

    @BeforeEach
    void configureIdentityLogin() {
        given(identityAuthClient.login(anyString(), anyString()))
                .willReturn(tokenBundle());
    }

    @Test
    @DisplayName("로그인 Page의 Server Form과 CSRF Token 제공")
    void rendersLoginFormWithCsrfToken() throws Exception {
        // When: 로그인 Page 요청
        MvcResult result = mockMvc.perform(get("/login"))
                .andExpectAll(
                        status().isOk(),
                        view().name("pages/auth/login"),
                        header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")),
                        content().string(containsString("action=\"/login\"")),
                        content().string(containsString("name=\"email\"")),
                        content().string(containsString("name=\"_csrf\""))
                )
                .andReturn();

        // Then: 익명 Session 기반 CSRF Token 생성
        assertThat(result.getRequest().getSession(false)).isNotNull();
    }

    @Test
    @DisplayName("잘못된 자격 증명의 Login Page Redirect")
    void redirectsInvalidCredentialsToLoginPage() throws Exception {
        // Given: Identity 자격 증명 거부
        given(identityAuthClient.login("user@example.com", "password-passphrase"))
                .willThrow(new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
        MockHttpSession anonymousSession = new MockHttpSession();

        // When: Login Form 제출
        MvcResult result = mockMvc.perform(post("/login")
                        .with(csrf())
                        .session(anonymousSession)
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login?error=true")
                )
                .andReturn();

        // Then: 원본 예외의 Session 저장 방지
        assertThat(result.getRequest().getSession(false).getAttribute(
                WebAttributes.AUTHENTICATION_EXCEPTION
        )).isNull();
        verify(identityAuthClient).login("user@example.com", "password-passphrase");

        // Then: 고정된 실패 안내와 비밀번호 비노출
        mockMvc.perform(get("/login?error=true")
                        .session((MockHttpSession) result.getRequest().getSession(false)))
                .andExpectAll(
                        status().isOk(),
                        model().attribute(
                                "authFeedback",
                                AuthErrorCode.INVALID_CREDENTIALS.message()
                        ),
                        content().string(not(containsString("password-passphrase")))
                );
    }

    @Test
    @DisplayName("허용된 비밀번호 변경 안내 Code의 Login Page 표시")
    void rendersPasswordChangedNotice() throws Exception {
        // When: 허용된 비밀번호 변경 안내 Code의 Login Page 요청
        // Then: 고정된 성공 안내 표시
        mockMvc.perform(get("/login?notice=password-changed"))
                .andExpectAll(
                        status().isOk(),
                        model().attribute("authFeedbackType", "success"),
                        content().string(containsString("새 비밀번호로 다시 로그인해 주세요."))
                );
    }

    @Test
    @DisplayName("허용된 Session 만료 안내 Code의 Login Page 표시")
    void rendersSessionExpiredNotice() throws Exception {
        // When: 허용된 Session 만료 안내 Code의 Login Page 요청
        // Then: 고정된 오류 안내 표시
        mockMvc.perform(get("/login?notice=session-expired"))
                .andExpectAll(
                        status().isOk(),
                        model().attribute("authFeedbackType", "error"),
                        content().string(containsString("로그인 시간이 만료되었습니다."))
                );
    }

    @Test
    @DisplayName("허용 목록 밖 Login 안내 Code 무시")
    void ignoresUnknownLoginNotice() throws Exception {
        // When: 허용 목록 밖 안내 Code의 Login Page 요청
        // Then: 안내 표시 없음
        mockMvc.perform(get("/login?notice=forged"))
                .andExpectAll(
                        status().isOk(),
                        model().attributeDoesNotExist("authFeedbackType"),
                        content().string(not(containsString("비밀번호를 변경했습니다.")))
                );
    }

    @Test
    @DisplayName("Spring Security Form Login의 Session 수립과 접근 판정 Redirect")
    void establishesSessionAndRedirectsAfterLogin() throws Exception {
        // Given: Identity Token Bundle과 익명 Session
        BrowserSessionTokenBundle tokenBundle = tokenBundle();
        MockHttpSession anonymousSession = new MockHttpSession();
        String anonymousSessionId = anonymousSession.getId();

        // When: Login Form 제출
        MvcResult result = mockMvc.perform(post("/login")
                        .with(csrf())
                        .session(anonymousSession)
                        .param("email", " user@example.com ")
                        .param("password", "password-passphrase"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/authenticated-landing")
                )
                .andReturn();

        // Then: Session ID 교체와 Token 없는 SecurityContext 저장
        assertThat(result.getRequest().getSession(false)).isNotNull();
        assertThat(result.getRequest().getSession(false).getId())
                .isNotEqualTo(anonymousSessionId);
        SecurityContext securityContext = (SecurityContext) result.getRequest()
                .getSession(false)
                .getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
        );
        assertThat(securityContext).isNotNull();
        assertThat(securityContext.getAuthentication().getDetails()).isNull();
        assertThat(browserSessionTokens.find(result.getRequest()))
                .contains(tokenBundle);
        verify(identityAuthClient).login("user@example.com", "password-passphrase");
    }

    @Test
    @DisplayName("SYSTEM_ADMIN Login 성공 뒤 전용 Dashboard Redirect")
    void redirectsSystemAdminToDedicatedDashboardAfterLogin() throws Exception {
        given(identityAuthClient.login("test@test.com", "00000000000000000000"))
                .willReturn(systemAdminTokenBundle());

        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "test@test.com")
                        .param("password", "00000000000000000000"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/system-admin-dashboard")
                );
    }

    @Test
    @DisplayName("인증된 Session의 중복 Login 차단")
    void rejectsLoginForAuthenticatedSessionBeforeIdentityCall() throws Exception {
        // Given: 기존 Token Family를 보유한 인증 Session
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);
        BrowserSessionTokenBundle originalTokenBundle = browserSessionTokens
                .find(loginResult.getRequest())
                .orElseThrow();
        clearInvocations(identityAuthClient);

        // When: 인증 Session으로 Login Form 직접 재제출
        MvcResult reloginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .session(authenticatedSession)
                        .param("email", "other@example.com")
                        .param("password", "other-password"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/authenticated-landing")
                )
                .andReturn();

        // Then: Identity 재호출 없는 기존 Token Family 유지
        verifyNoInteractions(identityAuthClient);
        assertThat(browserSessionTokens.find(reloginResult.getRequest()))
                .contains(originalTokenBundle);
    }

    @Test
    @DisplayName("Login 연동 장애의 원래 HTTP 상태 유지")
    void returnsServiceStatusForLoginFailure() throws Exception {
        // Given: Identity 접속 장애
        given(identityAuthClient.login("user@example.com", "password-passphrase"))
                .willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE));

        // When: Login Form 제출
        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                // Then: Identity 장애 503 응답
                .andExpect(status().isServiceUnavailable());

        // Then: Provider 재시도 없는 Identity 단일 호출
        verify(identityAuthClient).login("user@example.com", "password-passphrase");
    }

    @Test
    @DisplayName("CSRF Token 없는 Login Form의 HTML 403 정책")
    void rejectsLoginFormWithoutCsrfToken() throws Exception {
        // When: CSRF Token 없는 Login Form 제출
        mockMvc.perform(post("/login")
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                // Then: HTML 403 응답
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CSRF Token 없는 Signup Form의 HTML 403 정책")
    void rejectsSignupFormWithoutCsrfToken() throws Exception {
        // When: CSRF Token 없는 Signup Form 제출
        mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "password-passphrase"))
                // Then: HTML 403 응답
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("미인증 일반 Page의 Login Redirect")
    void redirectsUnauthenticatedPageToLogin() throws Exception {
        // When: 미인증 Home 요청
        mockMvc.perform(get("/home"))
                // Then: 일반 Login 이동
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login")
                );
    }

    @Test
    @DisplayName("미인증 BFF 요청의 Redirect 없는 공통 JSON 401")
    void returnsJsonUnauthorizedForBffRequest() throws Exception {
        // When: 미인증 BFF Endpoint 요청
        mockMvc.perform(get("/bff/v1/example"))
                // Then: Login Redirect 없는 공통 JSON 401
                .andExpectAll(
                        status().isUnauthorized(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"),
                        jsonPath("$.path").value("/bff/v1/example")
                );
    }

    @Test
    @DisplayName("CSRF Token 없는 BFF 상태 변경 요청의 공통 JSON 403")
    void returnsJsonForbiddenForBffRequestWithoutCsrf() throws Exception {
        // Given: Form Login으로 수립된 인증 Session
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);

        // When: CSRF Token 없는 BFF 상태 변경 요청
        mockMvc.perform(post("/bff/v1/example")
                        .session(authenticatedSession))
                // Then: HTML ERROR dispatch 없는 공통 JSON 403
                .andExpectAll(
                        status().isForbidden(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );
    }

    @Test
    @DisplayName("인증된 Session의 미등록 BFF 경로는 공통 JSON 404")
    void returnsJsonNotFoundForAuthenticatedBffRequest() throws Exception {
        // Given: Form Login으로 수립된 인증 Session
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);

        // When: 등록되지 않은 BFF Endpoint 요청
        mockMvc.perform(get("/bff/v1/missing")
                        .session(authenticatedSession))
                // Then: Page 404가 아닌 공통 JSON 404
                .andExpectAll(
                        status().isNotFound(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("COMMON_NOT_FOUND")
                );
    }

    @Test
    @DisplayName("Spring Security Logout의 Identity Token 폐기와 Session 무효화")
    void revokesIdentityTokenAndInvalidatesSessionOnLogout() throws Exception {
        // Given: Form Login으로 수립된 Browser Session
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);

        // When: Spring Security Logout Form 제출
        mockMvc.perform(post("/logout")
                        .with(csrf())
                        .session(authenticatedSession))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login")
                );

        // Then: Identity Refresh Token 폐기와 Local Session 무효화
        verify(identityAuthClient).logout("refresh-token");
        assertThat(authenticatedSession.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("Identity Logout 장애와 무관한 Local Session 무효화")
    void invalidatesSessionWhenIdentityLogoutFails() throws Exception {
        // Given: Form Login Session과 Identity Logout 장애
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);
        willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE))
                .given(identityAuthClient)
                .logout("refresh-token");

        // When: Spring Security Logout Form 제출
        mockMvc.perform(post("/logout")
                        .with(csrf())
                        .session(authenticatedSession))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login")
                );

        // Then: Identity 결과와 무관한 Local Session 무효화
        assertThat(authenticatedSession.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("예상하지 못한 Identity Logout 오류와 무관한 Local Session 무효화")
    void invalidatesSessionWhenIdentityLogoutFailsUnexpectedly() throws Exception {
        // Given: Form Login Session과 예상하지 못한 Identity Client 오류
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession authenticatedSession =
                (MockHttpSession) loginResult.getRequest().getSession(false);
        willThrow(new IllegalStateException("unexpected identity client failure"))
                .given(identityAuthClient)
                .logout("refresh-token");

        // When: Spring Security Logout Form 제출
        mockMvc.perform(post("/logout")
                        .with(csrf())
                        .session(authenticatedSession))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login")
                );

        // Then: 예상하지 못한 오류와 무관한 Local Session 무효화
        assertThat(authenticatedSession.isInvalid()).isTrue();
    }

    private BrowserSessionTokenBundle tokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2099-01-01T00:00:00Z"),
                "refresh-token",
                Instant.parse("2099-01-02T00:00:00Z")
        );
    }

    private BrowserSessionTokenBundle systemAdminTokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                GlobalRole.SYSTEM_ADMIN,
                "system-admin-access-token",
                Instant.parse("2099-01-01T00:00:00Z"),
                "system-admin-refresh-token",
                Instant.parse("2099-01-02T00:00:00Z")
        );
    }

}
