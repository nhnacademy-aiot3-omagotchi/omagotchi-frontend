package site.omagotchi.frontend.attendance.application.result;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceRecordResult(
        LocalDate attendanceDate,
        String autoStatus,
        String finalStatus,
        Instant checkedInAt,
        Instant checkedOutAt,
        Integer lateMinutes,
        Integer earlyLeaveMinutes
) {
}
