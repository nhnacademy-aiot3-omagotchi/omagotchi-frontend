package site.omagotchi.frontend.ranking.presentation;

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
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultHandler;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(RankingBffController.class)
class RankingBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LearningProxyBffService proxy;

    @Test
    @DisplayName("오늘 순위 조회")
    void documentsToday() throws Exception {
        // Given: 오늘 순위 조회 응답 fixture
        given(proxy.executeWithCohort(any(), any())).willReturn(ranking());

        // When & Then
        mockMvc.perform(get("/bff/v1/study-rankings/today")
                        .param("maxRank", "2")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentRanking(
                        "ranking/today",
                        queryParameters(parameterWithName("maxRank").description("반환할 최대 순위"))));
        verify(proxy).executeWithCohort(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("일간 순위 조회")
    void documentsDaily() throws Exception {
        // Given: 일간 순위 조회 응답 fixture
        given(proxy.executeWithCohort(any(), any())).willReturn(ranking());

        // When & Then
        mockMvc.perform(get("/bff/v1/study-rankings/daily/{date}", "2026-08-20")
                        .param("maxRank", "2")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentRanking(
                        "ranking/daily",
                        pathParameters(parameterWithName("date").description("조회 날짜 (yyyy-MM-dd)")),
                        queryParameters(parameterWithName("maxRank").description("반환할 최대 순위"))));
        verify(proxy).executeWithCohort(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("주간 순위 조회")
    void documentsWeekly() throws Exception {
        // Given: 주간 순위 조회 응답 fixture
        given(proxy.executeWithCohort(any(), any())).willReturn(ranking());

        // When & Then
        mockMvc.perform(get("/bff/v1/study-rankings/weekly/{week-start-date}", "2026-08-17")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentRanking(
                        "ranking/weekly",
                        pathParameters(
                                parameterWithName("week-start-date")
                                        .description("주 시작일 (yyyy-MM-dd)"))));
        verify(proxy).executeWithCohort(any(HttpServletRequest.class), any());
    }

    @Test
    @DisplayName("월간 순위 조회")
    void documentsMonthly() throws Exception {
        // Given: 월간 순위 조회 응답 fixture
        given(proxy.executeWithCohort(any(), any())).willReturn(ranking());

        // When & Then
        mockMvc.perform(get("/bff/v1/study-rankings/monthly/{month}", "2026-08")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(documentRanking(
                        "ranking/monthly",
                        pathParameters(parameterWithName("month").description("조회 월 (yyyy-MM)"))));
        verify(proxy).executeWithCohort(any(HttpServletRequest.class), any());
    }

    private ResultHandler documentRanking(String id, Snippet... requestSnippets) {
        return document(id, preprocessResponse(prettyPrint()), concat(requestSnippets, rankingFields()));
    }

    private Snippet[] concat(Snippet[] a, Snippet b) {
        Snippet[] out = Arrays.copyOf(a, a.length + 1);
        out[a.length] = b;
        return out;
    }

    private JsonNode ranking() throws Exception {
        return objectMapper.readTree(
                """
        {"aggregationDate":"2026-08-20","calculatedAt":"2026-08-20T09:00:00Z","rankedMemberCount":2,"returnedEntryCount":1,
         "entries":[{"rank":1,"displayName":"오마","studySeconds":7200,"timerRunning":true,"characterType":"night","colorId":"pistachio","attendanceStreakDays":5}],
         "myRanking":{"ranked":true,"ranking":{"rank":1,"displayName":"오마","studySeconds":7200,"timerRunning":true,"characterType":"night","colorId":"pistachio","attendanceStreakDays":5}}}
        """);
    }

    private Snippet rankingFields() {
        return responseFields(
                fieldWithPath("aggregationDate").description("집계 기준일"),
                fieldWithPath("calculatedAt").description("계산 시각"),
                fieldWithPath("rankedMemberCount").description("순위 대상 수"),
                fieldWithPath("returnedEntryCount").description("반환 행 수"),
                fieldWithPath("entries").description("순위 목록"),
                fieldWithPath("entries[].rank").description("순위"),
                fieldWithPath("entries[].displayName").description("표시 이름"),
                fieldWithPath("entries[].studySeconds").description("학습 시간(초)"),
                fieldWithPath("entries[].timerRunning").description("타이머 실행 여부"),
                fieldWithPath("entries[].characterType").description("캐릭터 타입"),
                fieldWithPath("entries[].colorId").description("캐릭터 색상"),
                fieldWithPath("entries[].attendanceStreakDays").description("연속 출석일"),
                fieldWithPath("myRanking.ranked").description("내 순위 존재 여부"),
                fieldWithPath("myRanking.ranking").description("내 순위"),
                fieldWithPath("myRanking.ranking.rank").description("내 순위"),
                fieldWithPath("myRanking.ranking.displayName").description("내 표시 이름"),
                fieldWithPath("myRanking.ranking.studySeconds").description("내 학습 시간(초)"),
                fieldWithPath("myRanking.ranking.timerRunning").description("내 타이머 실행 여부"),
                fieldWithPath("myRanking.ranking.characterType").description("내 캐릭터 타입"),
                fieldWithPath("myRanking.ranking.colorId").description("내 캐릭터 색상"),
                fieldWithPath("myRanking.ranking.attendanceStreakDays").description("내 연속 출석일"));
    }
}
