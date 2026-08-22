package site.omagotchi.frontend.learningservice.ranking;

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
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayMemberRankingResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class RankingBffServiceTest {

    private static final String BASE_URL = "http://learning-service:8084";

    private RankingBffService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        RankingHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(RankingHttpService.class);
        service = new RankingBffService(
                httpService,
                new LearningServiceClientSupport(
                        new RestClientCallExecutor(),
                        new LearningServiceErrorResolver(new ApiErrorResponseDecoder())
                )
        );
    }

    @Test
    @DisplayName("오늘 개인 랭킹을 실제 Learning 경로와 Bearer JWT로 조회한다")
    void getsTodayMemberRankingWithBearerToken() {
        server.expect(once(), requestTo(
                        BASE_URL + "/api/v1/cohorts/3/study-rankings/today?maxRank=10"
                ))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "aggregationDate": "2026-08-21",
                                  "calculatedAt": "2026-08-21T04:00:00Z",
                                  "rankedMemberCount": 1,
                                  "returnedEntryCount": 1,
                                  "entries": [
                                    {"rank": 1, "displayName": "학습자", "studySeconds": 3600, "timerRunning": true}
                                  ],
                                  "myRanking": {
                                    "ranked": true,
                                    "ranking": {"rank": 1, "displayName": "학습자", "studySeconds": 3600, "timerRunning": true}
                                  }
                                }
                                """));

        TodayMemberRankingResponse response = service.getTodayMembers(
                "access-token", 3L, 10
        );

        assertThat(response.entries()).hasSize(1);
        assertThat(response.entries().getFirst().timerRunning()).isTrue();
        server.verify();
    }
}
