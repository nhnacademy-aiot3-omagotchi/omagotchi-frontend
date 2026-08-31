package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class AuthenticatedLoginRequestFilterTest {

    private final AuthenticatedLoginRequestFilter filter = new AuthenticatedLoginRequestFilter();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Login 이외 요청의 후속 Filter 전달")
    void passesOtherRequestsToFilterChain() throws Exception {
        // Given: Login 이외 요청과 후속 Filter 호출 기록
        AtomicBoolean chainInvoked = new AtomicBoolean();

        // When: Login 이외의 요청 처리
        filter.doFilter(
                new MockHttpServletRequest("GET", "/css/error.css"),
                new MockHttpServletResponse(),
                (request, response) -> chainInvoked.set(true)
        );

        // Then: 후속 Filter 호출
        assertThat(chainInvoked).isTrue();
    }

    @Test
    @DisplayName("미인증 Login 요청의 후속 Filter 전달")
    void passesUnauthenticatedLoginRequestToFilterChain() throws Exception {
        // Given: 미인증 Login 요청과 후속 Filter 호출 기록
        AtomicBoolean chainInvoked = new AtomicBoolean();

        // When: 미인증 Login 요청 처리
        filter.doFilter(
                new MockHttpServletRequest("POST", "/login"),
                new MockHttpServletResponse(),
                (request, response) -> chainInvoked.set(true)
        );

        // Then: Spring Security Login Filter 호출
        assertThat(chainInvoked).isTrue();
    }

    @Test
    @DisplayName("인증된 Login 요청의 접근 판정 Redirect")
    void redirectsAuthenticatedLoginRequestToHome() throws Exception {
        // Given: 인증된 SecurityContext와 Login 요청
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        "user-id",
                        null,
                        List.of()
                )
        );
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainInvoked = new AtomicBoolean();

        // When: 인증된 Login 요청 처리
        filter.doFilter(
                new MockHttpServletRequest("POST", "/login"),
                response,
                (request, filterResponse) -> chainInvoked.set(true)
        );

        // Then: Identity 호출 Filter 이전 Home Redirect
        assertSoftly(softly -> {
            softly.assertThat(response.getRedirectedUrl()).isEqualTo("/authenticated-landing");
            softly.assertThat(chainInvoked).isFalse();
        });
    }

    @Test
    @DisplayName("인증된 SYSTEM_ADMIN Login 요청의 전용 Dashboard Redirect")
    void redirectsAuthenticatedSystemAdminLoginRequestToDashboard() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        "system-admin-id",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN"))
                )
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                new MockHttpServletRequest("POST", "/login"),
                response,
                (request, filterResponse) -> {
                    throw new AssertionError("인증된 요청은 Login Filter로 전달되면 안 됩니다.");
                }
        );

        assertThat(response.getRedirectedUrl()).isEqualTo("/system-admin-dashboard");
    }
}
