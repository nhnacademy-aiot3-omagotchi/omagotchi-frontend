package site.omagotchi.frontend.support;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.session.autoconfigure.SessionProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import site.omagotchi.frontend.auth.application.AccessTokenRefreshService;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshWebConfig;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;
import site.omagotchi.frontend.global.security.BffApiSecurityErrorHandler;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityConfig;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.BffApiExceptionResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

/**
 * Shared MVC slice wiring for BFF controller tests.
 *
 * <p>Subclasses declare {@code @WebMvcTest}; this support imports the shared production security
 * chain and refresh interceptor configuration.
 */
@Import(FrontendMvcTestSupport.FrontendMvcTestConfiguration.class)
public abstract class FrontendMvcTestSupport {

    @MockitoBean
    protected IdentityAuthClient identityAuthClient;

    @MockitoBean
    protected AccessTokenRefreshService accessTokenRefreshService;

    @MockitoBean
    protected HttpErrorEventLogger errorEventLogger;

    @BeforeEach
    void returnObservedTokenBundleFromRefresh() {
        given(accessTokenRefreshService.refreshIfRequired(anyString(), any()))
                .willAnswer(invocation -> invocation.getArgument(1));
    }

    protected MockHttpSession authenticatedSession() {
        return authenticatedSession(defaultTokenBundle());
    }

    protected MockHttpSession authenticatedSession(GlobalRole role) {
        return authenticatedSession(defaultTokenBundle(role));
    }

    protected MockHttpSession authenticatedSession(BrowserSessionTokenBundle tokens) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE, tokens);
        authenticate(session, tokens);
        return session;
    }

    protected void authenticate(HttpSession session, BrowserSessionTokenBundle tokens) {
        session.setAttribute(BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE, tokens);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        tokens.userId().toString(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + tokens.globalRole().name()))));
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
    }

    protected void authenticate(HttpSession session) {
        Object existing = session.getAttribute(BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE);
        authenticate(
                session,
                existing instanceof BrowserSessionTokenBundle bundle
                        ? bundle
                        : defaultTokenBundle());
    }

    private static BrowserSessionTokenBundle defaultTokenBundle() {
        return defaultTokenBundle(GlobalRole.USER);
    }

    private static BrowserSessionTokenBundle defaultTokenBundle(GlobalRole role) {
        Instant now = Instant.parse("2030-01-01T00:00:00Z");
        return new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                role,
                "access-token",
                now.plusSeconds(3600),
                "refresh-token",
                now.plusSeconds(86400));
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties(SessionProperties.class)
    @Import({
        SecurityConfig.class,
        AuthenticationService.class,
        AccessTokenRefreshInterceptor.class,
        AccessTokenRefreshWebConfig.class,
        BrowserSessionTokens.class,
        LearningSessionAuthorization.class,
        BrowserTokenSessionAuthenticationStrategy.class,
        IdentityLogoutHandler.class,
        LoginAuthenticationFailureHandler.class,
        BrowserSessionInvalidator.class,
        BffApiSecurityErrorHandler.class,
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        ApiExceptionHandler.class
    })
    public static class FrontendMvcTestConfiguration {}
}
