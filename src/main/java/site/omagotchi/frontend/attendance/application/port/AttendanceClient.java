package site.omagotchi.frontend.attendance.application.port;

import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;

import java.time.LocalDate;
import java.util.Optional;

public interface AttendanceClient {

    AttendancePageResult getHistory(
            String bearerToken,
            Long cohortId,
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    );

    AttendanceRecordResult checkIn(String bearerToken, Long cohortId);

    AttendanceRecordResult checkOut(String bearerToken, Long cohortId);

    Optional<CurrentPresenceResult> getCurrentPresence(String bearerToken, Long cohortId);

    Long moveLab(String bearerToken, Long cohortId, Long spaceId);

    Long moveStudySpace(String bearerToken, Long cohortId, Long spaceId);
}
