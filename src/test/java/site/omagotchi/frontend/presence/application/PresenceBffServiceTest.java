package site.omagotchi.frontend.presence.application;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningBffErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.presence.infrastructure.PresenceHttpService;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class PresenceBffServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String BEARER = "Bearer session-access-token";

    private final PresenceHttpService presenceHttpService = mock(PresenceHttpService.class);
    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final PresenceSessionId presenceSessionId = new PresenceSessionId();
    private final PresenceBffService service = new PresenceBffService(
            presenceHttpService,
            new LearningGatewayCallExecutor(mock(ApiErrorResponseDecoder.class)),
            new LearningSessionAuthorization(sessionTokens),
            presenceSessionId
    );

    // Browser는 Presence 세션 식별자를 보내지 않는다. View가 Session에서 확보해 하류로 넘긴다.
    @Test
    void relaysSessionTokenAndServerIssuedPresenceSessionId() {
        MockHttpServletRequest request = authenticatedRequest();
        String expectedSessionId = presenceSessionId.resolve(request);

        service.heartbeat(request);

        verify(presenceHttpService).heartbeat(BEARER, expectedSessionId);
    }

    // 여러 번 호출해도 같은 식별자를 써야 Learning이 재실 1명으로 집계한다.
    @Test
    void keepsPresenceSessionIdStableAcrossHeartbeats() {
        MockHttpServletRequest request = authenticatedRequest();

        service.heartbeat(request);
        service.heartbeat(request);

        String sessionId = presenceSessionId.resolve(request);
        verify(presenceHttpService, times(2)).heartbeat(BEARER, sessionId);
    }

    @Test
    void relaysLeaveWithSamePresenceSessionId() {
        MockHttpServletRequest request = authenticatedRequest();
        String expectedSessionId = presenceSessionId.resolve(request);

        service.leave(request);

        verify(presenceHttpService).leave(BEARER, expectedSessionId);
    }

    // Session Token이 없으면 하류를 호출하기 전에 중단한다.
    @Test
    void stopsBeforeDownstreamCallWhenSessionTokenIsMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());

        assertThatThrownBy(() -> service.heartbeat(request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(LearningBffErrorCode.SESSION_TOKEN_MISSING));
        verify(presenceHttpService, never()).heartbeat(anyString(), anyString());
    }

    private MockHttpServletRequest authenticatedRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                USER_ID,
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2026-08-25T10:00:00Z"),
                "session-refresh-token",
                Instant.parse("2026-09-01T10:00:00Z")
        ));
        return request;
    }
}
