package site.omagotchi.frontend.global.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.MapSession;
import org.springframework.session.SessionRepository;
import org.springframework.session.web.http.SessionRepositoryFilter;

import java.util.Base64;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;

class BrowserSessionInvalidatorTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("현재 브라우저 세션과 Security Context 폐기")
    void invalidatesLocalSessionAndClearsSecurityContext() {
        // Given: 인증 정보가 저장된 현재 브라우저 세션
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(true);
        TestingAuthenticationToken authentication =
                new TestingAuthenticationToken("user", null);
        authentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // When: 현재 브라우저 인증 상태 폐기
        new BrowserSessionInvalidator().invalidate(
                request,
                new MockHttpServletResponse(),
                authentication
        );

        // Then: HTTP 세션 무효화와 Security Context 인증 제거
        assertThat(session.isInvalid()).isTrue();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Redis Session 삭제 실패에도 Spring Session이 Cookie 만료")
    void springSessionExpiresCookieWhenSessionDeletionFails() throws Exception {
        // Given: Redis Session에 연결된 Browser Cookie와 삭제 장애
        String sessionId = "browser-session-id";
        @SuppressWarnings("unchecked")
        SessionRepository<MapSession> sessionRepository =
                mock(SessionRepository.class);
        given(sessionRepository.findById(sessionId))
                .willReturn(new MapSession(sessionId));
        willThrow(new RedisConnectionFailureException("redis unavailable"))
                .given(sessionRepository).deleteById(sessionId);
        SessionRepositoryFilter<MapSession> sessionFilter =
                new SessionRepositoryFilter<>(sessionRepository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(
                "SESSION",
                Base64.getEncoder().encodeToString(sessionId.getBytes(UTF_8))
        ));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestingAuthenticationToken authentication =
                new TestingAuthenticationToken("user", null);
        authentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // When: Spring Session Filter 안에서 best-effort Session 폐기
        sessionFilter.doFilter(request, response, (wrappedRequest, wrappedResponse) ->
                new BrowserSessionInvalidator().invalidateBestEffort(
                        (HttpServletRequest) wrappedRequest,
                        (HttpServletResponse) wrappedResponse
                )
        );

        // Then: Filter 종료 처리의 Cookie 만료와 현재 인증 제거
        assertThat(response.getHeader("Set-Cookie"))
                .contains("SESSION=")
                .contains("Max-Age=0");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
