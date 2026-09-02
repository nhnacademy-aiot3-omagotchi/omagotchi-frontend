package site.omagotchi.frontend.study.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.study.application.StudyRecordBffService;
import site.omagotchi.frontend.study.application.StudyTimerBffService;
import site.omagotchi.frontend.study.infrastructure.request.LearningCreateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.request.LearningUpdateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.response.LearningCurrentTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudyRecordsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningMonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStartTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStudyRecordResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningTimerState;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@DisplayName("Study BFF 응답 소유권")
class StudyBffResponseOwnershipTest {

    private static final String DOWNSTREAM_HEADER = "X-DOWNSTREAM-TRACE";
    private static final UUID RECORD_ID = UUID.fromString(
            "10000000-0000-0000-0000-000000000001"
    );
    private static final UUID TIMER_RUN_ID = UUID.fromString(
            "20000000-0000-0000-0000-000000000001"
    );
    private static final LocalDate AGGREGATION_DATE = LocalDate.of(2026, 8, 24);
    private static final YearMonth AGGREGATION_MONTH = YearMonth.of(2026, 8);
    private static final Instant STARTED_AT = Instant.parse("2026-08-24T14:30:00Z");
    private static final Instant ENDED_AT = Instant.parse("2026-08-24T15:30:00Z");

    private final LearningStub learningStub = new LearningStub();
    private MockMvc mockMvc;
    private StudyRecordBffService recordService;
    private StudyTimerBffService timerService;

    @BeforeEach
    void setUp() {
        LearningHttpService learningHttpService = learningStub.client();
        LearningGatewayCallExecutor executor = new LearningGatewayCallExecutor(
                new ApiErrorResponseDecoder()
        );
        LearningCohortContext cohortContext = new FixedLearningCohortContext();
        recordService = new StudyRecordBffService(
                learningHttpService,
                executor,
                cohortContext
        );
        timerService = new StudyTimerBffService(
                learningHttpService,
                executor,
                cohortContext
        );

        mockMvc = standaloneSetup(
                new StudyRecordBffController(recordService),
                new StudyTimerBffController(timerService)
        ).build();
    }

    @Nested
    @DisplayName("하류 성공 계약")
    class DownstreamSuccessContract {

        @Test
        @DisplayName("예상하지 않은 생성과 시작 상태의 502 변환")
        void rejectsUnexpectedCreateAndStartStatus() {
            learningStub.createStatus = HttpStatus.OK;
            learningStub.startStatus = HttpStatus.OK;
            MockHttpServletRequest request = new MockHttpServletRequest();

            assertInvalid(() -> recordService.createStudyRecord(
                    LocalDateTime.of(2026, 8, 24, 23, 30),
                    LocalDateTime.of(2026, 8, 25, 0, 30),
                    request
            ));
            assertInvalid(() -> timerService.startTimer(request));
        }
    }

    @Nested
    @DisplayName("공부 기록")
    class StudyRecord {

        @Test
        @DisplayName("전체 동작의 Frontend 상태와 응답 본문 생성")
        void ownsRecordResponseStatusBodyAndHeaders() throws Exception {
            mockMvc.perform(get("/bff/v1/study-records/{id}", RECORD_ID))
                    .andExpectAll(
                            status().isOk(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            jsonPath("$.id").value(RECORD_ID.toString())
                    );
            mockMvc.perform(get("/bff/v1/study-records")
                            .param("date", AGGREGATION_DATE.toString()))
                    .andExpectAll(
                            status().isOk(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            jsonPath("$.aggregationDate")
                                    .value(AGGREGATION_DATE.toString())
                    );
            mockMvc.perform(get("/bff/v1/study-time-summaries")
                            .param("month", AGGREGATION_MONTH.toString()))
                    .andExpectAll(
                            status().isOk(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            jsonPath("$.dailyTotals.length()")
                                    .value(AGGREGATION_MONTH.lengthOfMonth())
                    );
            mockMvc.perform(post("/bff/v1/study-records")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "startDateTime": "2026-08-24T23:30",
                                      "endDateTime": "2026-08-25T00:30"
                                    }
                                    """))
                    .andExpectAll(
                            status().isCreated(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                            jsonPath("$.version").value(0L)
                    );
            mockMvc.perform(put("/bff/v1/study-records/{id}", RECORD_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "startDateTime": "2026-08-24T23:40",
                                      "endDateTime": "2026-08-25T00:40",
                                      "expectedVersion": 2
                                    }
                                    """))
                    .andExpectAll(
                            status().isOk(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            jsonPath("$.version").value(3L)
                    );
            mockMvc.perform(delete("/bff/v1/study-records/{id}", RECORD_ID)
                            .header("X-RESOURCE-VERSION", 3L))
                    .andExpectAll(
                            status().isNoContent(),
                            header().doesNotExist(DOWNSTREAM_HEADER)
                    );

            assertThat(learningStub.createRequest).isEqualTo(
                    new LearningCreateStudyRecordRequest(
                            LocalDateTime.of(2026, 8, 24, 23, 30),
                            LocalDateTime.of(2026, 8, 25, 0, 30)
                    )
            );
            assertThat(learningStub.updateRequest.expectedVersion()).isEqualTo(2L);
            assertThat(learningStub.deleteVersion).isEqualTo(3L);
        }
    }

    @Nested
    @DisplayName("타이머")
    class Timer {

        @Test
        @DisplayName("전체 동작의 Frontend 상태와 응답 본문 생성")
        void ownsTimerResponseStatusBodyAndHeaders() throws Exception {
            mockMvc.perform(get("/bff/v1/timer"))
                    .andExpectAll(
                            status().isOk(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            jsonPath("$.state").value("STOPPED")
                    );
            mockMvc.perform(post("/bff/v1/timer/start"))
                    .andExpectAll(
                            status().isCreated(),
                            header().doesNotExist(DOWNSTREAM_HEADER),
                            content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                            jsonPath("$.timerRunId").value(TIMER_RUN_ID.toString()),
                            jsonPath("$.state").value("RUNNING")
                    );
            mockMvc.perform(post("/bff/v1/timer/{id}/stop", TIMER_RUN_ID))
                    .andExpectAll(
                            status().isNoContent(),
                            header().doesNotExist(DOWNSTREAM_HEADER)
                    );
            mockMvc.perform(post("/bff/v1/timer/{id}/discard", TIMER_RUN_ID))
                    .andExpectAll(
                            status().isNoContent(),
                            header().doesNotExist(DOWNSTREAM_HEADER)
                    );

            assertThat(learningStub.stoppedTimerRunId).isEqualTo(TIMER_RUN_ID);
            assertThat(learningStub.discardedTimerRunId).isEqualTo(TIMER_RUN_ID);
        }
    }

    private static final class FixedLearningCohortContext extends LearningCohortContext {

        private FixedLearningCohortContext() {
            super(null, null, null);
        }

        @Override
        public Resolved resolve(HttpServletRequest request) {
            return new Resolved("Bearer token", 7L);
        }
    }

    private static final class LearningStub implements InvocationHandler {

        private LearningCreateStudyRecordRequest createRequest;
        private LearningUpdateStudyRecordRequest updateRequest;
        private Long deleteVersion;
        private UUID stoppedTimerRunId;
        private UUID discardedTimerRunId;
        private HttpStatus createStatus = HttpStatus.CREATED;
        private HttpStatus startStatus = HttpStatus.CREATED;

        private LearningHttpService client() {
            return (LearningHttpService) Proxy.newProxyInstance(
                    LearningHttpService.class.getClassLoader(),
                    new Class<?>[]{LearningHttpService.class},
                    this
            );
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "getStudyRecord" -> response(HttpStatus.OK, studyRecord(2L));
                case "getDailyStudyRecords" -> response(
                        HttpStatus.OK,
                        new LearningDailyStudyRecordsResponse(
                                AGGREGATION_DATE,
                                0L,
                                List.of()
                        )
                );
                case "getMonthlyStudyTimeSummary" -> response(
                        HttpStatus.OK,
                        monthlySummary()
                );
                case "createStudyRecord" -> {
                    createRequest = (LearningCreateStudyRecordRequest) arguments[2];
                    yield response(createStatus, studyRecord(0L));
                }
                case "updateStudyRecord" -> {
                    updateRequest = (LearningUpdateStudyRecordRequest) arguments[3];
                    yield response(HttpStatus.OK, studyRecord(3L));
                }
                case "deleteStudyRecord" -> {
                    deleteVersion = (Long) arguments[3];
                    yield noBody(HttpStatus.NO_CONTENT);
                }
                case "getCurrentTimer" -> response(
                        HttpStatus.OK,
                        new LearningCurrentTimerResponse(
                                LearningTimerState.STOPPED,
                                null,
                                null,
                                0L
                        )
                );
                case "startTimer" -> response(
                        startStatus,
                        new LearningStartTimerResponse(
                                "TIMER_STARTED",
                                TIMER_RUN_ID,
                                LearningTimerState.RUNNING,
                                STARTED_AT,
                                0L
                        )
                );
                case "stopTimer" -> {
                    stoppedTimerRunId = (UUID) arguments[2];
                    yield noBody(HttpStatus.NO_CONTENT);
                }
                case "discardTimer" -> {
                    discardedTimerRunId = (UUID) arguments[2];
                    yield noBody(HttpStatus.NO_CONTENT);
                }
                case "toString" -> "LearningHttpServiceStub";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }

        private static <T> ResponseEntity<T> response(HttpStatus status, T body) {
            return ResponseEntity.status(status)
                    .header(DOWNSTREAM_HEADER, "must-not-relay")
                    .header(HttpHeaders.CONTENT_LENGTH, "999")
                    .body(body);
        }

        private static ResponseEntity<Void> noBody(HttpStatus status) {
            return ResponseEntity.status(status)
                    .header(DOWNSTREAM_HEADER, "must-not-relay")
                    .header(HttpHeaders.CONTENT_LENGTH, "999")
                    .build();
        }

        private static LearningStudyRecordResponse studyRecord(long version) {
            return new LearningStudyRecordResponse(
                    RECORD_ID,
                    AGGREGATION_DATE,
                    STARTED_AT,
                    ENDED_AT,
                    3_600L,
                    version,
                    STARTED_AT,
                    ENDED_AT
            );
        }

        private static LearningMonthlyStudySecondsResponse monthlySummary() {
            List<LearningDailyStudySecondsResponse> dailyTotals = IntStream
                    .rangeClosed(1, AGGREGATION_MONTH.lengthOfMonth())
                    .mapToObj(day -> new LearningDailyStudySecondsResponse(
                            AGGREGATION_MONTH.atDay(day),
                            0L
                    ))
                    .toList();
            return new LearningMonthlyStudySecondsResponse(
                    AGGREGATION_MONTH,
                    0L,
                    dailyTotals
            );
        }
    }

    private static void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
