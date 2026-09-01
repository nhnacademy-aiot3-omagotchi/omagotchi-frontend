package site.omagotchi.frontend.attendance.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.attendance.application.port.AttendanceClient;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceBffService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    // 자정을 기준으로 하면 야간 학습 기록이 이틀로 나뉘므로 오전 4시를 하루 경계로 둔다.
    private static final LocalTime SERVICE_DAY_START = LocalTime.of(4, 0);

    private final AttendanceClient attendanceClient;
    private final LearningCohortContext cohortContext;

    // TODO: Servlet 요청 의존을 인증·기수 컨텍스트용 Application Port로 대체한다.
    public AttendancePageResult getHistory(
            HttpServletRequest request,
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return attendanceClient.getHistory(
                context.bearerToken(),
                context.cohortId(),
                from,
                to,
                page,
                size
        );
    }

    public Optional<AttendanceRecordResult> getToday(HttpServletRequest request) {
        LocalDate today = serviceDate(Instant.now());
        AttendancePageResult response = getHistory(request, today, today, 0, 1);

        List<AttendanceRecordResult> items = response.items();
        if (items.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(items.getFirst());
    }

    public AttendanceRecordResult checkIn(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return attendanceClient.checkIn(context.bearerToken(), context.cohortId());
    }

    public AttendanceRecordResult checkOut(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return attendanceClient.checkOut(context.bearerToken(), context.cohortId());
    }

    private static LocalDate serviceDate(Instant instant) {
        ZonedDateTime localDateTime = instant.atZone(SERVICE_ZONE);
        return localDateTime.toLocalTime().isBefore(SERVICE_DAY_START)
                ? localDateTime.toLocalDate().minusDays(1)
                : localDateTime.toLocalDate();
    }
}
