package site.omagotchi.frontend.attendance.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.attendance.application.AttendanceBffService;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AttendanceBffControllerTest {

    @Mock
    private AttendanceBffService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new AttendanceBffController(service)
        ).build();
    }

    @Test
    @DisplayName("출결 Application 결과의 공통 items·page 응답 변환")
    void returnsAttendanceHistoryAsCommonPageResponse() throws Exception {
        // Given: 출결 항목과 페이지 정보를 포함한 Application 결과
        AttendanceRecordResult record = attendanceRecord();
        when(service.getHistory(
                any(HttpServletRequest.class),
                eq(LocalDate.of(2026, 8, 1)),
                eq(LocalDate.of(2026, 8, 21)),
                eq(1),
                eq(10)
        )).thenReturn(new AttendancePageResult(
                List.of(record),
                new PageMetadata(1, 10, 13, 2)
        ));

        // When: 출결 이력 BFF 요청
        mockMvc.perform(get("/bff/v1/attendance/history")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-21")
                        .param("page", "1")
                        .param("size", "10"))
                // Then: Presentation DTO와 공통 페이지 구조 반환
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.items[0].id").doesNotExist(),
                        jsonPath("$.items[0].finalStatus").value("PRESENT"),
                        jsonPath("$.page.number").value(1),
                        jsonPath("$.page.size").value(10),
                        jsonPath("$.page.totalElements").value(13),
                        jsonPath("$.page.totalPages").value(2)
                );

        verify(service).getHistory(
                any(HttpServletRequest.class),
                eq(LocalDate.of(2026, 8, 1)),
                eq(LocalDate.of(2026, 8, 21)),
                eq(1),
                eq(10)
        );
    }

    @Test
    @DisplayName("입실 Application 결과의 Presentation 응답 변환")
    void returnsCheckInResultAsPresentationResponse() throws Exception {
        // Given: 입실 처리 Application 결과
        when(service.checkIn(any(HttpServletRequest.class))).thenReturn(attendanceRecord());

        // When: 입실 BFF 요청
        mockMvc.perform(post("/bff/v1/attendance/check-in"))
                // Then: Presentation 응답 반환
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").doesNotExist(),
                        jsonPath("$.attendanceDate").value("2026-08-20"),
                        jsonPath("$.finalStatus").value("PRESENT")
                );

        verify(service).checkIn(any(HttpServletRequest.class));
    }

    private static AttendanceRecordResult attendanceRecord() {
        Instant timestamp = Instant.parse("2026-08-20T00:00:00Z");
        return new AttendanceRecordResult(
                LocalDate.of(2026, 8, 20),
                "PRESENT",
                "PRESENT",
                timestamp,
                null,
                0,
                0
        );
    }
}
