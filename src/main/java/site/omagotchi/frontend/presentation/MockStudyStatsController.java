package site.omagotchi.frontend.presentation;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

// 데이터 표시를 위해 임시적으로 작성한 컨트롤러
// 추후 삭제해야 함
@RestController
@RequestMapping("/bff/v1/mock-api/study-stats")
public class MockStudyStatsController {

    private static final int STUDENT_COUNT = 50;
    private static final int DEFAULT_PERIOD_DAYS = 7;
    private static final int MAX_PERIOD_DAYS = 31;
    private static final ZoneId AGGREGATION_ZONE = ZoneId.of("Asia/Seoul");
    private static final LocalTime DAY_STARTS_AT = LocalTime.of(4, 0);
    private static final List<MockStudent> STUDENTS = createStudents();

    @GetMapping
    public StudyStatisticsResponse getStudyStatistics(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate currentAggregationDate = currentAggregationDate();
        Period period = resolvePeriod(from, to, currentAggregationDate);
        List<LocalDate> dates = period.dates();
        List<MemberStatistics> members = STUDENTS.stream()
                .map(student -> memberStatistics(student, dates, currentAggregationDate))
                .toList();
        List<DailyTotal> dailyTotals = dates.stream()
                .map(date -> new DailyTotal(
                        date,
                        STUDENTS.stream()
                                .mapToLong(student -> studySeconds(student.number(), date))
                                .sum()
                ))
                .toList();

        long todayTotalStudySeconds = members.stream()
                .mapToLong(MemberStatistics::todayStudySeconds)
                .sum();
        long periodTotalStudySeconds = members.stream()
                .mapToLong(MemberStatistics::periodStudySeconds)
                .sum();
        long todayParticipantCount = members.stream()
                .filter(member -> member.todayStudySeconds() > 0)
                .count();
        long currentlyStudyingStudentCount = members.stream()
                .filter(member -> member.todayStudySeconds() > 0)
                .filter(member -> member.cohortMembershipId() % 5 == 0)
                .count();
        Summary summary = new Summary(
                todayTotalStudySeconds,
                periodTotalStudySeconds,
                members.size(),
                todayParticipantCount,
                currentlyStudyingStudentCount,
                todayParticipantCount == 0 ? 0 : todayTotalStudySeconds / todayParticipantCount
        );

        return new StudyStatisticsResponse(
                period.from(),
                period.to(),
                currentAggregationDate,
                AGGREGATION_ZONE.getId(),
                DAY_STARTS_AT,
                summary,
                dailyTotals,
                members,
                durationBuckets(members)
        );
    }

    @GetMapping("/members/{cohortMembershipId}/records")
    public MemberRecordsResponse getMemberRecords(
            @PathVariable Long cohortMembershipId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        MockStudent student = STUDENTS.stream()
                .filter(candidate -> candidate.cohortMembershipId().equals(cohortMembershipId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Mock 수강생을 찾을 수 없습니다."
                ));
        Period period = resolvePeriod(from, to, currentAggregationDate());
        List<StudyRecordResponse> records = period.dates().stream()
                .flatMap(date -> studyRecords(student, date).stream())
                .sorted((left, right) -> right.startTime().compareTo(left.startTime()))
                .toList();

        return new MemberRecordsResponse(
                student.cohortMembershipId(),
                student.userId(),
                period.from(),
                period.to(),
                records.stream().mapToLong(StudyRecordResponse::studySeconds).sum(),
                records
        );
    }

    private MemberStatistics memberStatistics(
            MockStudent student,
            List<LocalDate> dates,
            LocalDate currentAggregationDate
    ) {
        long todayStudySeconds = studySeconds(student.number(), currentAggregationDate);
        long periodStudySeconds = dates.stream()
                .mapToLong(date -> studySeconds(student.number(), date))
                .sum();
        long activeStudyDays = dates.stream()
                .filter(date -> studySeconds(student.number(), date) > 0)
                .count();
        Instant lastStudiedAt = dates.stream()
                .flatMap(date -> studyRecords(student, date).stream())
                .map(StudyRecordResponse::endTime)
                .max(Comparator.naturalOrder())
                .orElse(null);
        long recordCount = dates.stream()
                .mapToLong(date -> studyRecords(student, date).size())
                .sum();

        return new MemberStatistics(
                student.cohortMembershipId(),
                student.userId(),
                student.name(),
                student.email(),
                todayStudySeconds,
                periodStudySeconds,
                activeStudyDays,
                recordCount,
                lastStudiedAt
        );
    }

    private List<StudyRecordResponse> studyRecords(MockStudent student, LocalDate date) {
        long seconds = studySeconds(student.number(), date);
        if (seconds == 0) return List.of();

        Instant startTime = date.atTime(9 + student.number() % 4, 0)
                .atZone(AGGREGATION_ZONE)
                .toInstant();
        if (seconds < 7_200) {
            return List.of(studyRecord(student, date, 1, startTime, seconds));
        }

        long firstSeconds = seconds * 55 / 100 / 60 * 60;
        long secondSeconds = seconds - firstSeconds;
        Instant secondStartTime = startTime.plusSeconds(firstSeconds + 45 * 60);
        return List.of(
                studyRecord(student, date, 1, startTime, firstSeconds),
                studyRecord(student, date, 2, secondStartTime, secondSeconds)
        );
    }

    private StudyRecordResponse studyRecord(
            MockStudent student,
            LocalDate date,
            int sequence,
            Instant startTime,
            long seconds
    ) {
        Instant endTime = startTime.plusSeconds(seconds);

        return new StudyRecordResponse(
                UUID.nameUUIDFromBytes(
                        ("mock-study-record-" + student.number() + "-" + date + "-" + sequence)
                                .getBytes(StandardCharsets.UTF_8)
                ),
                date,
                startTime,
                endTime,
                seconds,
                endTime.plusSeconds(300)
        );
    }

    private List<DurationBucket> durationBuckets(List<MemberStatistics> members) {
        List<String> codes = List.of(
                "NO_RECORD",
                "UNDER_ONE_HOUR",
                "ONE_TO_TWO_HOURS",
                "TWO_TO_FOUR_HOURS",
                "FOUR_HOURS_OR_MORE"
        );

        return codes.stream()
                .map(code -> new DurationBucket(
                        code,
                        members.stream()
                                .filter(member -> durationBucket(member.todayStudySeconds()).equals(code))
                                .count()
                ))
                .toList();
    }

    private String durationBucket(long studySeconds) {
        if (studySeconds == 0) return "NO_RECORD";
        if (studySeconds < 3_600) return "UNDER_ONE_HOUR";
        if (studySeconds < 7_200) return "ONE_TO_TWO_HOURS";
        if (studySeconds < 14_400) return "TWO_TO_FOUR_HOURS";
        return "FOUR_HOURS_OR_MORE";
    }

    private long studySeconds(int studentNumber, LocalDate date) {
        int activitySeed = Math.floorMod(
                studentNumber * 41 + date.getDayOfYear() * 17,
                10
        );
        if (activitySeed < 2) return 0;

        int minutes = 30 + Math.floorMod(
                studentNumber * 29 + date.getDayOfYear() * 11,
                211
        );
        return minutes * 60L;
    }

    private Period resolvePeriod(
            LocalDate requestedFrom,
            LocalDate requestedTo,
            LocalDate currentAggregationDate
    ) {
        LocalDate to = requestedTo == null ? currentAggregationDate : requestedTo;
        LocalDate from = requestedFrom == null
                ? to.minusDays(DEFAULT_PERIOD_DAYS - 1L)
                : requestedFrom;
        long periodDays = ChronoUnit.DAYS.between(from, to) + 1;
        if (from.isAfter(to) || periodDays > MAX_PERIOD_DAYS) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mock 공부 통계 조회 기간이 올바르지 않습니다."
            );
        }
        return new Period(from, to);
    }

    private LocalDate currentAggregationDate() {
        return ZonedDateTime.now(AGGREGATION_ZONE)
                .minusHours(DAY_STARTS_AT.getHour())
                .toLocalDate();
    }

    private static List<MockStudent> createStudents() {
        return IntStream.rangeClosed(1, STUDENT_COUNT)
                .mapToObj(number -> new MockStudent(
                        number,
                        (long) number,
                        UUID.nameUUIDFromBytes(
                                ("mock-student-" + number).getBytes(StandardCharsets.UTF_8)
                        ),
                        "수강생%02d".formatted(number),
                        "student%d@nhnacademy.com".formatted(number)
                ))
                .toList();
    }

    private record Period(LocalDate from, LocalDate to) {

        private List<LocalDate> dates() {
            return from.datesUntil(to.plusDays(1)).toList();
        }
    }

    private record MockStudent(
            int number,
            Long cohortMembershipId,
            UUID userId,
            String name,
            String email
    ) {
    }

    public record StudyStatisticsResponse(
            LocalDate from,
            LocalDate to,
            LocalDate currentAggregationDate,
            String zoneId,
            LocalTime dayStartsAt,
            Summary summary,
            List<DailyTotal> dailyTotals,
            List<MemberStatistics> members,
            List<DurationBucket> durationBuckets
    ) {
    }

    public record Summary(
            long todayTotalStudySeconds,
            long periodTotalStudySeconds,
            long activeStudentCount,
            long todayParticipantCount,
            long currentlyStudyingStudentCount,
            long averageTodayParticipantStudySeconds
    ) {
    }

    public record DailyTotal(LocalDate aggregationDate, long studySeconds) {
    }

    public record MemberStatistics(
            Long cohortMembershipId,
            UUID userId,
            String name,
            String email,
            long todayStudySeconds,
            long periodStudySeconds,
            long activeStudyDays,
            long recordCount,
            Instant lastStudiedAt
    ) {
    }

    public record DurationBucket(String code, long memberCount) {
    }

    public record MemberRecordsResponse(
            Long cohortMembershipId,
            UUID userId,
            LocalDate from,
            LocalDate to,
            long totalStudySeconds,
            List<StudyRecordResponse> records
    ) {
    }

    public record StudyRecordResponse(
            UUID id,
            LocalDate aggregationDate,
            Instant startTime,
            Instant endTime,
            long studySeconds,
            Instant updatedAt
    ) {
    }
}
