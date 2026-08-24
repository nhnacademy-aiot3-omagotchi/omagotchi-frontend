package site.omagotchi.frontend.learning.attendance.infrastructure.response;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceRecordResponse(
        Long id,
        LocalDate attendanceDate,
        String autoStatus,
        String finalStatus,
        Instant checkedInAt,
        Instant checkedOutAt,
        Integer lateMinutes,
        Integer earlyLeaveMinutes,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
