package site.omagotchi.frontend.learning.sensor.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SensorAdminHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";
    private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

    private MockRestServiceServer server;
    private SensorAdminHttpService service;

    @BeforeEach
    void setUp() {
        // Mock Server를 붙인 RestClient로 HTTP Service Interface의 실제 구현 생성
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(SensorAdminHttpService.class);
    }

    @Test
    @DisplayName("공간 임계치 변경은 인증과 요청 식별자를 Learning 계약으로 전달")
    void mapsSpaceThresholdUpdateToLearningEndpoint() {
        // Given: 공간 임계치 요청과 Learning Endpoint 기대 계약
        JsonNode request = JSON_MAPPER.createObjectNode()
                .put("measurement", "co2")
                .put("warningThreshold", 1000);

        server.expect(once(), requestTo(BASE_URL + "/api/v1/threshold-rules/spaces/7"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(header("X-Request-ID", "request-123"))
                .andExpect(content().json(request.toString()))
                .andRespond(withSuccess("{\"spaceId\":7}", MediaType.APPLICATION_JSON));

        // When: 실제 HTTP Service Interface 호출
        JsonNode response = service.applySpaceThreshold(BEARER, 7L, "request-123", request);

        // Then: 응답 역직렬화와 요청 계약 충족
        assertThat(response.get("spaceId").asLong()).isEqualTo(7L);
        server.verify();
    }
}
