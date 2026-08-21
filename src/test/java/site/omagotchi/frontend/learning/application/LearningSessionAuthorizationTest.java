package site.omagotchi.frontend.learning.application;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LearningSessionAuthorizationTest {

    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final LearningSessionAuthorization authorization =
            new LearningSessionAuthorization(sessionTokens);

    @Test
    void relaysSessionAccessTokenAsBearerHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2026-08-20T10:00:00Z"),
                "session-refresh-token",
                Instant.parse("2026-08-27T10:00:00Z")
        ));

        assertThat(authorization.bearerToken(request))
                .isEqualTo("Bearer session-access-token");
        assertThat(authorization.userId(request))
                .isEqualTo("00000000-0000-0000-0000-000000000001");
    }

    @Test
    void rejectsRequestWithoutSessionToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> authorization.bearerToken(request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(LearningBffErrorCode.SESSION_TOKEN_MISSING));
    }
}
