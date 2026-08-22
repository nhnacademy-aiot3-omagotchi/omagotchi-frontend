package site.omagotchi.frontend.learningservice.statistic;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport;
import site.omagotchi.frontend.learningservice.common.LearningServiceErrorCode;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.CohortResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.DailyTotal;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.DownstreamMemberPageResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.DurationBucket;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.ManagerMembershipResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberDailyRecord;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberDailyRecordsResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberOverviewResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberPageResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberSummary;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.PageInfo;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TodayResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TrendResponse;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport.invalidResponse;

@Service
@RequiredArgsConstructor
public class StatisticBffService {

    private static final List<String> DURATION_BUCKET_CODES = List.of(
            "NO_RECORD",
            "UNDER_ONE_HOUR",
            "ONE_TO_TWO_HOURS",
            "TWO_TO_FOUR_HOURS",
            "FOUR_HOURS_OR_MORE"
    );

    private final StatisticHttpService httpService;
    private final LearningServiceClientSupport support;

    public List<CohortResponse> getManagedCohorts(String accessToken) {
        String authorization = support.authorization(accessToken);
        List<CohortResponse> cohorts = support.body(
                () -> httpService.getCohorts(authorization),
                HttpStatus.OK,
                "Statistic cohorts",
                statisticErrors()
        );
        List<ManagerMembershipResponse> memberships = support.body(
                () -> httpService.getMyMemberships(authorization),
                HttpStatus.OK,
                "Statistic manager memberships",
                statisticErrors()
        );
        validateCohorts(cohorts);
        validateMemberships(memberships);

        Set<Long> managedCohortIds = memberships.stream()
                .filter(membership -> "MANAGER".equals(membership.role()))
                .filter(membership -> "ACTIVE".equals(membership.status()))
                .map(ManagerMembershipResponse::cohortId)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        return cohorts.stream()
                .filter(cohort -> managedCohortIds.contains(cohort.id()))
                .toList();
    }

    public TodayResponse getToday(String accessToken, Long cohortId) {
        TodayResponse response = support.body(
                () -> httpService.getToday(support.authorization(accessToken), cohortId),
                HttpStatus.OK,
                "Statistic today",
                statisticErrors()
        );
        validateToday(response);
        return response;
    }

    public TrendResponse getTrend(String accessToken, Long cohortId, String window) {
        TrendResponse response = support.body(
                () -> httpService.getTrend(
                        support.authorization(accessToken), cohortId, window
                ),
                HttpStatus.OK,
                "Statistic trend",
                statisticErrors()
        );
        validateWindowTotals(
                response.window(), response.from(), response.to(), response.calculatedAt(),
                response.totalStudySeconds(), response.averageDailyStudySeconds(),
                response.dailyTotals(), window, "Statistic trend"
        );
        return response;
    }

    public MemberPageResponse getMembers(
            String accessToken,
            Long cohortId,
            String window,
            int page,
            int size,
            String sort
    ) {
        DownstreamMemberPageResponse response = support.body(
                () -> httpService.getMembers(
                        support.authorization(accessToken), cohortId, window, page, size, sort
                ),
                HttpStatus.OK,
                "Statistic members",
                statisticErrors()
        );
        validateMemberPage(response, window, page, size);
        return MemberPageResponse.from(response);
    }

    public MemberOverviewResponse getMemberOverview(
            String accessToken,
            Long cohortId,
            Long cohortMembershipId,
            String window
    ) {
        MemberOverviewResponse response = support.body(
                () -> httpService.getMemberOverview(
                        support.authorization(accessToken), cohortId, cohortMembershipId, window
                ),
                HttpStatus.OK,
                "Statistic member overview",
                statisticErrors()
        );
        if (!cohortMembershipId.equals(response.cohortMembershipId())
                || response.userId() == null
                || response.activeStudyDays() == null || response.activeStudyDays() < 0
                || response.recordCount() == null || response.recordCount() < 0) {
            throw invalidResponse("Statistic member overview 식별자 계약 불일치");
        }
        validateWindowTotals(
                response.window(), response.from(), response.to(), response.calculatedAt(),
                response.totalStudySeconds(), response.averageDailyStudySeconds(),
                response.dailyTotals(), window, "Statistic member overview"
        );
        return response;
    }

    public MemberDailyRecordsResponse getMemberDailyRecords(
            String accessToken,
            Long cohortId,
            Long cohortMembershipId,
            LocalDate date
    ) {
        MemberDailyRecordsResponse response = support.body(
                () -> httpService.getMemberDailyRecords(
                        support.authorization(accessToken), cohortId,
                        cohortMembershipId, date.toString()
                ),
                HttpStatus.OK,
                "Statistic member records",
                statisticErrors()
        );
        validateMemberDailyRecords(response, cohortMembershipId, date);
        return response;
    }

    private static void validateCohorts(List<CohortResponse> cohorts) {
        Set<Long> ids = new HashSet<>();
        for (CohortResponse cohort : cohorts) {
            if (cohort == null || cohort.id() == null || cohort.id() <= 0
                    || !ids.add(cohort.id())
                    || !StringUtils.hasText(cohort.name())
                    || cohort.startDate() == null || cohort.endDate() == null
                    || cohort.startDate().isAfter(cohort.endDate())
                    || !StringUtils.hasText(cohort.status())) {
                throw invalidResponse("Statistic cohorts 계약 불일치");
            }
        }
    }

    private static void validateMemberships(List<ManagerMembershipResponse> memberships) {
        Set<Long> ids = new HashSet<>();
        for (ManagerMembershipResponse membership : memberships) {
            if (membership == null || membership.id() == null || membership.id() <= 0
                    || !ids.add(membership.id())
                    || membership.cohortId() == null || membership.cohortId() <= 0
                    || membership.userId() == null
                    || !StringUtils.hasText(membership.role())
                    || !StringUtils.hasText(membership.status())) {
                throw invalidResponse("Statistic manager memberships 계약 불일치");
            }
        }
    }

    private static void validateToday(TodayResponse response) {
        if (response.aggregationDate() == null || response.calculatedAt() == null
                || negative(response.totalStudySeconds())
                || negative(response.activeStudentCount())
                || negative(response.participantCount())
                || negative(response.noRecordStudentCount())
                || negative(response.averageParticipantStudySeconds())
                || response.durationBuckets() == null
                || response.durationBuckets().size() != DURATION_BUCKET_CODES.size()
                || response.participantCount() > response.activeStudentCount()
                || response.noRecordStudentCount()
                != response.activeStudentCount() - response.participantCount()
                || response.averageParticipantStudySeconds()
                != (response.participantCount() == 0
                ? 0 : response.totalStudySeconds() / response.participantCount())) {
            throw invalidResponse("Statistic today 기본 계약 불일치");
        }
        long bucketTotal = 0;
        for (int index = 0; index < DURATION_BUCKET_CODES.size(); index += 1) {
            DurationBucket bucket = response.durationBuckets().get(index);
            if (bucket == null || !DURATION_BUCKET_CODES.get(index).equals(bucket.code())
                    || negative(bucket.memberCount())) {
                throw invalidResponse("Statistic today bucket 계약 불일치");
            }
            bucketTotal = safeAdd(bucketTotal, bucket.memberCount(), "Statistic today bucket");
        }
        if (bucketTotal != response.activeStudentCount()) {
            throw invalidResponse("Statistic today bucket 합계 불일치");
        }
    }

    private static void validateMemberPage(
            DownstreamMemberPageResponse response,
            String expectedWindow,
            int expectedPage,
            int expectedSize
    ) {
        validateWindowRange(response.window(), response.from(), response.to(), expectedWindow, "Statistic members");
        PageInfo page = response.page();
        if (response.calculatedAt() == null || page == null
                || page.number() == null || page.number() != expectedPage
                || page.size() == null || page.size() != expectedSize
                || negative(page.totalElements())
                || page.totalPages() == null || page.totalPages() < 0
                || response.items() == null || response.items().size() > expectedSize) {
            throw invalidResponse("Statistic members pagination 계약 불일치");
        }
        int expectedPages = page.totalElements() == 0
                ? 0 : Math.toIntExact(((page.totalElements() - 1) / expectedSize) + 1);
        if (page.totalPages() != expectedPages) {
            throw invalidResponse("Statistic members totalPages 불일치");
        }
        Set<Long> membershipIds = new HashSet<>();
        for (MemberSummary item : response.items()) {
            if (item == null || item.cohortMembershipId() == null
                    || item.cohortMembershipId() <= 0
                    || !membershipIds.add(item.cohortMembershipId())
                    || item.userId() == null
                    || negative(item.todayStudySeconds())
                    || negative(item.periodStudySeconds())
                    || negative(item.activeStudyDays())
                    || negative(item.recordCount())) {
                throw invalidResponse("Statistic member item 계약 불일치");
            }
        }
    }

    private static void validateWindowTotals(
            String actualWindow,
            LocalDate from,
            LocalDate to,
            java.time.Instant calculatedAt,
            Long totalStudySeconds,
            Long averageDailyStudySeconds,
            List<DailyTotal> dailyTotals,
            String expectedWindow,
            String operation
    ) {
        validateWindowRange(actualWindow, from, to, expectedWindow, operation);
        if (calculatedAt == null || negative(totalStudySeconds)
                || negative(averageDailyStudySeconds) || dailyTotals == null) {
            throw invalidResponse(operation + " 기본 계약 불일치");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (dailyTotals.size() != days) {
            throw invalidResponse(operation + " dailyTotals 크기 불일치");
        }
        long total = sumDailyTotals(dailyTotals, from, operation);
        if (total != totalStudySeconds || averageDailyStudySeconds != totalStudySeconds / days) {
            throw invalidResponse(operation + " 합계 계약 불일치");
        }
    }

    private static void validateWindowRange(
            String actualWindow,
            LocalDate from,
            LocalDate to,
            String expectedWindow,
            String operation
    ) {
        if (!expectedWindow.equals(actualWindow) || from == null || to == null || from.isAfter(to)) {
            throw invalidResponse(operation + " window 계약 불일치");
        }
        long expectedDays = Long.parseLong(expectedWindow.substring(0, expectedWindow.length() - 1));
        if (ChronoUnit.DAYS.between(from, to) + 1 != expectedDays) {
            throw invalidResponse(operation + " 기간 계약 불일치");
        }
    }

    private static void validateMemberDailyRecords(
            MemberDailyRecordsResponse response,
            Long membershipId,
            LocalDate date
    ) {
        if (!membershipId.equals(response.cohortMembershipId())
                || response.userId() == null || !date.equals(response.date())
                || response.calculatedAt() == null || negative(response.totalStudySeconds())
                || response.records() == null) {
            throw invalidResponse("Statistic member records 기본 계약 불일치");
        }
        long total = 0;
        Set<UUID> ids = new HashSet<>();
        for (MemberDailyRecord record : response.records()) {
            if (record == null || record.id() == null || !ids.add(record.id())
                    || record.startTime() == null || record.endTime() == null
                    || !record.startTime().isBefore(record.endTime())
                    || negative(record.studySeconds())) {
                throw invalidResponse("Statistic member record 항목 계약 불일치");
            }
            total = safeAdd(total, record.studySeconds(), "Statistic member records");
        }
        if (total != response.totalStudySeconds()) {
            throw invalidResponse("Statistic member records 합계 불일치");
        }
    }

    private static long sumDailyTotals(
            List<DailyTotal> totals,
            LocalDate expectedFrom,
            String operation
    ) {
        long sum = 0;
        for (int index = 0; index < totals.size(); index += 1) {
            DailyTotal daily = totals.get(index);
            if (daily == null || daily.aggregationDate() == null
                    || negative(daily.studySeconds())
                    || !daily.aggregationDate().equals(expectedFrom.plusDays(index))) {
                throw invalidResponse(operation + " daily total 계약 불일치");
            }
            sum = safeAdd(sum, daily.studySeconds(), operation);
        }
        return sum;
    }

    private static boolean negative(Long value) {
        return value == null || value < 0;
    }

    private static long safeAdd(long left, long right, String operation) {
        try {
            return Math.addExact(left, right);
        } catch (ArithmeticException exception) {
            throw invalidResponse(operation + " 합계 overflow");
        }
    }

    private static ErrorCode[] statisticErrors() {
        return new ErrorCode[]{
                CommonErrorCode.INVALID_REQUEST,
                LearningServiceErrorCode.COHORT_ACCESS_DENIED,
                LearningServiceErrorCode.COHORT_MANAGER_REQUIRED,
                LearningServiceErrorCode.COHORT_NOT_FOUND,
                LearningServiceErrorCode.MEMBERSHIP_NOT_FOUND
        };
    }
}
