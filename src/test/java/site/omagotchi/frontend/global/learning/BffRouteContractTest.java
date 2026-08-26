package site.omagotchi.frontend.global.learning;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.ranking.presentation.RankingBffController;
import site.omagotchi.frontend.statistics.presentation.AdminStudyStatisticsBffController;
import site.omagotchi.frontend.study.presentation.StudyRecordBffController;
import site.omagotchi.frontend.study.presentation.StudyTimerBffController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.function.BiFunction;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BffRouteContractTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        JsonNode response = JsonMapper.builder().build().createObjectNode()
                .put("contract", "matched");
        LearningProxyBffService proxy = new StubLearningProxyBffService(response);

        mockMvc = MockMvcBuilders.standaloneSetup(
                new RankingBffController(proxy),
                new StudyRecordBffController(proxy),
                new StudyTimerBffController(proxy),
                new AdminStudyStatisticsBffController(proxy)
        ).build();
    }

    @Nested
    @DisplayName("랭킹 BFF 경로")
    class RankingRoutes {

        @Test
        @DisplayName("기간별 랭킹 경로를 제공한다")
        void exposesCurrentRankingPeriodRoutes() throws Exception {
            mockMvc.perform(get("/bff/v1/study-rankings/today"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.contract").value("matched"));
            mockMvc.perform(get("/bff/v1/study-rankings/daily/2026-08-24"))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/bff/v1/study-rankings/weekly/2026-08-24"))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/bff/v1/study-rankings/monthly/2026-08"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("잘못된 랭킹 날짜를 거부한다")
        void rejectsInvalidRankingDateFormatBeforeProxyCall() throws Exception {
            mockMvc.perform(get("/bff/v1/study-rankings/daily/not-a-date"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Study BFF 경로")
    class StudyRoutes {

        @Test
        @DisplayName("기록과 타이머 조회 경로를 제공한다")
        void exposesStudyRecordAndTimerReadRoutes() throws Exception {
            mockMvc.perform(get("/bff/v1/study-records")
                            .param("date", "2026-08-24"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.contract").value("matched"));
            mockMvc.perform(get("/bff/v1/study-time-summaries")
                            .param("month", "2026-08"))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/bff/v1/timer"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("잘못된 요약 월을 거부한다")
        void rejectsInvalidStudyMonthFormatBeforeProxyCall() throws Exception {
            mockMvc.perform(get("/bff/v1/study-time-summaries")
                            .param("month", "2026-13"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("관리자 공부 통계 BFF 경로")
    class AdminStudyStatisticsRoutes {

        @Test
        @DisplayName("통계 조회 엔드포인트를 제공한다")
        void exposesStudyStatisticsRoutes() throws Exception {
            mockMvc.perform(get("/bff/v1/admin/cohorts/1/study-statistics/today"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.contract").value("matched"));

            mockMvc.perform(get("/bff/v1/admin/cohorts/1/study-statistics/trend")
                            .param("window", "7d"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/bff/v1/admin/cohorts/1/study-statistics/members")
                            .param("window", "7d"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/bff/v1/admin/cohorts/1/study-statistics/members/10/overview")
                            .param("window", "7d"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/bff/v1/admin/cohorts/1/study-statistics/members/10/records")
                            .param("date", "2026-08-25"))
                    .andExpect(status().isOk());
        }
    }

    private static final class StubLearningProxyBffService extends LearningProxyBffService {

        private final JsonNode response;

        private StubLearningProxyBffService(JsonNode response) {
            super(null, null, null);
            this.response = response;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T executeWithCohort(
                HttpServletRequest request,
                BiFunction<AuthorizedLearningRequest, Long, T> operation
        ) {
            return (T) response;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T execute(
                HttpServletRequest request,
                java.util.function.Function<AuthorizedLearningRequest, T> operation
        ) {
            return (T) response;
        }
    }
}
