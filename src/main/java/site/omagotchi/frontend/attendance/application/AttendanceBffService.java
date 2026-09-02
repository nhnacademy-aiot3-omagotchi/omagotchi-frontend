package site.omagotchi.frontend.attendance.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.attendance.application.port.AttendanceAccessContext;
import site.omagotchi.frontend.attendance.application.port.AttendanceClient;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;

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
    private final AttendanceAccessContext accessContext;

    public AttendancePageResult getHistory(
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    ) {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.getHistory(
                context.bearerToken(),
                context.cohortId(),
                from,
                to,
                page,
                size
        );
    }

    public Optional<AttendanceRecordResult> getToday() {
        LocalDate today = serviceDate(Instant.now());
        AttendancePageResult response = getHistory(today, today, 0, 1);

        List<AttendanceRecordResult> items = response.items();
        if (items.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(items.getFirst());
    }

    public AttendanceRecordResult checkIn() {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.checkIn(context.bearerToken(), context.cohortId());
    }

    public AttendanceRecordResult checkOut() {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.checkOut(context.bearerToken(), context.cohortId());
    }

    public Optional<CurrentPresenceResult> getCurrentPresence() {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.getCurrentPresence(
                context.bearerToken(),
                context.cohortId()
        );
    }

    public Long moveLab(Long spaceId) {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.moveLab(
                context.bearerToken(),
                context.cohortId(),
                spaceId
        );
    }

    public Long moveStudySpace(Long spaceId) {
        AttendanceAccessContext.Resolved context = accessContext.resolve();
        return attendanceClient.moveStudySpace(
                context.bearerToken(),
                context.cohortId(),
                spaceId
        );
    }

    private static LocalDate serviceDate(Instant instant) {
        ZonedDateTime localDateTime = instant.atZone(SERVICE_ZONE);
        return localDateTime.toLocalTime().isBefore(SERVICE_DAY_START)
                ? localDateTime.toLocalDate().minusDays(1)
                : localDateTime.toLocalDate();
    }
}
