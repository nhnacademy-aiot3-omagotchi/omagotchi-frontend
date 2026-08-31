package site.omagotchi.frontend.global.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

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
}
