package site.omagotchi.frontend.presence.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import tools.jackson.databind.JsonNode;

/**
 * Learning의 재실 현황 계약.
 *
 * <p>Presence는 WebSocket이 아니라 주기적인 REST heartbeat와 Learning의 Redis TTL로 유지한다.
 * heartbeat 응답이 곧 최신 snapshot이므로 화면이 조회를 위해 한 번 더 왕복하지 않는다.
 */
@HttpExchange("/api/v1")
public interface PresenceHttpService {

    /**
     * 호출자가 소유한 Presence 세션 식별자.
     *
     * <p>Browser가 아니라 View가 생성해 Session에 보관하고 이 Header로만 전달한다.
     * Browser 입력으로 받으면 남의 재실 세션을 조작할 수 있다.
     */
    String PRESENCE_SESSION_HEADER = "X-Presence-Session";

    @GetExchange("/cohorts/me/presence")
    JsonNode getPresence(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    /**
     * 최초 호출은 세션 등록, 이후 호출은 TTL 연장으로 동작한다. 응답은 현재 snapshot이다.
     */
    @PostExchange("/cohorts/me/presence/heartbeat")
    JsonNode heartbeat(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
    );

    /**
     * 이탈 통지. 실패해도 heartbeat가 멈추면 TTL로 정리되므로 재시도하지 않는다.
     */
    @DeleteExchange("/cohorts/me/presence")
    void leave(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(PRESENCE_SESSION_HEADER) String presenceSessionId
    );
}
