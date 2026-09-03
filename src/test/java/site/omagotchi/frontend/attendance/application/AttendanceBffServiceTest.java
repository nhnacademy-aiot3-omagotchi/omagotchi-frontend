package site.omagotchi.frontend.attendance.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import site.omagotchi.frontend.attendance.application.port.AttendanceAccessContext;
import site.omagotchi.frontend.attendance.application.port.AttendanceClient;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceBffServiceTest {

    @Mock
    private AttendanceClient attendanceClient;

    @Mock
    private AttendanceAccessContext accessContext;

    private AttendanceBffService service;

    @BeforeEach
    void setUp() {
        service = new AttendanceBffService(attendanceClient, accessContext);
        when(accessContext.resolve())
                .thenReturn(new AttendanceAccessContext.Resolved("Bearer access-token", 7L));
    }

    @Test
    @DisplayName("승인 기수 Context를 사용한 출결 이력 조회")
    void getsHistoryThroughAttendancePort() {
        // Given: Session에서 해석한 Access Token·기수와 빈 출결 페이지
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 21);
        AttendancePageResult expected = new AttendancePageResult(
                List.of(),
                new PageMetadata(0, 20, 0, 0)
        );
        when(attendanceClient.getHistory(
                "Bearer access-token", 7L, from, to, 0, 20
        )).thenReturn(expected);

        // When: 사용자 출결 이력 조회
        AttendancePageResult result = service.getHistory(from, to, 0, 20);

        // Then: HTTP 기술 타입 없이 Attendance Port에 위임
        assertThat(result).isSameAs(expected);
        verify(accessContext).resolve();
        verify(attendanceClient).getHistory(
                "Bearer access-token", 7L, from, to, 0, 20
        );
    }

    @Test
    @DisplayName("승인 기수 Context를 사용한 입실 처리")
    void checksInThroughAttendancePort() {
        // Given: Session에서 해석한 Access Token·기수와 입실 결과
        AttendanceRecordResult expected = attendanceRecord();
        when(attendanceClient.checkIn("Bearer access-token", 7L)).thenReturn(expected);

        // When: 사용자 입실 처리
        AttendanceRecordResult result = service.checkIn();

        // Then: HTTP 기술 타입 없이 Attendance Port에 위임
        assertThat(result).isSameAs(expected);
        verify(accessContext).resolve();
        verify(attendanceClient).checkIn("Bearer access-token", 7L);
    }

    @Test
    @DisplayName("승인 기수 Context를 사용한 퇴실 처리")
    void checksOutThroughAttendancePort() {
        // Given: Session에서 해석한 Access Token·기수와 퇴실 결과
        AttendanceRecordResult expected = attendanceRecord();
        when(attendanceClient.checkOut("Bearer access-token", 7L)).thenReturn(expected);

        // When: 사용자 퇴실 처리
        AttendanceRecordResult result = service.checkOut();

        // Then: HTTP 기술 타입 없이 Attendance Port에 위임
        assertThat(result).isSameAs(expected);
        verify(accessContext).resolve();
        verify(attendanceClient).checkOut("Bearer access-token", 7L);
    }

    @Test
    @DisplayName("승인 기수 Context를 사용한 현재 위치 조회")
    void getsCurrentPresenceThroughAttendancePort() {
        CurrentPresenceResult expected = new CurrentPresenceResult(
                301L,
                "PRESENT",
                Instant.parse("2026-09-02T01:00:00Z")
        );
        when(attendanceClient.getCurrentPresence("Bearer access-token", 7L))
                .thenReturn(Optional.of(expected));

        var result = service.getCurrentPresence();

        assertThat(result).contains(expected);
        verify(accessContext).resolve();
        verify(attendanceClient).getCurrentPresence("Bearer access-token", 7L);
    }

    @Test
    @DisplayName("승인 기수 Context를 사용한 도서관 입장 처리")
    void movesToStudySpaceThroughAttendancePort() {
        when(attendanceClient.moveStudySpace("Bearer access-token", 7L, 301L))
                .thenReturn(301L);

        Long result = service.moveStudySpace(301L);

        assertThat(result).isEqualTo(301L);
        verify(accessContext).resolve();
        verify(attendanceClient).moveStudySpace("Bearer access-token", 7L, 301L);
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
