package site.omagotchi.frontend.study.application;

import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.study.application.result.CurrentTimerView;
import site.omagotchi.frontend.study.application.result.DailyStudyRecordsView;
import site.omagotchi.frontend.study.application.result.DailyStudySecondsView;
import site.omagotchi.frontend.study.application.result.MonthlyStudySecondsView;
import site.omagotchi.frontend.study.application.result.StartTimerView;
import site.omagotchi.frontend.study.application.result.StudyRecordView;
import site.omagotchi.frontend.study.application.result.TimerState;
import site.omagotchi.frontend.study.infrastructure.response.LearningCurrentTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudyRecordsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningMonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStartTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStudyRecordResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningTimerState;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.ToLongFunction;

final class StudyResponseContracts {

    private static final String TIMER_STARTED = "TIMER_STARTED";

    private StudyResponseContracts() {
    }

    static StudyRecordView requireStudyRecord(
            LearningStudyRecordResponse response,
            String operation
    ) {
        if (response == null
                || response.id() == null
                || response.aggregationDate() == null
                || response.startTime() == null
                || response.endTime() == null
                || response.studySeconds() == null
                || response.version() == null
                || response.createdAt() == null
                || response.updatedAt() == null) {
            throw invalid(operation, "필수 기록 필드 누락");
        }
        if (!response.startTime().isBefore(response.endTime())
                || response.studySeconds() < 0L
                || response.version() < 0L) {
            throw invalid(operation, "기록 값 범위 위반");
        }
        return new StudyRecordView(
                response.id(),
                response.aggregationDate(),
                response.startTime(),
                response.endTime(),
                response.studySeconds(),
                response.version(),
                response.createdAt(),
                response.updatedAt()
        );
    }

    static DailyStudyRecordsView requireDailyRecords(
            LearningDailyStudyRecordsResponse response,
            LocalDate expectedDate,
            String operation
    ) {
        if (response == null
                || !expectedDate.equals(response.aggregationDate())
                || response.totalStudySeconds() == null
                || response.totalStudySeconds() < 0L
                || response.records() == null) {
            throw invalid(operation, "일별 기록 요약 계약 위반");
        }

        Set<UUID> recordIds = new HashSet<>();
        List<StudyRecordView> records = response.records().stream()
                .map(item -> requireStudyRecord(item, operation))
                .toList();
        for (StudyRecordView item : records) {
            if (!expectedDate.equals(item.aggregationDate())) {
                throw invalid(operation, "조회일과 기록 집계일 불일치");
            }
            if (!recordIds.add(item.id())) {
                throw invalid(operation, "중복 기록 ID");
            }
        }
        long calculatedTotal = sumStudySeconds(
                records,
                StudyRecordView::studySeconds,
                operation,
                "일별 총 공부 시간 합계 오버플로"
        );
        if (calculatedTotal != response.totalStudySeconds()) {
            throw invalid(operation, "일별 총 공부 시간 불일치");
        }
        return new DailyStudyRecordsView(
                response.aggregationDate(),
                response.totalStudySeconds(),
                records
        );
    }

    static MonthlyStudySecondsView requireMonthlySummary(
            LearningMonthlyStudySecondsResponse response,
            YearMonth expectedMonth,
            String operation
    ) {
        if (response == null
                || !expectedMonth.equals(response.aggregationMonth())
                || response.totalStudySeconds() == null
                || response.totalStudySeconds() < 0L
                || response.dailyTotals() == null
                || response.dailyTotals().size() != expectedMonth.lengthOfMonth()) {
            throw invalid(operation, "월별 공부 시간 요약 계약 위반");
        }

        List<DailyStudySecondsView> dailyTotals = response.dailyTotals().stream()
                .map(item -> requireDailyTotal(item, expectedMonth, operation))
                .toList();
        for (int index = 0; index < dailyTotals.size(); index++) {
            LocalDate expectedDate = expectedMonth.atDay(index + 1);
            if (!expectedDate.equals(dailyTotals.get(index).aggregationDate())) {
                throw invalid(operation, "월별 일자 순서 불일치");
            }
        }
        long calculatedTotal = sumStudySeconds(
                dailyTotals,
                DailyStudySecondsView::studySeconds,
                operation,
                "월별 총 공부 시간 합계 오버플로"
        );
        if (calculatedTotal != response.totalStudySeconds()) {
            throw invalid(operation, "월별 총 공부 시간 불일치");
        }
        return new MonthlyStudySecondsView(
                response.aggregationMonth(),
                response.totalStudySeconds(),
                dailyTotals
        );
    }

    static CurrentTimerView requireCurrentTimer(
            LearningCurrentTimerResponse response,
            String operation
    ) {
        if (response == null
                || response.state() == null
                || response.elapsedSeconds() == null
                || response.elapsedSeconds() < 0L) {
            throw invalid(operation, "타이머 필수 필드 누락");
        }

        TimerState state = toTimerState(response.state());
        if (state == TimerState.RUNNING
                && (response.timerRunId() == null || response.startedAt() == null)) {
            throw invalid(operation, "실행 중 타이머 식별 정보 누락");
        }
        if (state == TimerState.STOPPED
                && (response.timerRunId() != null
                || response.startedAt() != null
                || response.elapsedSeconds() != 0L)) {
            throw invalid(operation, "정지 타이머 상태 계약 위반");
        }
        return new CurrentTimerView(
                state,
                response.timerRunId(),
                response.startedAt(),
                response.elapsedSeconds()
        );
    }

    static StartTimerView requireStartedTimer(
            LearningStartTimerResponse response,
            String operation
    ) {
        if (response == null
                || !TIMER_STARTED.equals(response.resultCode())
                || response.timerRunId() == null
                || response.state() != LearningTimerState.RUNNING
                || response.startedAt() == null
                || response.elapsedSeconds() == null
                || response.elapsedSeconds() < 0L) {
            throw invalid(operation, "타이머 시작 응답 계약 위반");
        }
        return new StartTimerView(
                response.resultCode(),
                response.timerRunId(),
                TimerState.RUNNING,
                response.startedAt(),
                response.elapsedSeconds()
        );
    }

    private static DailyStudySecondsView requireDailyTotal(
            LearningDailyStudySecondsResponse response,
            YearMonth expectedMonth,
            String operation
    ) {
        if (response == null
                || response.aggregationDate() == null
                || !expectedMonth.equals(YearMonth.from(response.aggregationDate()))
                || response.studySeconds() == null
                || response.studySeconds() < 0L) {
            throw invalid(operation, "일별 공부 시간 계약 위반");
        }
        return new DailyStudySecondsView(
                response.aggregationDate(),
                response.studySeconds()
        );
    }

    private static TimerState toTimerState(LearningTimerState state) {
        return switch (state) {
            case RUNNING -> TimerState.RUNNING;
            case STOPPED -> TimerState.STOPPED;
        };
    }

    private static <T> long sumStudySeconds(
            List<T> items,
            ToLongFunction<T> mapper,
            String operation,
            String overflowDetail
    ) {
        long total = 0L;
        try {
            for (T item : items) {
                total = Math.addExact(total, mapper.applyAsLong(item));
            }
            return total;
        } catch (ArithmeticException exception) {
            throw invalid(operation, overflowDetail, exception);
        }
    }

    private static BusinessException invalid(String operation, String detail) {
        return new BusinessException(
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                operation + " 성공 응답 " + detail
        );
    }

    private static BusinessException invalid(String operation, String detail, Throwable cause) {
        return new BusinessException(
                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                operation + " 성공 응답 " + detail,
                cause
        );
    }
}
