package site.omagotchi.frontend.space.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.series.infrastructure.SensorHttpService;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LearningRestSpaceEnvironmentClientTest {

    private static final String BASE_URL = "http://learning-service:8080";
    private static final String BEARER_TOKEN = "Bearer access-token";
    private static final String PATH = BASE_URL + "/api/v1/cohorts/3/sensors/environment";

    private LearningRestSpaceEnvironmentClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        SensorHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(SensorHttpService.class);
        client = new LearningRestSpaceEnvironmentClient(
                httpService,
                new LearningGatewayCallExecutor(new ApiErrorResponseDecoder())
        );
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("기수 경로로 조회해 공간별 값으로 옮긴다")
    void mapsEnvironmentsBySpace() {
        server.expect(once(), requestTo(PATH))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER_TOKEN))
                .andRespond(withSuccess("""
                        [
                          {"spaceId": 101, "co2": 612.4, "temperature": 23.4,
                           "humidity": 48.0, "measuredAt": "2026-09-04T10:25:00Z", "deviceCount": 2},
                          {"spaceId": 102, "co2": null, "temperature": null,
                           "humidity": null, "measuredAt": null, "deviceCount": 0}
                        ]
                        """, MediaType.APPLICATION_JSON));

        List<SpaceEnvironmentView> views = client.findByCohort(BEARER_TOKEN, 3L);

        assertThat(views).hasSize(2);
        assertThat(views.getFirst().co2()).isEqualTo(612.4);
        assertThat(views.getFirst().measuredAt()).isEqualTo(Instant.parse("2026-09-04T10:25:00Z"));
        assertThat(views.getFirst().deviceCount()).isEqualTo(2);
        // 값이 없는 공간도 남는다 — 센서가 없다는 사실을 화면이 말해야 한다
        assertThat(views.get(1).co2()).isNull();
        assertThat(views.get(1).deviceCount()).isZero();
    }

    @Test
    @DisplayName("공간을 가리키지 않는 항목은 버린다")
    void dropsEntriesWithoutSpaceId() {
        server.expect(once(), requestTo(PATH))
                .andRespond(withSuccess("""
                        [
                          {"spaceId": null, "co2": 600.0, "temperature": 23.0,
                           "humidity": 45.0, "measuredAt": "2026-09-04T10:25:00Z", "deviceCount": 1},
                          {"spaceId": 101, "co2": 612.4, "temperature": 23.4,
                           "humidity": 48.0, "measuredAt": "2026-09-04T10:25:00Z", "deviceCount": 1}
                        ]
                        """, MediaType.APPLICATION_JSON));

        List<SpaceEnvironmentView> views = client.findByCohort(BEARER_TOKEN, 3L);

        assertThat(views).extracting(SpaceEnvironmentView::spaceId).containsExactly(101L);
    }

    @Test
    @DisplayName("본문이 비면 하류 응답 오류로 끊는다")
    void rejectsMissingBody() {
        server.expect(once(), requestTo(PATH))
                .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.findByCohort(BEARER_TOKEN, 3L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("하류 4xx는 상태를 보존해 올린다")
    void preservesDownstreamStatus() {
        // 세션이 끊긴 것은 화면이 다시 로그인시켜야 하므로 삼키지 않는다
        server.expect(once(), requestTo(PATH))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"code": "UNAUTHORIZED", "message": "로그인이 필요합니다.",
                                 "path": "/api/v1/cohorts/3/sensors/environment"}
                                """));

        assertThatThrownBy(() -> client.findByCohort(BEARER_TOKEN, 3L))
                .isInstanceOfSatisfying(LearningDownstreamException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    @DisplayName("연결 실패는 서비스 불가로 바꾼다")
    void mapsTransportFailureToServiceUnavailable() {
        server.expect(once(), requestTo(PATH))
                .andRespond(request -> {
                    throw new java.net.ConnectException("connection refused");
                });

        assertThatThrownBy(() -> client.findByCohort(BEARER_TOKEN, 3L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE));
    }
}
