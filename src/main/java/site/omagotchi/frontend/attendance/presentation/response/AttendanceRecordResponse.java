package site.omagotchi.frontend.attendance.presentation.response;

import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceRecordResponse(
        LocalDate attendanceDate,
        String autoStatus,
        String finalStatus,
        Instant checkedInAt,
        Instant checkedOutAt,
        Integer lateMinutes,
        Integer earlyLeaveMinutes
) {

    public static AttendanceRecordResponse from(AttendanceRecordResult result) {
        return new AttendanceRecordResponse(
                result.attendanceDate(),
                result.autoStatus(),
                result.finalStatus(),
                result.checkedInAt(),
                result.checkedOutAt(),
                result.lateMinutes(),
                result.earlyLeaveMinutes()
        );
    }
}
