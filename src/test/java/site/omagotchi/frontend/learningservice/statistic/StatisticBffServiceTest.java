package site.omagotchi.frontend.learningservice.statistic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport;
import site.omagotchi.frontend.learningservice.common.LearningServiceErrorResolver;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.CohortResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberPageResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class StatisticBffServiceTest {

    private static final String BASE_URL = "http://learning-service:8084";

    private StatisticBffService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        StatisticHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(StatisticHttpService.class);
        service = new StatisticBffService(
                httpService,
                new LearningServiceClientSupport(
                        new RestClientCallExecutor(),
                        new LearningServiceErrorResolver(new ApiErrorResponseDecoder())
                )
        );
    }

    @Test
    @DisplayName("활성 MANAGER 소속인 기수만 관리자 화면에 반환한다")
    void filtersManagedCohorts() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(json("""
                        [
                          {"id": 1, "name": "관리 기수", "startDate": "2026-08-01", "endDate": "2026-08-31", "status": "ACTIVE"},
                          {"id": 2, "name": "다른 기수", "startDate": "2026-08-01", "endDate": "2026-08-31", "status": "ACTIVE"}
                        ]
                        """));
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/join-requests/me"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(json("""
                        [
                          {"id": 11, "cohortId": 1, "userId": "00000000-0000-0000-0000-000000000001", "role": "MANAGER", "status": "ACTIVE"},
                          {"id": 12, "cohortId": 2, "userId": "00000000-0000-0000-0000-000000000001", "role": "STUDENT", "status": "ACTIVE"}
                        ]
                        """));

        List<CohortResponse> response = service.getManagedCohorts("access-token");

        assertThat(response).extracting(CohortResponse::id).containsExactly(1L);
        server.verify();
    }

    @Test
    @DisplayName("Learning의 page 객체를 관리자 화면용 평탄 pagination으로 변환한다")
    void flattensMemberPage() {
        server.expect(once(), requestTo(
                        BASE_URL + "/api/v1/cohorts/1/study-statistics/members"
                                + "?window=7d&page=0&size=20&sort=periodStudySeconds%2Cdesc"
                ))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(json("""
                        {
                          "window": "7d",
                          "from": "2026-08-15",
                          "to": "2026-08-21",
                          "calculatedAt": "2026-08-21T04:00:00Z",
                          "items": [
                            {
                              "cohortMembershipId": 11,
                              "userId": "00000000-0000-0000-0000-000000000001",
                              "todayStudySeconds": 600,
                              "periodStudySeconds": 3600,
                              "activeStudyDays": 2,
                              "recordCount": 3,
                              "lastStudiedAt": "2026-08-21T03:00:00Z"
                            }
                          ],
                          "page": {"number": 0, "size": 20, "totalElements": 1, "totalPages": 1}
                        }
                        """));

        MemberPageResponse response = service.getMembers(
                "access-token", 1L, "7d", 0, 20, "periodStudySeconds,desc"
        );

        assertThat(response.page()).isZero();
        assertThat(response.totalPages()).isEqualTo(1);
        assertThat(response.items()).hasSize(1);
        server.verify();
    }

    private static ResponseCreator json(String body) {
        return withStatus(HttpStatus.OK)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}
