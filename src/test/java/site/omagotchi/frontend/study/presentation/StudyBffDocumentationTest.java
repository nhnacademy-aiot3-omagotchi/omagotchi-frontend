package site.omagotchi.frontend.study.presentation;

import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.put;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockCookie;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.cookies.RequestCookiesSnippet;
import org.springframework.restdocs.headers.HeaderDocumentation;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.restdocs.payload.PayloadDocumentation;
import org.springframework.restdocs.request.RequestDocumentation;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.study.application.StudyRecordBffService;
import site.omagotchi.frontend.study.application.StudyTimerBffService;
import site.omagotchi.frontend.study.application.result.CurrentTimerView;
import site.omagotchi.frontend.study.application.result.DailyStudyRecordsView;
import site.omagotchi.frontend.study.application.result.DailyStudySecondsView;
import site.omagotchi.frontend.study.application.result.MonthlyStudySecondsView;
import site.omagotchi.frontend.study.application.result.StartTimerView;
import site.omagotchi.frontend.study.application.result.StudyRecordView;
import site.omagotchi.frontend.study.application.result.TimerState;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest({StudyRecordBffController.class, StudyTimerBffController.class})
@Import(StudyBffDocumentationTest.StudyDocumentationBeans.class)
class StudyBffDocumentationTest extends FrontendRestDocsTestSupport {

    private static final UUID RECORD_ID = UUID.fromString("00000000-0000-0000-0000-000000810001");
    private static final UUID TIMER_RUN_ID = UUID.fromString("00000000-0000-0000-0000-000000810002");
    private static final String SESSION_ID = "[SESSION_ID]";
    private static final String RECORD_PATH = "/bff/v1/study-records/" + "00000000-0000-0000-0000-000000810001";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("공부 기록 조회")
    void getsStudyRecord() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get(RECORD_PATH).session(authenticatedSession()).cookie(sessionCookie()))
                .andExpectAll(status().isOk(), jsonPath("$.id").value(RECORD_ID.toString()))
                .andDo(document(
                        "study-bff/get-study-record",
                        sessionCookies(),
                        PayloadDocumentation.responseFields(studyRecordFields())));
    }

    @Test
    @DisplayName("일별 공부 기록 조회")
    void getsDailyStudyRecords() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/study-records")
                        .param("date", "2026-09-14")
                        .session(authenticatedSession())
                        .cookie(sessionCookie()))
                .andExpectAll(status().isOk(), jsonPath("$.aggregationDate").value("2026-09-14"))
                .andDo(document(
                        "study-bff/get-daily-study-records",
                        sessionCookies(),
                        RequestDocumentation.queryParameters(
                                RequestDocumentation.parameterWithName("date")
                                        .description("조회 날짜(ISO-8601 날짜)")),
                        PayloadDocumentation.responseFields(dailyRecordFields())));
    }

    @Test
    @DisplayName("월별 공부 시간 조회")
    void getsMonthlyStudyTimeSummary() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/study-time-summaries")
                        .param("month", "2026-09")
                        .session(authenticatedSession())
                        .cookie(sessionCookie()))
                .andExpectAll(status().isOk(), jsonPath("$.aggregationMonth").value("2026-09"))
                .andDo(document(
                        "study-bff/get-monthly-study-summary",
                        sessionCookies(),
                        RequestDocumentation.queryParameters(
                                RequestDocumentation.parameterWithName("month")
                                        .description("조회 월(yyyy-MM)")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("aggregationMonth").description("집계 월"),
                                fieldWithPath("totalStudySeconds")
                                        .description("해당 월의 총 공부 시간(초)"),
                                fieldWithPath("dailyTotals").description("일별 공부 시간 목록"),
                                fieldWithPath("dailyTotals[]").description("일별 집계"),
                                fieldWithPath("dailyTotals[].aggregationDate")
                                        .description("집계 날짜"),
                                fieldWithPath("dailyTotals[].studySeconds")
                                        .description("해당 날짜의 공부 시간(초)"))));
    }

    @Test
    @DisplayName("공부 기록 생성")
    void createsStudyRecord() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/study-records")
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf())
                        .contentType("application/json")
                        .content(
                                "{\"startDateTime\":\"2026-09-14T09:00\",\"endDateTime\":\"2026-09-14T10:30\"}"))
                .andExpectAll(status().isCreated(), jsonPath("$.studySeconds").value(5400))
                .andDo(document(
                        "study-bff/create-study-record",
                        sessionCookies(),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("startDateTime")
                                        .description("공부 시작 시각(yyyy-MM-dd'T'HH:mm)"),
                                fieldWithPath("endDateTime")
                                        .description("공부 종료 시각(yyyy-MM-dd'T'HH:mm)")),
                        PayloadDocumentation.responseFields(studyRecordFields())));
    }

    @Test
    @DisplayName("공부 기록 수정")
    void updatesStudyRecord() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(put("/bff/v1/study-records/{study-record-id}", RECORD_ID)
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf())
                        .contentType("application/json")
                        .content(
                                "{\"startDateTime\":\"2026-09-14T09:00\",\"endDateTime\":\"2026-09-14T10:30\",\"expectedVersion\":2}"))
                .andExpectAll(status().isOk(), jsonPath("$.version").value(3))
                .andDo(document(
                        "study-bff/update-study-record",
                        sessionCookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("study-record-id")
                                        .description("수정할 공부 기록 식별자(UUID)")),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("startDateTime").description("공부 시작 시각"),
                                fieldWithPath("endDateTime").description("공부 종료 시각"),
                                fieldWithPath("expectedVersion")
                                        .description("낙관적 동시성 검사용 현재 버전(0 이상)")),
                        PayloadDocumentation.responseFields(studyRecordFields())));
    }

    @Test
    @DisplayName("공부 기록 삭제")
    void deletesStudyRecord() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(delete("/bff/v1/study-records/{study-record-id}", RECORD_ID)
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf())
                        .header("X-RESOURCE-VERSION", 3))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "study-bff/delete-study-record",
                        sessionCookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("study-record-id")
                                        .description("삭제할 공부 기록 식별자(UUID)")),
                        HeaderDocumentation.requestHeaders(
                                headerWithName("X-RESOURCE-VERSION")
                                        .description("삭제 대상 리소스의 낙관적 동시성 버전"))));
    }

    @Test
    @DisplayName("현재 타이머 조회")
    void getsCurrentTimer() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/timer")
                        .session(authenticatedSession())
                        .cookie(sessionCookie()))
                .andExpectAll(status().isOk(), jsonPath("$.state").value("RUNNING"))
                .andDo(document(
                        "study-bff/get-current-timer",
                        sessionCookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("state")
                                        .description("타이머 상태(RUNNING 또는 STOPPED)"),
                                fieldWithPath("timerRunId")
                                        .description("현재 타이머 실행 식별자(UUID)"),
                                fieldWithPath("startedAt")
                                        .description("타이머 시작 시각(UTC ISO-8601 instant)"),
                                fieldWithPath("elapsedSeconds").description("경과 시간(초)"))));
    }

    @Test
    @DisplayName("타이머 시작")
    void startsTimer() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/timer/start")
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf()))
                .andExpectAll(status().isCreated(), jsonPath("$.resultCode").value("STARTED"))
                .andDo(document(
                        "study-bff/start-timer",
                        sessionCookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("resultCode").description("타이머 시작 결과 코드"),
                                fieldWithPath("timerRunId")
                                        .description("새 타이머 실행 식별자(UUID)"),
                                fieldWithPath("state").description("타이머 상태"),
                                fieldWithPath("startedAt")
                                        .description("타이머 시작 시각(UTC ISO-8601 instant)"),
                                fieldWithPath("elapsedSeconds").description("경과 시간(초)"))));
    }

    @Test
    @DisplayName("타이머 중지")
    void stopsTimer() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/timer/{timer-run-id}/stop", TIMER_RUN_ID)
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "study-bff/stop-timer",
                        sessionCookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("timer-run-id")
                                        .description("종료할 타이머 실행 식별자(UUID)"))));
    }

    @Test
    @DisplayName("타이머 폐기")
    void discardsTimer() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/timer/{timer-run-id}/discard", TIMER_RUN_ID)
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "study-bff/discard-timer",
                        sessionCookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("timer-run-id")
                                        .description("폐기할 타이머 실행 식별자(UUID)"))));
    }

    @Test
    @DisplayName("필수 필드 누락 시 400 응답")
    void rejectsStudyRecordWhenRequiredFieldIsMissing() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/study-records")
                        .session(authenticatedSession())
                        .cookie(sessionCookie())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"startDateTime\":\"2026-09-14T09:00\"}"))
                .andExpect(status().isBadRequest())
                .andDo(document(
                        "study-bff/create-study-record-validation-error",
                        sessionCookies(),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("startDateTime").description("공부 시작 시각"),
                                fieldWithPath("endDateTime")
                                        .optional()
                                        .type(JsonFieldType.STRING)
                                        .description("공부 종료 시각(누락 시 검증 오류)")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("code").description("공통 오류 코드"),
                                fieldWithPath("message").description("오류 설명"),
                                fieldWithPath("path").description("오류가 발생한 요청 경로"),
                                fieldWithPath("requestId").description("요청 추적 ID"))));
    }

    private static RequestCookiesSnippet sessionCookies() {
        return requestCookies(
                CookieDocumentation.cookieWithName("SESSION")
                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다."));
    }

    private static MockCookie sessionCookie() {
        return new MockCookie("SESSION", SESSION_ID);
    }

    private static List<FieldDescriptor> dailyRecordFields() {
        return Stream.concat(
                        Stream.of(
                                fieldWithPath("aggregationDate").description("집계 날짜"),
                                fieldWithPath("totalStudySeconds").description("해당 날짜의 총 공부 시간(초)"),
                                fieldWithPath("records").description("해당 날짜의 공부 기록 목록"),
                                fieldWithPath("records[]").description("공부 기록")),
                        Arrays.stream(studyRecordFields("records[]")))
                .toList();
    }

    private static FieldDescriptor[] studyRecordFields() {
        return studyRecordFields("");
    }

    private static FieldDescriptor[] studyRecordFields(String prefix) {
        String p = prefix.isEmpty() ? "" : prefix + ".";
        return new FieldDescriptor[] {
            fieldWithPath(p + "id").description("공부 기록 식별자(UUID)"),
            fieldWithPath(p + "aggregationDate").description("집계 날짜"),
            fieldWithPath(p + "startTime").description("공부 시작 시각(UTC ISO-8601 instant)"),
            fieldWithPath(p + "endTime").description("공부 종료 시각(UTC ISO-8601 instant)"),
            fieldWithPath(p + "studySeconds").description("공부 시간(초)"),
            fieldWithPath(p + "version").description("낙관적 동시성 버전"),
            fieldWithPath(p + "createdAt").description("생성 시각(UTC ISO-8601 instant)"),
            fieldWithPath(p + "updatedAt").description("수정 시각(UTC ISO-8601 instant)")
        };
    }

    private static StudyRecordView studyRecord() {
        return new StudyRecordView(
                RECORD_ID,
                LocalDate.of(2026, 9, 14),
                Instant.parse("2026-09-14T00:00:00Z"),
                Instant.parse("2026-09-14T01:30:00Z"),
                5400,
                3,
                Instant.parse("2026-09-14T01:30:00Z"),
                Instant.parse("2026-09-14T01:30:00Z"));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class StudyDocumentationBeans {
        @Bean
        StudyRecordBffService studyRecordBffService() {
            return new FixtureStudyRecordService();
        }

        @Bean
        StudyTimerBffService studyTimerBffService() {
            return new FixtureStudyTimerBffService();
        }
    }

    private static final class FixtureStudyRecordService extends StudyRecordBffService {
        private FixtureStudyRecordService() {
            super(null, null, null);
        }

        @Override
        public StudyRecordView getStudyRecord(UUID id, HttpServletRequest request) {
            return studyRecord();
        }

        @Override
        public DailyStudyRecordsView getDailyStudyRecords(
                LocalDate date, HttpServletRequest request) {
            return new DailyStudyRecordsView(date, 5400, List.of(studyRecord()));
        }

        @Override
        public MonthlyStudySecondsView getMonthlyStudyTimeSummary(
                YearMonth month, HttpServletRequest request) {
            return new MonthlyStudySecondsView(
                    month,
                    5400,
                    List.of(new DailyStudySecondsView(LocalDate.of(2026, 9, 14), 5400)));
        }

        @Override
        public StudyRecordView createStudyRecord(
                LocalDateTime start, LocalDateTime end, HttpServletRequest request) {
            return studyRecord();
        }

        @Override
        public StudyRecordView updateStudyRecord(
                UUID id,
                LocalDateTime start,
                LocalDateTime end,
                Long version,
                HttpServletRequest request) {
            return studyRecord();
        }

        @Override
        public void deleteStudyRecord(UUID id, Long version, HttpServletRequest request) {}
    }

    private static final class FixtureStudyTimerBffService extends StudyTimerBffService {
        private FixtureStudyTimerBffService() {
            super(null, null, null);
        }

        @Override
        public CurrentTimerView getCurrentTimer(HttpServletRequest request) {
            return new CurrentTimerView(
                    TimerState.RUNNING, TIMER_RUN_ID, Instant.parse("2026-09-14T01:00:00Z"), 1800);
        }

        @Override
        public StartTimerView startTimer(HttpServletRequest request) {
            return new StartTimerView(
                    "STARTED",
                    TIMER_RUN_ID,
                    TimerState.RUNNING,
                    Instant.parse("2026-09-14T01:00:00Z"),
                    0);
        }

        @Override
        public void stopTimer(UUID id, HttpServletRequest request) {}

        @Override
        public void discardTimer(UUID id, HttpServletRequest request) {}
    }
}
