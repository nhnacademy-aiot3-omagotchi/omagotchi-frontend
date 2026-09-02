package site.omagotchi.frontend.attendance.infrastructure.response;

import java.time.Instant;
import java.time.LocalDate;

public record LearningAttendanceRecordResponse(
        Long id,
        LocalDate attendanceDate,
        String autoStatus,
        String finalStatus,
        Instant checkedInAt,
        Instant checkedOutAt,
        Integer lateMinutes,
        Integer earlyLeaveMinutes
) {
}
