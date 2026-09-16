package site.omagotchi.frontend.statistics.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.restdocs.request.ParameterDescriptor;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultHandler;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(AdminStudyStatisticsBffController.class)
class StudyStatisticsBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LearningProxyBffService proxy;

    @Test
    @DisplayName("오늘 학습 통계 조회")
    void documentsToday() throws Exception {
        // Given: 오늘 학습 통계 조회 응답 fixture
        given(proxy.execute(any(), any()))
                .willReturn(
                        json(
                                """
        {"aggregationDate":"2026-08-20","calculatedAt":"2026-08-20T09:00:00Z","totalStudySeconds":16200,"activeStudentCount":4,"participantCount":3,"noRecordStudentCount":1,"runningTimerCount":1,"averageParticipantStudySeconds":5400,"durationBuckets":[{"code":"NO_RECORD","memberCount":1}]}
        """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/study-statistics/today", 1)
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentStatistics(
                        "study-statistics/today", pathParameters(cohort()), todayFields()));
        verify(proxy).execute(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("학습 통계 추이 조회")
    void documentsTrend() throws Exception {
        // Given: 학습 통계 추이 조회 응답 fixture
        given(proxy.execute(any(), any()))
                .willReturn(
                        json(
                                """
        {"window":"14d","from":"2026-08-01","to":"2026-08-14","calculatedAt":"2026-08-14T09:00:00Z","totalStudySeconds":10800,"averageDailyStudySeconds":771,"dailyTotals":[{"aggregationDate":"2026-08-01","studySeconds":900}]}
        """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/study-statistics/trend", 1)
                        .param("window", "14d")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentStatistics(
                        "study-statistics/trend",
                        pathParameters(cohort()),
                        queryParameters(parameterWithName("window").description("조회 기간")),
                        trendFields()));
        verify(proxy).execute(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("학습 통계 회원 목록 조회")
    void documentsMembers() throws Exception {
        // Given: 학습 통계 회원 목록 조회 응답 fixture
        given(proxy.execute(any(), any()))
                .willReturn(
                        json(
                                """
        {"window":"30d","from":"2026-08-01","to":"2026-08-30","calculatedAt":"2026-08-30T09:00:00Z","items":[{"cohortMembershipId":101,"userId":"00000000-0000-0000-0000-000000000101","nickname":"오마","todayStudySeconds":3600,"periodStudySeconds":10800,"activeStudyDays":3,"recordCount":4,"lastStudiedAt":"2026-08-29T12:00:00Z","isRunning":true,"timerStartedAt":"2026-08-30T02:30:00Z"}],"page":{"number":0,"size":20,"totalElements":1,"totalPages":1}}
        """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/study-statistics/members", 1)
                        .queryParam("window", "30d")
                        .queryParam("page", "0")
                        .queryParam("size", "20")
                        .queryParam("sort", "periodStudySeconds,desc")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentStatistics(
                        "study-statistics/members",
                        pathParameters(cohort()),
                        queryParameters(
                                parameterWithName("window").description("조회 기간"),
                                parameterWithName("page").description("페이지"),
                                parameterWithName("size").description("페이지 크기"),
                                parameterWithName("sort").description("정렬")),
                        memberFields()));
        verify(proxy).execute(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("회원 학습 통계 개요 조회")
    void documentsMemberOverview() throws Exception {
        // Given: 회원 학습 통계 개요 조회 응답 fixture
        given(proxy.execute(any(), any()))
                .willReturn(
                        json(
                                """
        {"cohortMembershipId":101,"userId":"00000000-0000-0000-0000-000000000101","window":"7d","from":"2026-08-14","to":"2026-08-20","calculatedAt":"2026-08-20T09:00:00Z","totalStudySeconds":10800,"averageDailyStudySeconds":1542,"activeStudyDays":4,"recordCount":5,"lastStudiedAt":"2026-08-20T08:00:00Z","dailyTotals":[{"aggregationDate":"2026-08-14","studySeconds":1800}]}
        """));

        // When & Then
        mockMvc.perform(get(
                                "/bff/v1/admin/cohorts/{cohort-id}/study-statistics/members/{cohort-membership-id}/overview",
                                1,
                                101)
                        .param("window", "7d")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentStatistics(
                        "study-statistics/member-overview",
                        pathParameters(
                                cohort(),
                                parameterWithName("cohort-membership-id")
                                        .description("멤버십 ID")),
                        queryParameters(parameterWithName("window").description("조회 기간")),
                        overviewFields()));
        verify(proxy).execute(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("회원 학습 기록 조회")
    void documentsMemberRecords() throws Exception {
        // Given: 회원 학습 기록 조회 응답 fixture
        given(proxy.execute(any(), any()))
                .willReturn(
                        json(
                                """
        {"cohortMembershipId":101,"userId":"00000000-0000-0000-0000-000000000101","date":"2026-08-20","calculatedAt":"2026-08-20T09:00:00Z","totalStudySeconds":1800,"records":[{"id":"record-1","startDateTime":"2026-08-20T08:00:00Z","endDateTime":"2026-08-20T08:30:00Z","studySeconds":1800}]}
        """));

        // When & Then
        mockMvc.perform(get(
                                "/bff/v1/admin/cohorts/{cohort-id}/study-statistics/members/{cohort-membership-id}/records",
                                1,
                                101)
                        .param("date", "2026-08-20")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentStatistics(
                        "study-statistics/member-records",
                        pathParameters(
                                cohort(),
                                parameterWithName("cohort-membership-id")
                                        .description("멤버십 ID")),
                        queryParameters(parameterWithName("date").description("조회 날짜")),
                        recordsFields()));
        verify(proxy).execute(any(HttpServletRequest.class), any());
    }

    private ResultHandler documentStatistics(String id, Snippet... snippets) {
        return document(id, preprocessResponse(prettyPrint()), snippets);
    }

    private JsonNode json(String value) throws Exception {
        return objectMapper.readTree(value);
    }

    private ParameterDescriptor cohort() {
        return parameterWithName("cohort-id").description("조회 기수 ID");
    }

    private Snippet trendFields() {
        return responseFields(
                fieldWithPath("window").description("조회 기간"),
                fieldWithPath("from").description("시작일"),
                fieldWithPath("to").description("종료일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("totalStudySeconds").description("총 학습 시간"),
                fieldWithPath("averageDailyStudySeconds").description("일 평균 학습 시간"),
                fieldWithPath("dailyTotals").description("일별 집계"),
                fieldWithPath("dailyTotals[].aggregationDate").description("집계일"),
                fieldWithPath("dailyTotals[].studySeconds").description("학습 시간"));
    }

    private Snippet todayFields() {
        return responseFields(
                fieldWithPath("aggregationDate").description("집계 기준일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("totalStudySeconds").description("총 학습 시간"),
                fieldWithPath("activeStudentCount").description("활동 학생 수"),
                fieldWithPath("participantCount").description("참여 학생 수"),
                fieldWithPath("noRecordStudentCount").description("미기록 학생 수"),
                fieldWithPath("runningTimerCount").description("실행 타이머 수"),
                fieldWithPath("averageParticipantStudySeconds").description("참여자 평균 학습 시간"),
                fieldWithPath("durationBuckets").description("학습 시간 구간"),
                fieldWithPath("durationBuckets[].code").description("구간 코드"),
                fieldWithPath("durationBuckets[].memberCount").description("구간 회원 수"));
    }

    private Snippet memberFields() {
        return responseFields(
                fieldWithPath("window").description("조회 기간"),
                fieldWithPath("from").description("시작일"),
                fieldWithPath("to").description("종료일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("items").description("회원 목록"),
                fieldWithPath("items[].cohortMembershipId").description("멤버십 ID"),
                fieldWithPath("items[].userId").description("사용자 ID"),
                fieldWithPath("items[].nickname").description("닉네임"),
                fieldWithPath("items[].todayStudySeconds").description("오늘 학습 시간"),
                fieldWithPath("items[].periodStudySeconds").description("기간 학습 시간"),
                fieldWithPath("items[].activeStudyDays").description("학습 일수"),
                fieldWithPath("items[].recordCount").description("기록 수"),
                fieldWithPath("items[].lastStudiedAt").description("최근 학습 시각"),
                fieldWithPath("items[].isRunning").description("실행 중 여부"),
                fieldWithPath("items[].timerStartedAt").description("타이머 시작 시각"),
                fieldWithPath("page").description("페이지 정보"),
                fieldWithPath("page.number").description("페이지 번호"),
                fieldWithPath("page.size").description("페이지 크기"),
                fieldWithPath("page.totalElements").description("전체 항목 수"),
                fieldWithPath("page.totalPages").description("전체 페이지 수"));
    }

    private Snippet overviewFields() {
        return responseFields(
                fieldWithPath("cohortMembershipId").description("멤버십 ID"),
                fieldWithPath("userId").description("사용자 ID"),
                fieldWithPath("window").description("조회 기간"),
                fieldWithPath("from").description("시작일"),
                fieldWithPath("to").description("종료일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("totalStudySeconds").description("총 학습 시간"),
                fieldWithPath("averageDailyStudySeconds").description("일 평균 학습 시간"),
                fieldWithPath("activeStudyDays").description("학습 일수"),
                fieldWithPath("recordCount").description("기록 수"),
                fieldWithPath("lastStudiedAt").description("최근 학습 시각"),
                fieldWithPath("dailyTotals").description("일별 집계"),
                fieldWithPath("dailyTotals[].aggregationDate").description("집계일"),
                fieldWithPath("dailyTotals[].studySeconds").description("학습 시간"));
    }

    private Snippet recordsFields() {
        return responseFields(
                fieldWithPath("cohortMembershipId").description("멤버십 ID"),
                fieldWithPath("userId").description("사용자 ID"),
                fieldWithPath("date").description("집계일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("totalStudySeconds").description("총 학습 시간"),
                fieldWithPath("records").description("학습 기록 목록"),
                fieldWithPath("records[].id").description("기록 ID"),
                fieldWithPath("records[].startDateTime").description("시작 시각"),
                fieldWithPath("records[].endDateTime").description("종료 시각"),
                fieldWithPath("records[].studySeconds").description("학습 시간"));
    }
}
