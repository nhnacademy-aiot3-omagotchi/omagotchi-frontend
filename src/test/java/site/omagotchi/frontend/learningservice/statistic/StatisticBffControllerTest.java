package site.omagotchi.frontend.learningservice.statistic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.learningservice.common.LearningSessionAccessTokenProvider;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.DurationBucket;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TodayResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StatisticBffControllerTest {

    private StubStatisticBffService service;
    private BrowserSessionTokens sessionTokens;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = new StubStatisticBffService();
        sessionTokens = new BrowserSessionTokens();
        mockMvc = MockMvcBuilders.standaloneSetup(new StatisticBffController(
                service,
                new LearningSessionAccessTokenProvider(sessionTokens)
        )).build();
    }

    @Test
    @DisplayName("관리자 통계 BFF는 Browser Session Access JWT를 Application 호출에 전달한다")
    void relaysSessionAccessToken() throws Exception {
        TodayResponse response = new TodayResponse(
                LocalDate.of(2026, 8, 21),
                Instant.parse("2026-08-21T04:00:00Z"),
                3600L,
                1L,
                1L,
                0L,
                3600L,
                List.of(
                        new DurationBucket("NO_RECORD", 0L),
                        new DurationBucket("UNDER_ONE_HOUR", 0L),
                        new DurationBucket("ONE_TO_TWO_HOURS", 1L),
                        new DurationBucket("TWO_TO_FOUR_HOURS", 0L),
                        new DurationBucket("FOUR_HOURS_OR_MORE", 0L)
                )
        );
        service.response = response;

        mockMvc.perform(get("/bff/v1/manager/cohorts/7/study-statistics/today")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aggregationDate").value("2026-08-21"))
                .andExpect(jsonPath("$.totalStudySeconds").value(3600));

        org.assertj.core.api.Assertions.assertThat(service.accessToken).isEqualTo("access-token");
        org.assertj.core.api.Assertions.assertThat(service.cohortId).isEqualTo(7L);
    }

    private MockHttpSession authenticatedSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-21T05:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-28T05:00:00Z")
        ));
        return (MockHttpSession) request.getSession(false);
    }

    private static final class StubStatisticBffService extends StatisticBffService {

        private TodayResponse response;
        private String accessToken;
        private Long cohortId;

        private StubStatisticBffService() {
            super(null, null);
        }

        @Override
        public TodayResponse getToday(String accessToken, Long cohortId) {
            this.accessToken = accessToken;
            this.cohortId = cohortId;
            return response;
        }
    }
}
