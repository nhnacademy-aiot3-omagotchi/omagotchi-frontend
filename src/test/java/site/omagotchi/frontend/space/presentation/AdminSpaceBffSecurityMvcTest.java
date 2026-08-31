package site.omagotchi.frontend.space.presentation;

import org.junit.jupiter.api.BeforeEach;
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
import site.omagotchi.frontend.space.application.AdminSpaceBffService;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminSpaceBffController.class)
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
class AdminSpaceBffSecurityMvcTest {

    private static final String BODY = """
            {"name":"회의실 A","type":"MEETING","capacity":8,"cohortId":1}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @MockitoBean
    private AccessTokenRefreshInterceptor accessTokenRefreshInterceptor;

    @MockitoBean
    private AdminSpaceBffService service;

    @BeforeEach
    void configureIdentityLogin() throws Exception {
        given(identityAuthClient.login(anyString(), anyString())).willReturn(tokenBundle());
        given(accessTokenRefreshInterceptor.preHandle(any(), any(), any()))
                .willReturn(true);
    }

    @Test
    void rejectsUnauthenticatedAdminSpaceMutation() throws Exception {
        mockMvc.perform(post("/bff/v1/admin/spaces")
                        .with(csrf())
                        .contentType("application/json")
                        .content(BODY))
                .andExpectAll(
                        status().isUnauthorized(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED")
                );

        verifyNoInteractions(service);
    }

    @Test
    void rejectsAdminSpaceMutationWithoutCsrf() throws Exception {
        MvcResult login = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "manager@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        mockMvc.perform(post("/bff/v1/admin/spaces")
                        .session(session)
                        .contentType("application/json")
                        .content(BODY))
                .andExpectAll(
                        status().isForbidden(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID")
                );

        verifyNoInteractions(service);
    }

    private static BrowserSessionTokenBundle tokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-25T06:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-26T06:00:00Z")
        );
    }
}
