package site.omagotchi.frontend.presence.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PresenceHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";
    private static final String PRESENCE_SESSION_ID = "presence-session-1";

    private MockRestServiceServer server;
    private PresenceHttpService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(PresenceHttpService.class);
    }

    // Presence 경로는 /cohorts/me/... 이므로 cohortId를 붙이지 않는다.
    // Learning이 JWT 사용자로부터 ACTIVE 기수를 직접 확정한다.
    @Test
    void mapsSnapshotToCurrentUserPresenceEndpoint() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/me/presence"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {"cohortId": 1, "users": [], "occurredAt": "2026-08-25T15:00:00+09:00"}
                        """, MediaType.APPLICATION_JSON));

        JsonNode response = service.getPresence(BEARER);

        assertThat(response.get("cohortId").asInt()).isEqualTo(1);
        server.verify();
    }

    // heartbeat 응답이 곧 최신 snapshot이다. 화면이 조회를 위해 한 번 더 왕복하지 않는다.
    @Test
    void sendsHeartbeatWithPresenceSessionHeaderAndReturnsSnapshot() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/me/presence/heartbeat"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(header(PresenceHttpService.PRESENCE_SESSION_HEADER, PRESENCE_SESSION_ID))
                .andRespond(withSuccess("""
                        {
                          "cohortId": 1,
                          "users": [{"userId": "00000000-0000-0000-0000-000000000001", "status": "ONLINE"}],
                          "occurredAt": "2026-08-25T15:00:00+09:00"
                        }
                        """, MediaType.APPLICATION_JSON));

        JsonNode response = service.heartbeat(BEARER, PRESENCE_SESSION_ID);

        // 값 접근자 이름은 Jackson 버전에 따라 달라진다. 계약 검증이 목적이므로 구조만 본다.
        assertThat(response.get("users").size()).isEqualTo(1);
        assertThat(response.get("cohortId").asInt()).isEqualTo(1);
        server.verify();
    }

    // 이탈 통지는 204를 반환한다. 본문을 기대하면 역직렬화 오류가 하류 계약 오류로 뒤바뀐다.
    @Test
    void sendsLeaveAsDeleteWithPresenceSessionHeader() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/me/presence"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(header(PresenceHttpService.PRESENCE_SESSION_HEADER, PRESENCE_SESSION_ID))
                .andRespond(withNoContent());

        service.leave(BEARER, PRESENCE_SESSION_ID);

        server.verify();
    }
}
