package site.omagotchi.frontend.attendance.infrastructure;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;
import site.omagotchi.frontend.attendance.application.port.AttendanceAccessContext;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;

/** Servlet 요청을 출결 Application 계층의 인증·기수 컨텍스트로 변환한다. */
@Component
@RequestScope
@RequiredArgsConstructor
public class ServletAttendanceAccessContext implements AttendanceAccessContext {

    private final HttpServletRequest request;
    private final LearningCohortContext cohortContext;

    @Override
    public Resolved resolve() {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return new Resolved(context.bearerToken(), context.cohortId());
    }
}
