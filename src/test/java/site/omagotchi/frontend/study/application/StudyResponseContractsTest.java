package site.omagotchi.frontend.study.application;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.study.application.result.TimerState;
import site.omagotchi.frontend.study.infrastructure.response.LearningCurrentTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudyRecordsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningMonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStartTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStudyRecordResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningTimerState;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Study 하류 성공 응답 계약")
class StudyResponseContractsTest {

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

    @Nested
    @DisplayName("공부 기록")
    class StudyRecord {

        @Test
        @DisplayName("단건과 일별 응답 정상 처리")
        void mapsRecordAndDailySummary() {
            LearningStudyRecordResponse studyRecord = studyRecord(2L);
            LearningDailyStudyRecordsResponse daily = new LearningDailyStudyRecordsResponse(
                    AGGREGATION_DATE,
                    3_600L,
                    List.of(studyRecord)
            );

            var recordView = StudyResponseContracts.requireStudyRecord(
                    studyRecord,
                    "공부 기록 조회"
            );
            var dailyView = StudyResponseContracts.requireDailyRecords(
                    daily,
                    AGGREGATION_DATE,
                    "일별 공부 기록 조회"
            );

            assertThat(recordView.id()).isEqualTo(RECORD_ID);
            assertThat(dailyView.records()).singleElement().isEqualTo(recordView);
            assertThat(dailyView.totalStudySeconds()).isEqualTo(3_600L);
        }

        @Test
        @DisplayName("월 전체 일자 응답 정상 처리")
        void mapsMonthlySummary() {
            List<LearningDailyStudySecondsResponse> dailyTotals = IntStream
                    .rangeClosed(1, AGGREGATION_MONTH.lengthOfMonth())
                    .mapToObj(day -> new LearningDailyStudySecondsResponse(
                            AGGREGATION_MONTH.atDay(day),
                            1L
                    ))
                    .toList();
            LearningMonthlyStudySecondsResponse monthly =
                    new LearningMonthlyStudySecondsResponse(
                            AGGREGATION_MONTH,
                            (long) AGGREGATION_MONTH.lengthOfMonth(),
                            dailyTotals
                    );

            var view = StudyResponseContracts.requireMonthlySummary(
                    monthly,
                    AGGREGATION_MONTH,
                    "월별 공부 시간 조회"
            );

            assertThat(view.dailyTotals()).hasSize(AGGREGATION_MONTH.lengthOfMonth());
            assertThat(view.totalStudySeconds())
                    .isEqualTo(AGGREGATION_MONTH.lengthOfMonth());
        }

        @Test
        @DisplayName("필수 필드와 합계 계약 위반 거부")
        void rejectsMissingFieldsAndInvalidTotals() {
            LearningStudyRecordResponse missingVersion = new LearningStudyRecordResponse(
                    RECORD_ID,
                    AGGREGATION_DATE,
                    STARTED_AT,
                    ENDED_AT,
                    3_600L,
                    null,
                    STARTED_AT,
                    ENDED_AT
            );
            LearningDailyStudyRecordsResponse invalidDaily =
                    new LearningDailyStudyRecordsResponse(
                            AGGREGATION_DATE,
                            1L,
                            List.of(studyRecord(2L))
                    );
            LearningMonthlyStudySecondsResponse incompleteMonth =
                    new LearningMonthlyStudySecondsResponse(
                            AGGREGATION_MONTH,
                            0L,
                            List.of()
                    );

            assertInvalid(() -> StudyResponseContracts.requireStudyRecord(
                    missingVersion,
                    "공부 기록 조회"
            ));
            assertInvalid(() -> StudyResponseContracts.requireDailyRecords(
                    invalidDaily,
                    AGGREGATION_DATE,
                    "일별 공부 기록 조회"
            ));
            assertInvalid(() -> StudyResponseContracts.requireMonthlySummary(
                    incompleteMonth,
                    AGGREGATION_MONTH,
                    "월별 공부 시간 조회"
            ));
        }

        @Test
        @DisplayName("일별 및 월별 공부 시간 합계 오버플로 거부")
        void rejectsOverflowingStudySecondsSum() {
            UUID recordId1 = UUID.fromString("10000000-0000-0000-0000-000000000001");
            UUID recordId2 = UUID.fromString("10000000-0000-0000-0000-000000000002");
            UUID recordId3 = UUID.fromString("10000000-0000-0000-0000-000000000003");

            // Long.MAX_VALUE + Long.MAX_VALUE + 2L = 0L (LongStream.sum() overflow 시 0으로 순환)
            List<LearningStudyRecordResponse> overflowRecords = List.of(
                    studyRecord(recordId1, Long.MAX_VALUE),
                    studyRecord(recordId2, Long.MAX_VALUE),
                    studyRecord(recordId3, 2L)
            );
            LearningDailyStudyRecordsResponse overflowDaily =
                    new LearningDailyStudyRecordsResponse(
                            AGGREGATION_DATE,
                            0L,
                            overflowRecords
                    );

            assertThatThrownBy(() -> StudyResponseContracts.requireDailyRecords(
                    overflowDaily,
                    AGGREGATION_DATE,
                    "일별 공부 기록 조회"
            )).isInstanceOfSatisfying(BusinessException.class, exception -> {
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                assertThat(exception.getDiagnosticMessage())
                        .contains("일별 총 공부 시간 합계 오버플로");
                assertThat(exception.getCause())
                        .isInstanceOf(ArithmeticException.class);
            });

            List<LearningDailyStudySecondsResponse> overflowDailyTotals = IntStream
                    .rangeClosed(1, AGGREGATION_MONTH.lengthOfMonth())
                    .mapToObj(day -> new LearningDailyStudySecondsResponse(
                            AGGREGATION_MONTH.atDay(day),
                            day == 1 || day == 2 ? Long.MAX_VALUE : (day == 3 ? 2L : 0L)
                    ))
                    .toList();
            LearningMonthlyStudySecondsResponse overflowMonthly =
                    new LearningMonthlyStudySecondsResponse(
                            AGGREGATION_MONTH,
                            0L,
                            overflowDailyTotals
                    );

            assertThatThrownBy(() -> StudyResponseContracts.requireMonthlySummary(
                    overflowMonthly,
                    AGGREGATION_MONTH,
                    "월별 공부 시간 조회"
            )).isInstanceOfSatisfying(BusinessException.class, exception -> {
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                assertThat(exception.getDiagnosticMessage())
                        .contains("월별 총 공부 시간 합계 오버플로");
                assertThat(exception.getCause())
                        .isInstanceOf(ArithmeticException.class);
            });
        }
    }

    @Nested
    @DisplayName("타이머")
    class Timer {

        @Test
        @DisplayName("실행과 정지 및 시작 응답 정상 처리")
        void mapsRunningStoppedAndStartedTimer() {
            LearningCurrentTimerResponse running = new LearningCurrentTimerResponse(
                    LearningTimerState.RUNNING,
                    TIMER_RUN_ID,
                    STARTED_AT,
                    15L
            );
            LearningCurrentTimerResponse stopped = new LearningCurrentTimerResponse(
                    LearningTimerState.STOPPED,
                    null,
                    null,
                    0L
            );
            LearningStartTimerResponse started = new LearningStartTimerResponse(
                    "TIMER_STARTED",
                    TIMER_RUN_ID,
                    LearningTimerState.RUNNING,
                    STARTED_AT,
                    0L
            );

            var runningView = StudyResponseContracts.requireCurrentTimer(
                    running,
                    "현재 타이머 조회"
            );
            var stoppedView = StudyResponseContracts.requireCurrentTimer(
                    stopped,
                    "현재 타이머 조회"
            );
            var startedView = StudyResponseContracts.requireStartedTimer(
                    started,
                    "타이머 시작"
            );

            assertThat(runningView.state()).isEqualTo(TimerState.RUNNING);
            assertThat(stoppedView.state()).isEqualTo(TimerState.STOPPED);
            assertThat(startedView.timerRunId()).isEqualTo(TIMER_RUN_ID);
        }

        @Test
        @DisplayName("식별 정보와 시작 결과 계약 위반 거부")
        void rejectsInvalidTimerStateAndStartResult() {
            LearningCurrentTimerResponse missingRunId = new LearningCurrentTimerResponse(
                    LearningTimerState.RUNNING,
                    null,
                    STARTED_AT,
                    0L
            );
            LearningStartTimerResponse invalidResult = new LearningStartTimerResponse(
                    "UNEXPECTED",
                    TIMER_RUN_ID,
                    LearningTimerState.RUNNING,
                    STARTED_AT,
                    0L
            );

            assertInvalid(() -> StudyResponseContracts.requireCurrentTimer(
                    missingRunId,
                    "현재 타이머 조회"
            ));
            assertInvalid(() -> StudyResponseContracts.requireStartedTimer(
                    invalidResult,
                    "타이머 시작"
            ));
        }
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

    private static LearningStudyRecordResponse studyRecord(UUID id, long studySeconds) {
        return new LearningStudyRecordResponse(
                id,
                AGGREGATION_DATE,
                STARTED_AT,
                ENDED_AT,
                studySeconds,
                1L,
                STARTED_AT,
                ENDED_AT
        );
    }

    private static void assertInvalid(ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
