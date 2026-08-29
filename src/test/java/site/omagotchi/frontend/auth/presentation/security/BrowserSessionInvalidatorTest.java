package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class BrowserSessionInvalidatorTest {

    private final BrowserSessionInvalidator invalidator =
            new BrowserSessionInvalidator();

    @Test
    @DisplayName("비밀번호 변경 성공 뒤 HTTP Session과 SecurityContext 제거")
    void invalidatesSessionAndSecurityContext() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(true);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("user", null)
        );

        invalidator.invalidate(request);

        assertThat(session.isInvalid()).isTrue();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
