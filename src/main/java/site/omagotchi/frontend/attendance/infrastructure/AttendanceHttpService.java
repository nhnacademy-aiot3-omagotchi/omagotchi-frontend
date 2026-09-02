package site.omagotchi.frontend.attendance.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.attendance.infrastructure.request.LearningAttendanceSpaceRequest;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceSpaceMoveResponse;
import site.omagotchi.frontend.global.http.response.PageResponse;

@HttpExchange("/api/v1")
public interface AttendanceHttpService {

    @GetExchange("/cohorts/{cohort-id}/attendance-records/me")
    PageResponse<LearningAttendanceRecordResponse> getMyAttendanceRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    );

    @PostExchange("/cohorts/{cohort-id}/attendance-records/check-in")
    LearningAttendanceRecordResponse checkIn(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/attendance-records/check-out")
    LearningAttendanceRecordResponse checkOut(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/attendance-records/move-lab")
    LearningAttendanceSpaceMoveResponse moveLab(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody LearningAttendanceSpaceRequest request
    );

    @PostExchange("/cohorts/{cohort-id}/attendance-records/move-study")
    LearningAttendanceSpaceMoveResponse moveStudySpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody LearningAttendanceSpaceRequest request
    );
}
