package site.omagotchi.frontend.space.presentation;

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
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;
import site.omagotchi.frontend.space.application.SpaceBffService;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@WebMvcTest(SpaceBffController.class)
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        AuthenticationService.class,
        BrowserSessionTokens.class,
        BrowserTokenSessionAuthenticationStrategy.class,
        BffApiSecurityErrorHandler.class,
        IdentityLogoutHandler.class,
        LoginAuthenticationFailureHandler.class,
        SecurityConfig.class
})
class SpaceBffSecurityMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @MockitoBean
    private SpaceBffService spaceBffService;

    @BeforeEach
    void configureIdentityLogin() {
        given(identityAuthClient.login(anyString(), anyString()))
                .willReturn(tokenBundle());
    }

    @Test
    @DisplayName("Session 없는 공간 BFF 요청은 Redirect 없이 JSON 401")
    void rejectsUnauthenticatedSpaceRequest() throws Exception {
        mockMvc.perform(get("/bff/v1/spaces"))
                .andExpectAll(
                        status().isUnauthorized(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"),
                        jsonPath("$.path").value("/bff/v1/spaces")
                );

        verifyNoInteractions(spaceBffService);
    }

    @Test
    @DisplayName("CSRF Token 없는 공간 상태 변경 요청은 JSON 403")
    void rejectsSpaceMutationWithoutCsrf() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession session =
                (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(post("/bff/v1/spaces/3/occupancies")
                        .session(session))
                .andExpectAll(
                        status().isForbidden(),
                        content().contentTypeCompatibleWith("application/json"),
                        jsonPath("$.code").value("AUTH_CSRF_INVALID"),
                        jsonPath("$.path").value("/bff/v1/spaces/3/occupancies")
                );

        verifyNoInteractions(spaceBffService);
    }

    @Test
    @DisplayName("인증된 공간 목록 BFF 응답은 no-store로 캐시를 막는다")
    void preventsCachingAuthenticatedSpaceList() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "user@example.com")
                        .param("password", "password-passphrase"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/bff/v1/spaces").session(session))
                .andExpectAll(status().isOk(), header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    private static BrowserSessionTokenBundle tokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-18T15:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-25T15:00:00Z")
        );
    }
}
