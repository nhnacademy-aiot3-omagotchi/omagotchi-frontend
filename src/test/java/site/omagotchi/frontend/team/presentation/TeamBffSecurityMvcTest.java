package site.omagotchi.frontend.team.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;
import site.omagotchi.frontend.team.application.TeamBffService;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TeamBffController.class)
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        AuthenticationService.class,
        BrowserSessionTokens.class,
        BrowserTokenSessionAuthenticationStrategy.class,
        BrowserSessionInvalidator.class,
        BffApiSecurityErrorHandler.class,
        IdentityLogoutHandler.class,
        LoginAuthenticationFailureHandler.class,
        SecurityConfig.class
})
class TeamBffSecurityMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @MockitoBean
    private AccessTokenRefreshInterceptor accessTokenRefreshInterceptor;

    @MockitoBean
    private TeamBffService teamBffService;

    @BeforeEach
    void configureIdentityLogin() throws Exception {
        given(identityAuthClient.login(anyString(), anyString())).willReturn(tokenBundle());
        given(accessTokenRefreshInterceptor.preHandle(any(), any(), any())).willReturn(true);
    }

    @Test
    @DisplayName("Session 없는 팀 BFF 요청은 Redirect 없이 JSON 401을 반환한다")
    void rejectsUnauthenticatedTeamRequest() throws Exception {
        mockMvc.perform(get("/bff/v1/teams/me"))
                .andExpectAll(
                        status().isUnauthorized(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"),
                        jsonPath("$.path").value("/bff/v1/teams/me")
                );

        verifyNoInteractions(teamBffService);
    }

    @Test
    @DisplayName("CSRF Token 없는 팀 상태 변경 요청은 JSON 403을 반환한다")
    void rejectsTeamMutationWithoutCsrf() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(post("/bff/v1/teams/10/leave").session(session))
                .andExpectAll(
                        status().isForbidden(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );

        verifyNoInteractions(teamBffService);
    }

    private static BrowserSessionTokenBundle tokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-09-02T00:00:00Z"),
                "refresh-token",
                Instant.parse("2026-09-09T00:00:00Z")
        );
    }
}
