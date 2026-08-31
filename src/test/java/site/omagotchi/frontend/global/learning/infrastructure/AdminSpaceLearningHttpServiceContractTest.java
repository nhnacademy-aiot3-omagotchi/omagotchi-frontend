package site.omagotchi.frontend.global.learning.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseActions;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.learning.infrastructure.request.LearningDeactivateSpaceRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningUpdateSpaceRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AdminSpaceLearningHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";
    private static final LearningSpaceMutationRequest PAYLOAD =
            new LearningSpaceMutationRequest("회의실 A", "MEETING", 8, 1L);
    private static final LearningUpdateSpaceRequest UPDATE =
            new LearningUpdateSpaceRequest("회의실 A", "MEETING", 8);

    private MockRestServiceServer server;
    private LearningHttpService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(LearningHttpService.class);
    }

    @Test
    void mapsCreate() {
        expectJson(HttpMethod.POST, "/api/v1/admin/spaces", """
                {"name":"회의실 A","type":"MEETING","capacity":8,"cohortId":1}
                """).andRespond(withStatus(HttpStatus.CREATED)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"id\":3}"));

        assertThat(service.createSpace(BEARER, PAYLOAD).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
        server.verify();
    }

    @Test
    void mapsUpdate() {
        expectJson(HttpMethod.PUT, "/api/v1/admin/spaces/3", """
                {"name":"회의실 A","type":"MEETING","capacity":8}
                """).andRespond(withSuccess("{\"id\":3}", MediaType.APPLICATION_JSON));

        service.updateSpace(BEARER, 3L, UPDATE);
        server.verify();
    }

    @Test
    void mapsActivate() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/admin/spaces/3/activate"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("{\"operationalStatus\":\"ACTIVE\"}", MediaType.APPLICATION_JSON));

        service.activateSpace(BEARER, 3L);
        server.verify();
    }

    @Test
    void mapsDeactivateBody() {
        expectJson(HttpMethod.POST, "/api/v1/admin/spaces/3/deactivate", """
                {"inactiveReason":"정기 점검"}
                """).andRespond(withSuccess("{\"operationalStatus\":\"INACTIVE\"}", MediaType.APPLICATION_JSON));

        service.deactivateSpace(BEARER, 3L, new LearningDeactivateSpaceRequest("정기 점검"));
        server.verify();
    }

    @Test
    void mapsDelete() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/admin/spaces/3"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        service.deleteSpace(BEARER, 3L);
        server.verify();
    }

    @Test
    void mapsAssignCohortForAnySpaceType() {
        expectJson(HttpMethod.PUT, "/api/v1/admin/spaces/3/cohort", """
                {"cohortId":1}
                """).andRespond(withSuccess("{\"cohortId\":1}", MediaType.APPLICATION_JSON));

        service.assignSpaceCohort(BEARER, 3L, new LearningAssignSpaceCohortRequest(1L));
        server.verify();
    }

    @Test
    void mapsUnassignCohort() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/admin/spaces/3/cohort"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        service.unassignSpaceCohort(BEARER, 3L);
        server.verify();
    }

    private ResponseActions expectJson(
            HttpMethod httpMethod,
            String path,
            String body
    ) {
        return server.expect(once(), requestTo(BASE_URL + path))
                .andExpect(method(httpMethod))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json(body));
    }
}
