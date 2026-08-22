package site.omagotchi.frontend.learningservice.study;

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
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport;
import site.omagotchi.frontend.learningservice.common.LearningServiceErrorResolver;
import site.omagotchi.frontend.learningservice.study.StudyModels.MonthlyStudySecondsResponse;

import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class StudyBffServiceTest {

    private static final String BASE_URL = "http://learning-service:8084";

    private StudyBffService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        StudyHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(StudyHttpService.class);
        service = new StudyBffService(
                httpService,
                new LearningServiceClientSupport(
                        new RestClientCallExecutor(),
                        new LearningServiceErrorResolver(new ApiErrorResponseDecoder())
                )
        );
    }

    @Test
    @DisplayName("월간 공부 요약은 Session Access JWT와 실제 Learning 경로로 호출한다")
    void getsMonthlySummaryWithBearerToken() {
        server.expect(once(), requestTo(
                        BASE_URL + "/api/v1/cohorts/7/study-time-summaries?month=2026-08"
                ))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "aggregationMonth": "2026-08",
                                  "totalStudySeconds": 3600,
                                  "dailyTotals": [
                                    {"aggregationDate": "2026-08-20", "studySeconds": 3600}
                                  ]
                                }
                                """));

        MonthlyStudySecondsResponse response = service.getMonthlyStudySeconds(
                "access-token", 7L, YearMonth.of(2026, 8)
        );

        assertThat(response.totalStudySeconds()).isEqualTo(3600L);
        assertThat(response.dailyTotals()).hasSize(1);
        server.verify();
    }
}
