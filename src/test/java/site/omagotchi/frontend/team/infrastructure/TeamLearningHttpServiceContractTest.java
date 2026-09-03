package site.omagotchi.frontend.team.infrastructure;

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
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddTeamMemberRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningCreateTeamRequest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TeamLearningHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

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

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("팀 생성 HTTP 계약은 POST 경로·Bearer·요청 본문·201 응답을 사용한다")
    void mapsCreateTeamContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"cohortId\":3,\"name\":\"백엔드 팀\"}"))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(teamBody()));

        var response = service.createTeam(
                BEARER, new LearningCreateTeamRequest(3L, "백엔드 팀"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull().satisfies(team ->
                assertThat(team.teamId()).isEqualTo(10L));
    }

    @Test
    @DisplayName("내 팀 목록 HTTP 계약은 GET /teams/me 경로를 사용한다")
    void mapsMyTeamsContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/me"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("[" + teamBody() + "]", MediaType.APPLICATION_JSON));

        var response = service.getMyTeams(BEARER);

        assertThat(response.getBody()).singleElement().satisfies(team ->
                assertThat(team.cohortId()).isEqualTo(3L));
    }

    @Test
    @DisplayName("팀 상세 HTTP 계약은 요청자 필드와 userId 없는 팀원 응답을 역직렬화한다")
    void mapsTeamDetailContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/10"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "teamId": 10,
                          "cohortId": 3,
                          "name": "백엔드 팀",
                          "createdAt": "2026-09-02T09:00:00+09:00",
                          "memberCount": 1,
                          "myMemberId": 101,
                          "myRole": "MASTER",
                          "members": [{
                            "memberId": 101,
                            "displayName": "요청자",
                            "role": "MASTER",
                            "joinedAt": "2026-09-02T09:00:00+09:00"
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        var response = service.getTeam(BEARER, 10L);

        assertThat(response.getBody()).isNotNull().satisfies(team -> {
            assertThat(team.myMemberId()).isEqualTo(101L);
            assertThat(team.myRole()).isEqualTo("MASTER");
            assertThat(team.members()).singleElement().satisfies(member ->
                    assertThat(member.memberId()).isEqualTo(101L));
        });
    }

    @Test
    @DisplayName("팀원 후보 HTTP 계약은 검색어를 query로 전달하고 후보 userId를 역직렬화한다")
    void mapsMemberCandidateContract() {
        UUID targetUserId = UUID.randomUUID();
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/teams/10/member-candidates?query=student%40example.com"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        [{
                          "userId": "%s",
                          "displayName": "학생",
                          "email": "student@example.com",
                          "status": "AVAILABLE"
                        }]
                        """.formatted(targetUserId), MediaType.APPLICATION_JSON));

        var response = service.searchTeamMemberCandidates(
                BEARER, 10L, "student@example.com");

        assertThat(response.getBody()).singleElement().satisfies(candidate -> {
            assertThat(candidate.userId()).isEqualTo(targetUserId);
            assertThat(candidate.status()).isEqualTo("AVAILABLE");
        });
    }

    @Test
    @DisplayName("팀원 추가 HTTP 계약은 targetUserId 본문과 POST /members 경로를 사용한다")
    void mapsAddMemberContract() {
        UUID targetUserId = UUID.randomUUID();
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/10/members"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"targetUserId\":\"" + targetUserId + "\"}"))
                .andRespond(withStatus(HttpStatus.CREATED));

        var response = service.addTeamMember(
                BEARER, 10L, new LearningAddTeamMemberRequest(targetUserId));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("팀원 제외 HTTP 계약은 memberId를 사용하는 DELETE /members 경로다")
    void mapsKickMemberContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/10/members/102"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        assertThat(service.kickTeamMember(BEARER, 10L, 102L).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("팀 탈퇴 HTTP 계약은 POST /leave 경로를 사용한다")
    void mapsLeaveTeamContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/10/leave"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        assertThat(service.leaveTeam(BEARER, 10L).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("마스터 위임 HTTP 계약은 memberId를 사용하는 POST /delegate 경로다")
    void mapsDelegateMasterContract() {
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/teams/10/members/102/delegate"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        assertThat(service.delegateTeamMaster(BEARER, 10L, 102L).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("팀 해체 HTTP 계약은 DELETE /teams/{teamId} 경로를 사용한다")
    void mapsDisbandTeamContract() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/teams/10"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withNoContent());

        assertThat(service.disbandTeam(BEARER, 10L).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    private static String teamBody() {
        return """
                {
                  "teamId": 10,
                  "cohortId": 3,
                  "name": "백엔드 팀",
                  "createdAt": "2026-09-02T09:00:00+09:00"
                }
                """;
    }
}
