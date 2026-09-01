package site.omagotchi.frontend.attendance.infrastructure;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import site.omagotchi.frontend.attendance.application.port.AttendanceAccessContext;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ServletAttendanceAccessContextTest {

    @Test
    @DisplayName("Servlet 요청을 출결 인증·기수 Context로 변환")
    void resolvesAttendanceContextFromServletRequest() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        LearningCohortContext cohortContext = mock(LearningCohortContext.class);
        when(cohortContext.resolve(request))
                .thenReturn(new LearningCohortContext.Resolved("Bearer access-token", 7L));
        ServletAttendanceAccessContext adapter =
                new ServletAttendanceAccessContext(request, cohortContext);

        AttendanceAccessContext.Resolved result = adapter.resolve();

        assertThat(result.bearerToken()).isEqualTo("Bearer access-token");
        assertThat(result.cohortId()).isEqualTo(7L);
        verify(cohortContext).resolve(request);
    }
}
