package site.omagotchi.frontend.attendance.presentation;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.attendance.application.AttendanceBffService;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.presentation.request.AttendanceSpaceRequest;
import site.omagotchi.frontend.attendance.presentation.response.AttendanceRecordResponse;
import site.omagotchi.frontend.attendance.presentation.response.AttendanceSpaceMoveResponse;
import site.omagotchi.frontend.attendance.presentation.response.CurrentPresenceResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/attendance")
public class AttendanceBffController {

    private final AttendanceBffService attendanceBffService;

    @GetMapping("/history")
    public PageResponse<AttendanceRecordResponse> getHistory(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AttendancePageResult result = attendanceBffService.getHistory(
                from,
                to,
                page,
                size
        );
        PageMetadata pageInfo = result.page();
        return new PageResponse<>(
                result.items().stream().map(AttendanceRecordResponse::from).toList(),
                new PageInfo(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }

    @GetMapping("/today")
    public ResponseEntity<AttendanceRecordResponse> getToday() {
        return attendanceBffService.getToday()
                .map(AttendanceRecordResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/current-presence")
    public ResponseEntity<CurrentPresenceResponse> getCurrentPresence() {
        return attendanceBffService.getCurrentPresence()
                .map(CurrentPresenceResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/check-in")
    public AttendanceRecordResponse checkIn() {
        return AttendanceRecordResponse.from(attendanceBffService.checkIn());
    }

    @PostMapping("/check-out")
    public AttendanceRecordResponse checkOut() {
        return AttendanceRecordResponse.from(attendanceBffService.checkOut());
    }

    @PostMapping("/move-lab")
    public AttendanceSpaceMoveResponse moveLab(
            @Valid @RequestBody AttendanceSpaceRequest request
    ) {
        return new AttendanceSpaceMoveResponse(
                attendanceBffService.moveLab(request.spaceId())
        );
    }

    @PostMapping("/move-study")
    public AttendanceSpaceMoveResponse moveStudySpace(
            @Valid @RequestBody AttendanceSpaceRequest request
    ) {
        return new AttendanceSpaceMoveResponse(
                attendanceBffService.moveStudySpace(request.spaceId())
        );
    }
}
