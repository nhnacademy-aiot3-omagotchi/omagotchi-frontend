package site.omagotchi.frontend.global.learning.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import tools.jackson.databind.JsonNode;
import site.omagotchi.frontend.cohort.infrastructure.response.UserAccessContextResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSelectableLabResponse;
import site.omagotchi.frontend.study.infrastructure.request.LearningCreateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.request.LearningUpdateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.response.LearningCurrentTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudyRecordsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningMonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStartTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStudyRecordResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningTimerState;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.time.LocalDateTime;
import java.time.YearMonth;
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

class LearningHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";
    private static final UUID STUDY_RECORD_ID = UUID.fromString(
            "10000000-0000-0000-0000-000000000001"
    );
    private static final UUID TIMER_RUN_ID = UUID.fromString(
            "20000000-0000-0000-0000-000000000001"
    );
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
    @DisplayName("내 접근 컨텍스트 경로와 응답 계약을 사용한다")
    void getsMyAccessContext() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/me/access-context"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "globalRole": "USER",
                          "accessType": "COHORT_MANAGER",
                          "managedCohorts": [{
                            "cohortId": 7,
                            "name": "AIoT 3기",
                            "startDate": "2026-09-01",
                            "endDate": "2026-12-31",
                            "status": "PREPARING"
                          }],
                          "studentCohorts": []
                        }
                        """, MediaType.APPLICATION_JSON));

        UserAccessContextResponse response = service.getMyAccessContext(BEARER);

        assertThat(response.isCohortManager()).isTrue();
        assertThat(response.managedCohorts()).extracting("cohortId").containsExactly(7L);
        assertThat(response.managedCohorts().getFirst().status()).isEqualTo("PREPARING");
        server.verify();
    }

    @Test
    @DisplayName("선택 가능 실습실 경로와 정원 응답 계약을 사용한다")
    void getsSelectableLabs() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/spaces/labs"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        [{
                          "spaceId": 11,
                          "name": "3기 실습실",
                          "capacity": 2,
                          "reservedCount": 2
                        }]
                        """, MediaType.APPLICATION_JSON));

        ResponseEntity<List<LearningSelectableLabResponse>> response =
                service.getSelectableLabs(BEARER, 7L);

        assertThat(response.getBody()).singleElement().satisfies(lab -> {
            assertThat(lab.spaceId()).isEqualTo(11L);
            assertThat(lab.capacity()).isEqualTo(2);
            assertThat(lab.reservedCount()).isEqualTo(2L);
        });
        server.verify();
    }

    @Nested
    @DisplayName("커뮤니티 계약")
    class CommunityContract {

        @Test
        @DisplayName("첨부파일 본문과 헤더를 전달한다")
        void relaysAttachmentBodyAndDownloadHeaders() throws IOException {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/community/posts/11/attachments/29"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(request -> withSuccess("attachment-content", MediaType.TEXT_PLAIN)
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=note.txt")
                            .createResponse(request));

            ResponseEntity<Resource> response =
                    service.downloadCommunityAttachment(BEARER, 11L, 29L);

            String contentDisposition = response.getHeaders()
                    .getFirst(HttpHeaders.CONTENT_DISPOSITION);
            Resource body = response.getBody();
            assertThat(contentDisposition).contains("note.txt");
            assertThat(body).isNotNull();
            assertThat(body.getContentAsString(StandardCharsets.UTF_8))
                    .isEqualTo("attachment-content");
            server.verify();
        }
    }

    @Nested
    @DisplayName("게이미피케이션 계약")
    class GamificationContract {

        @Test
        @DisplayName("일일 퀘스트 조회 경로와 Bearer Token을 전달한다")
        void mapsDailyQuestPath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/gamification/quests/daily"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            [{
                              "id": 42,
                              "type": "ROUTINE",
                              "code": "ATTENDANCE",
                              "title": "출석하기",
                              "targetCount": 1,
                              "progressCount": 1,
                              "rewardXp": 20,
                              "status": "COMPLETED"
                            }]
                            """, MediaType.APPLICATION_JSON));

            JsonNode response = service.getDailyQuests(BEARER);

            assertThat(response).hasSize(1);
            assertThat(response.get(0).get("id").asLong()).isEqualTo(42L);
            assertThat(response.get(0).get("status").asString()).isEqualTo("COMPLETED");
            server.verify();
        }

        // Learning의 aggregationDate는 required=false다. View가 더 엄격하면 정상 요청을 막는다.
        @Test
        @DisplayName("집계일 미지정 요청을 전달한다")
        void omitsOptionalAggregationDateFromProgressionQuery() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/gamification/progression?cohortId=7"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"level\": 3}", MediaType.APPLICATION_JSON));

            service.getProgression(BEARER, 7L, null);

            server.verify();
        }

        @Test
        @DisplayName("집계일 지정 요청을 전달한다")
        void includesAggregationDateWhenProvided() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/gamification/progression?cohortId=7&aggregationDate=2026-08-21"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"level\": 3}", MediaType.APPLICATION_JSON));

            service.getProgression(BEARER, 7L, LocalDate.of(2026, 8, 21).toString());

            server.verify();
        }

        // Learning은 Quest 정의 ID가 아니라 사용자별 일일 Quest 인스턴스 ID를 Path로 받는다.
        @Test
        @DisplayName("일일 퀘스트 인스턴스 경로를 사용한다")
        void mapsUserDailyQuestIdToClaimPath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/gamification/quests/42/claim"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"status\": \"CLAIMED\"}", MediaType.APPLICATION_JSON));

            service.claimQuest(BEARER, 42L);

            server.verify();
        }
    }

    @Nested
    @DisplayName("랭킹 계약")
    class RankingContract {

        @Test
        @DisplayName("오늘 랭킹 경로를 사용한다")
        void mapsTodayStudyRankingPathWithoutOptionalMaxRank() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-rankings/today"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"entries\": []}", MediaType.APPLICATION_JSON));

            service.getTodayStudyRankings(BEARER, 7L, null);

            server.verify();
        }

        @Test
        @DisplayName("일간 랭킹 경로를 사용한다")
        void mapsDailyStudyRankingPath() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-rankings/daily/2026-08-24?maxRank=10"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"entries\": []}", MediaType.APPLICATION_JSON));

            service.getDailyStudyRankings(BEARER, 7L, "2026-08-24", 10);

            server.verify();
        }

        @Test
        @DisplayName("주간 랭킹 경로를 사용한다")
        void mapsWeeklyStudyRankingPath() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-rankings/weekly/2026-08-24?maxRank=20"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"entries\": []}", MediaType.APPLICATION_JSON));

            service.getWeeklyStudyRankings(BEARER, 7L, "2026-08-24", 20);

            server.verify();
        }

        @Test
        @DisplayName("월간 랭킹 경로를 사용한다")
        void mapsMonthlyStudyRankingPath() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-rankings/monthly/2026-08?maxRank=30"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"entries\": []}", MediaType.APPLICATION_JSON));

            service.getMonthlyStudyRankings(BEARER, 7L, "2026-08", 30);

            server.verify();
        }
    }

    @Nested
    @DisplayName("학습 기록 계약")
    class StudyRecordContract {

        @Test
        @DisplayName("기록과 월 요약 조회 경로를 사용한다")
        void mapsStudyRecordAndSummaryReadPaths() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-records/" + STUDY_RECORD_ID))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess(studyRecordBody(2L), MediaType.APPLICATION_JSON));
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-records?date=2026-08-24"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            {
                              "aggregationDate": "2026-08-24",
                              "totalStudySeconds": 0,
                              "records": []
                            }
                            """, MediaType.APPLICATION_JSON));
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-time-summaries?month=2026-08"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            {
                              "aggregationMonth": "2026-08",
                              "totalStudySeconds": 0,
                              "dailyTotals": []
                            }
                            """, MediaType.APPLICATION_JSON));

            ResponseEntity<LearningStudyRecordResponse> studyRecord = service.getStudyRecord(
                    BEARER, 7L, STUDY_RECORD_ID);
            ResponseEntity<LearningDailyStudyRecordsResponse> daily =
                    service.getDailyStudyRecords(BEARER, 7L, "2026-08-24");
            ResponseEntity<LearningMonthlyStudySecondsResponse> monthly =
                    service.getMonthlyStudyTimeSummary(BEARER, 7L, "2026-08");

            assertThat(studyRecord.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.id()).isEqualTo(STUDY_RECORD_ID));
            assertThat(daily.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.aggregationDate()).isEqualTo(LocalDate.of(2026, 8, 24)));
            assertThat(monthly.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.aggregationMonth()).isEqualTo(YearMonth.of(2026, 8)));

            server.verify();
        }

        @Test
        @DisplayName("기록 생성과 수정 계약을 전달한다")
        void mapsStudyRecordCreateAndUpdateContracts() {
            LearningCreateStudyRecordRequest createRequest =
                    new LearningCreateStudyRecordRequest(
                            LocalDateTime.of(2026, 8, 24, 23, 30),
                            LocalDateTime.of(2026, 8, 25, 0, 30)
                    );
            LearningUpdateStudyRecordRequest updateRequest =
                    new LearningUpdateStudyRecordRequest(
                            LocalDateTime.of(2026, 8, 24, 23, 40),
                            LocalDateTime.of(2026, 8, 25, 0, 40),
                            2L
                    );

            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-records"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andExpect(content().json("""
                            {
                              "startDateTime": "2026-08-24T23:30",
                              "endDateTime": "2026-08-25T00:30"
                            }
                            """))
                    .andRespond(withStatus(HttpStatus.CREATED)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(studyRecordBody(2L)));
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-records/" + STUDY_RECORD_ID))
                    .andExpect(method(HttpMethod.PUT))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andExpect(content().json("""
                            {
                              "startDateTime": "2026-08-24T23:40",
                              "endDateTime": "2026-08-25T00:40",
                              "expectedVersion": 2
                            }
                            """))
                    .andRespond(withSuccess(studyRecordBody(3L), MediaType.APPLICATION_JSON));

            ResponseEntity<LearningStudyRecordResponse> created = service.createStudyRecord(
                    BEARER, 7L, createRequest
            );
            ResponseEntity<LearningStudyRecordResponse> updated = service.updateStudyRecord(
                    BEARER, 7L, STUDY_RECORD_ID, updateRequest
            );

            assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(updated.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.version()).isEqualTo(3L));

            server.verify();
        }

        @Test
        @DisplayName("삭제 버전 헤더를 전달한다")
        void relaysResourceVersionWhenDeletingStudyRecord() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/study-records/" + STUDY_RECORD_ID))
                    .andExpect(method(HttpMethod.DELETE))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andExpect(header("X-RESOURCE-VERSION", "3"))
                    .andRespond(withNoContent());

            ResponseEntity<Void> response = service.deleteStudyRecord(
                    BEARER, 7L, STUDY_RECORD_ID, 3L
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

            server.verify();
        }
    }

    @Nested
    @DisplayName("학습 타이머 계약")
    class StudyTimerContract {

        @Test
        @DisplayName("타이머 조회와 시작 계약을 전달한다")
        void mapsTimerReadAndStartContracts() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/timer"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            {
                              "state": "STOPPED",
                              "timerRunId": null,
                              "startedAt": null,
                              "elapsedSeconds": 0
                            }
                            """, MediaType.APPLICATION_JSON));
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/timer/start"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withStatus(HttpStatus.CREATED)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body("""
                                    {
                                      "resultCode": "TIMER_STARTED",
                                      "timerRunId": "%s",
                                      "state": "RUNNING",
                                      "startedAt": "2026-08-24T14:30:00Z",
                                      "elapsedSeconds": 0
                                    }
                                    """.formatted(TIMER_RUN_ID)));

            ResponseEntity<LearningCurrentTimerResponse> current =
                    service.getCurrentTimer(BEARER, 7L);
            ResponseEntity<LearningStartTimerResponse> started =
                    service.startTimer(BEARER, 7L);

            assertThat(current.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.state()).isEqualTo(LearningTimerState.STOPPED));
            assertThat(started.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(started.getBody()).isNotNull().satisfies(body ->
                    assertThat(body.timerRunId()).isEqualTo(TIMER_RUN_ID));

            server.verify();
        }

        @Test
        @DisplayName("타이머 종료와 폐기 계약을 전달한다")
        void mapsTimerStopAndDiscardContracts() {
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/timer/" + TIMER_RUN_ID + "/stop"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withNoContent());
            server.expect(once(), requestTo(BASE_URL
                            + "/api/v1/cohorts/7/timer/" + TIMER_RUN_ID + "/discard"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withNoContent());

            service.stopTimer(BEARER, 7L, TIMER_RUN_ID);
            service.discardTimer(BEARER, 7L, TIMER_RUN_ID);

            server.verify();
        }
    }

    @Nested
    @DisplayName("관리자 기수 계약")
    class AdminCohortContract {

        @Test
        @DisplayName("기수 요약 경로를 사용한다")
        void mapsSystemAdminCohortSummaryPath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/admin-summary"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

            service.getAdminCohortSummaries(BEARER);

            server.verify();
        }

        @Test
        @DisplayName("준비 기수 삭제 경로를 사용한다")
        void mapsPreparingCohortDeletePath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7"))
                    .andExpect(method(HttpMethod.DELETE))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withNoContent());

            service.deleteCohort(BEARER, 7L);

            server.verify();
        }
    }

    @Nested
    @DisplayName("관리자 공부 통계 계약")
    class AdminStudyStatisticsContract {

        @Test
        @DisplayName("오늘 요약과 추이 조회를 전달한다")
        void mapsTodayAndTrendStatisticsPath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-statistics/today"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            {"totalStudySeconds": 3600, "runningTimerCount": 2}
                            """, MediaType.APPLICATION_JSON));

            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-statistics/trend?window=7d"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"totalStudySeconds\": 25200}", MediaType.APPLICATION_JSON));

            JsonNode today = service.getStudyStatisticsToday(BEARER, 7L);
            service.getStudyStatisticsTrend(BEARER, 7L, "7d");

            assertThat(today.get("runningTimerCount").asLong()).isEqualTo(2L);
            server.verify();
        }

        @Test
        @DisplayName("수강생 목록과 세부 통계 조회를 전달한다")
        void mapsMembersAndDetailStatisticsPath() {
            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-statistics/members?window=7d&page=0&size=20&sort=periodStudySeconds%2Cdesc"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("""
                            {
                              "items": [{
                                "nickname": "오마",
                                "isRunning": true,
                                "timerStartedAt": "2026-08-25T02:00:00Z"
                              }]
                            }
                            """, MediaType.APPLICATION_JSON));

            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-statistics/members/10/overview?window=7d"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"cohortMembershipId\": 10}", MediaType.APPLICATION_JSON));

            server.expect(once(), requestTo(BASE_URL + "/api/v1/cohorts/7/study-statistics/members/10/records?date=2026-08-25"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                    .andRespond(withSuccess("{\"records\": []}", MediaType.APPLICATION_JSON));

            JsonNode members = service.getStudyStatisticsMembers(
                    BEARER,
                    7L,
                    "7d",
                    0,
                    20,
                    "periodStudySeconds,desc"
            );
            service.getStudyStatisticsMemberOverview(BEARER, 7L, 10L, "7d");
            service.getStudyStatisticsMemberDailyRecords(BEARER, 7L, 10L, "2026-08-25");

            JsonNode member = members.get("items").get(0);
            assertThat(member.get("nickname").asString()).isEqualTo("오마");
            assertThat(member.get("isRunning").asBoolean()).isTrue();
            assertThat(member.get("timerStartedAt").asString())
                    .isEqualTo("2026-08-25T02:00:00Z");
            server.verify();
        }
    }

    private static String studyRecordBody(long version) {
        return """
                {
                  "id": "%s",
                  "aggregationDate": "2026-08-24",
                  "startTime": "2026-08-24T14:30:00Z",
                  "endTime": "2026-08-24T15:30:00Z",
                  "studySeconds": 3600,
                  "version": %d,
                  "createdAt": "2026-08-24T14:30:00Z",
                  "updatedAt": "2026-08-24T15:30:00Z"
                }
                """.formatted(STUDY_RECORD_ID, version);
    }
}
