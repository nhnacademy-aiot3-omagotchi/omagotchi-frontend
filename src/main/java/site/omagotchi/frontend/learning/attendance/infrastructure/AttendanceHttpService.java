package site.omagotchi.frontend.learning.attendance.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.learning.attendance.infrastructure.response.AttendanceRecordPageResponse;
import site.omagotchi.frontend.learning.attendance.infrastructure.response.AttendanceRecordResponse;

@HttpExchange("/api/v1")
public interface AttendanceHttpService {

    @GetExchange("/cohorts/{cohortId}/attendance-records/me")
    AttendanceRecordPageResponse getMyAttendanceRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    );

    @PostExchange("/cohorts/{cohortId}/attendance-records/check-in")
    AttendanceRecordResponse checkIn(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/{cohortId}/attendance-records/check-out")
    AttendanceRecordResponse checkOut(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );
}
