package site.omagotchi.frontend.presence.application;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.learning.application.LearningBffErrorCode;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PresenceSessionIdTest {

    private final PresenceSessionId presenceSessionId = new PresenceSessionId();

    @Test
    void createsSessionScopedIdentifierOnFirstResolve() {
        MockHttpServletRequest request = requestWithSession();

        String resolved = presenceSessionId.resolve(request);

        assertThat(resolved).isNotBlank();
        // 값 자체가 UUID여야 추측이 불가능하다.
        assertThat(UUID.fromString(resolved)).isNotNull();
    }

    // 같은 Session이면 여러 탭·여러 요청이 같은 식별자를 쓴다. 그래야 재실 1명으로 집계된다.
    @Test
    void reusesSameIdentifierWithinSameSession() {
        MockHttpServletRequest request = requestWithSession();

        String first = presenceSessionId.resolve(request);
        String second = presenceSessionId.resolve(request);

        assertThat(second).isEqualTo(first);
    }

    @Test
    void isolatesIdentifierBetweenDifferentSessions() {
        String first = presenceSessionId.resolve(requestWithSession());
        String second = presenceSessionId.resolve(requestWithSession());

        assertThat(second).isNotEqualTo(first);
    }

    // Session을 새로 만들지 않는다. 인증 없는 요청에 식별자를 발급하면 재실이 오염된다.
    @Test
    void rejectsRequestWithoutSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> presenceSessionId.resolve(request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(LearningBffErrorCode.SESSION_TOKEN_MISSING));
        assertThat(request.getSession(false)).isNull();
    }

    private static MockHttpServletRequest requestWithSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        return request;
    }
}
