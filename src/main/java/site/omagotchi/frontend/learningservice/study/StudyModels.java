package site.omagotchi.frontend.learningservice.study;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

public final class StudyModels {

    private StudyModels() {
    }

    public record MembershipResponse(
            Long id,
            Long cohortId,
            UUID userId,
            String role,
            String status,
            OffsetDateTime requestedAt,
            OffsetDateTime processedAt,
            UUID processedByUserId,
            String rejectionReason,
            OffsetDateTime endedAt
    ) {
    }

    public record CreateStudyRecordRequest(
            @NotNull @JsonFormat(pattern = "yyyy-MM-dd") LocalDate date,
            @NotNull @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull @JsonFormat(pattern = "HH:mm") LocalTime endTime
    ) {
    }

    public record UpdateStudyRecordRequest(
            @NotNull @JsonFormat(pattern = "yyyy-MM-dd") LocalDate date,
            @NotNull @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @NotNull @PositiveOrZero Long expectedVersion
    ) {
    }

    public record TimerResponse(
            String resultCode,
            UUID timerRunId,
            String state,
            Instant startedAt,
            Long elapsedSeconds
    ) {
    }

    public record StudyRecordResponse(
            UUID id,
            LocalDate aggregationDate,
            Instant startTime,
            Instant endTime,
            Long studySeconds,
            Long version,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record DailyStudyRecordsResponse(
            LocalDate aggregationDate,
            Long totalStudySeconds,
            List<StudyRecordResponse> records
    ) {
    }

    public record DailyStudySecondsResponse(
            LocalDate aggregationDate,
            Long studySeconds
    ) {
    }

    public record MonthlyStudySecondsResponse(
            YearMonth aggregationMonth,
            Long totalStudySeconds,
            List<DailyStudySecondsResponse> dailyTotals
    ) {
    }
}
