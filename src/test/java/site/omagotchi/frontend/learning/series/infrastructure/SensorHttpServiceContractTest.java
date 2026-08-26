package site.omagotchi.frontend.learning.series.infrastructure;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestToUriTemplate;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SensorHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

    private MockRestServiceServer server;
    private SensorHttpService service;

    @BeforeEach
    void setUp() {
        // 가짜 서버를 RestClient에 붙이고, 그 RestClient로 인터페이스의 실제 구현을 만든다
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(SensorHttpService.class);
    }

    @Test
    @DisplayName("공간 시계열 조회는 인증 헤더와 파라미터 3개를 붙여 GET으로 나간다")
    void mapsSpaceSeriesRequestToSensorEndpoint() {
        // given: 가짜 서버에 "이런 요청이 와야 하고, 오면 이렇게 응답해라"를 등록한다
        server.expect(once(), requestToUriTemplate(BASE_URL
                                + "/api/v1/sensors/space-series?location={l}&measurement={m}&window={w}",
                        "study-room-1", "co2", "DAY"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(queryParam("location", "study-room-1"))
                .andExpect(queryParam("measurement", "co2"))
                .andExpect(queryParam("window", "DAY"))
                .andRespond(withSuccess("""
                        {"location": "study-room-1", "sensorCount": 2, "points": []}
                        """, MediaType.APPLICATION_JSON));

        // when
        JsonNode response = service.getSpaceSeries(BEARER, "study-room-1", "co2", "DAY");

        // then: 응답 JSON이 그대로 우리 손에 들어온다
        assertThat(response.get("location").asString()).isEqualTo("study-room-1");
        assertThat(response.get("sensorCount").asInt()).isEqualTo(2);

        // 등록해둔 기대 요청이 실제로 왔는지 최종 확인
        server.verify();
    }
}