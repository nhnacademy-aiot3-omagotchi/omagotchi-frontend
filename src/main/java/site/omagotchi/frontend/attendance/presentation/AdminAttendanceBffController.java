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
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.attendance.presentation.response.AdminAttendanceRecordResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.response.PageResponse;
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

    /**
     * 기수 관리자 출결 목록.
     *
     * <p>다른 경로와 달리 {@code JsonNode}를 그대로 흘리지 않고 응답을 타입으로 받는다.
     * 화면이 구성원을 그리려면 {@code cohortMembershipId}·{@code userId}·{@code nickname}이
     * 반드시 있어야 하는데, 무타입 프록시는 Learning이 그 필드를 빼도 컴파일과 응답이
     * 모두 성공해 화면에서만 조용히 사라진다.</p>
     */
    @GetMapping("/attendance-records")
    public PageResponse<AdminAttendanceRecordResponse> getAttendanceRecords(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String date,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "100") Integer size
    ) {
        PageResponse<LearningAttendanceRecordResponse> response = proxy.execute(
                request,
                context -> context.service().getAttendanceRecords(
                        context.bearerToken(), cohortId, date, page, size
                )
        );
        if (response == null || response.items() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 관리자 출결 목록 응답 누락"
            );
        }
        return new PageResponse<>(
                response.items().stream().map(AdminAttendanceRecordResponse::from).toList(),
                response.page()
        );
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
