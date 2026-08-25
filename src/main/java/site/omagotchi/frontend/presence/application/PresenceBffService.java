package site.omagotchi.frontend.presence.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.presence.infrastructure.PresenceHttpService;
import tools.jackson.databind.JsonNode;

/**
 * 재실 현황 BFF.
 *
 * <p>View는 연결을 보유하지 않는다. Browser의 주기적인 heartbeat를 그대로 하류로 넘기고
 * 상태는 전부 Learning의 Redis가 소유한다.
 *
 * <p>Presence 하류 경로는 {@code /cohorts/me/presence}이므로 cohortId가 필요 없다.
 * Learning이 JWT 사용자로부터 ACTIVE 기수를 직접 확정한다.
 */
@Service
@RequiredArgsConstructor
public class PresenceBffService {

    private final PresenceHttpService presenceHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;
    private final PresenceSessionId presenceSessionId;

    public JsonNode getSnapshot(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        return callExecutor.execute(() -> presenceHttpService.getPresence(bearerToken));
    }

    public JsonNode heartbeat(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        String sessionId = presenceSessionId.resolve(request);
        return callExecutor.execute(() -> presenceHttpService.heartbeat(bearerToken, sessionId));
    }

    public void leave(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        String sessionId = presenceSessionId.resolve(request);
        callExecutor.execute(() -> {
            presenceHttpService.leave(bearerToken, sessionId);
            return null;
        });
    }
}
