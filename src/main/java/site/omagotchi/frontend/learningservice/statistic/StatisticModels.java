package site.omagotchi.frontend.learningservice.statistic;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class StatisticModels {

    private StatisticModels() {
    }

    public record CohortResponse(
            Long id,
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            String status
    ) {
    }

    public record ManagerMembershipResponse(
            Long id,
            Long cohortId,
            UUID userId,
            String role,
            String status
    ) {
    }

    public record DurationBucket(String code, Long memberCount) {
    }

    public record DailyTotal(LocalDate aggregationDate, Long studySeconds) {
    }

    public record TodayResponse(
            LocalDate aggregationDate,
            Instant calculatedAt,
            Long totalStudySeconds,
            Long activeStudentCount,
            Long participantCount,
            Long noRecordStudentCount,
            Long averageParticipantStudySeconds,
            List<DurationBucket> durationBuckets
    ) {
    }

    public record TrendResponse(
            String window,
            LocalDate from,
            LocalDate to,
            Instant calculatedAt,
            Long totalStudySeconds,
            Long averageDailyStudySeconds,
            List<DailyTotal> dailyTotals
    ) {
    }

    public record MemberSummary(
            Long cohortMembershipId,
            UUID userId,
            Long todayStudySeconds,
            Long periodStudySeconds,
            Long activeStudyDays,
            Long recordCount,
            Instant lastStudiedAt
    ) {
    }

    public record PageInfo(
            Integer number,
            Integer size,
            Long totalElements,
            Integer totalPages
    ) {
    }

    // Learning 원본은 page 객체를 사용한다.
    public record DownstreamMemberPageResponse(
            String window,
            LocalDate from,
            LocalDate to,
            Instant calculatedAt,
            List<MemberSummary> items,
            PageInfo page
    ) {
    }

    // 기존 관리자 화면의 소비 계약에 맞춰 BFF가 pagination을 평탄화한다.
    public record MemberPageResponse(
            String window,
            LocalDate from,
            LocalDate to,
            Instant calculatedAt,
            Integer page,
            Integer size,
            Long totalElements,
            Integer totalPages,
            List<MemberSummary> items
    ) {
        public static MemberPageResponse from(DownstreamMemberPageResponse response) {
            return new MemberPageResponse(
                    response.window(),
                    response.from(),
                    response.to(),
                    response.calculatedAt(),
                    response.page().number(),
                    response.page().size(),
                    response.page().totalElements(),
                    response.page().totalPages(),
                    List.copyOf(response.items())
            );
        }
    }

    public record MemberOverviewResponse(
            Long cohortMembershipId,
            UUID userId,
            String window,
            LocalDate from,
            LocalDate to,
            Instant calculatedAt,
            Long totalStudySeconds,
            Long averageDailyStudySeconds,
            Long activeStudyDays,
            Long recordCount,
            Instant lastStudiedAt,
            List<DailyTotal> dailyTotals
    ) {
    }

    public record MemberDailyRecord(
            UUID id,
            Instant startTime,
            Instant endTime,
            Long studySeconds
    ) {
    }

    public record MemberDailyRecordsResponse(
            Long cohortMembershipId,
            UUID userId,
            LocalDate date,
            Instant calculatedAt,
            Long totalStudySeconds,
            List<MemberDailyRecord> records
    ) {
    }
}
