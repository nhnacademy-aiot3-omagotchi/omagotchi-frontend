package site.omagotchi.frontend.attendance.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/cohorts/{cohort-id}")
public class AdminAttendanceBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/attendance-policy")
    public JsonNode getAttendancePolicy(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        return proxy.execute(request, context -> context.service()
                .getAttendancePolicy(context.bearerToken(), cohortId));
    }

    @PutMapping("/attendance-policy")
    public JsonNode updateAttendancePolicy(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateAttendancePolicy(context.bearerToken(), cohortId, body));
    }

    @GetMapping("/attendance-records")
    public JsonNode getAttendanceRecords(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String date,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "100") Integer size
    ) {
        return proxy.execute(request, context -> context.service().getAttendanceRecords(
                context.bearerToken(), cohortId, date, page, size
        ));
    }

    @PatchMapping("/attendance-records/{attendance-id}/status")
    public ResponseEntity<Void> updateAttendanceStatus(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("attendance-id") Long attendanceRecordId,
            @RequestBody JsonNode body
    ) {
        proxy.execute(request, context -> context.service()
                .updateAttendanceStatus(context.bearerToken(), cohortId, attendanceRecordId, body));
        return ResponseEntity.noContent().build();
    }
}
