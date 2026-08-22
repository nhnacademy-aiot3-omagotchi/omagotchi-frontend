package site.omagotchi.frontend.learning.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.AttendanceBffService;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordResponse;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordPageResponse;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/attendance")
public class AttendanceBffController {

    private final AttendanceBffService attendanceBffService;

    @GetMapping("/history")
    public AttendanceRecordPageResponse getHistory(
            HttpServletRequest request,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return attendanceBffService.getHistory(request, from, to, page, size);
    }

    @GetMapping("/today")
    public ResponseEntity<AttendanceRecordResponse> getToday(HttpServletRequest request) {
        return attendanceBffService.getToday(request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/check-in")
    public AttendanceRecordResponse checkIn(HttpServletRequest request) {
        return attendanceBffService.checkIn(request);
    }

    @PostMapping("/check-out")
    public AttendanceRecordResponse checkOut(HttpServletRequest request) {
        return attendanceBffService.checkOut(request);
    }
}
