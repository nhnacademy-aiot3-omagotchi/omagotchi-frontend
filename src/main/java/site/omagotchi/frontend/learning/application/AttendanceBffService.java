package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordResponse;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordPageResponse;
import site.omagotchi.frontend.learning.infrastructure.response.UserProfileResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceBffService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private static final LocalTime SERVICE_DAY_START = LocalTime.of(4, 0);

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public AttendanceRecordPageResponse getHistory(
            HttpServletRequest request,
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    ) {
        RequestContext context = context(request);
        return callExecutor.execute(() -> learningHttpService.getMyAttendanceRecords(
                context.bearerToken(),
                context.cohortId(),
                from == null ? null : from.toString(),
                to == null ? null : to.toString(),
                page,
                size
        ));
    }

    public Optional<AttendanceRecordResponse> getToday(HttpServletRequest request) {
        LocalDate today = serviceDate(Instant.now());
        return getHistory(request, today, today, 0, 1).items().stream()
                .findFirst();
    }

    public AttendanceRecordResponse checkIn(HttpServletRequest request) {
        RequestContext context = context(request);
        return callExecutor.execute(() -> learningHttpService.checkIn(
                context.bearerToken(),
                context.cohortId()
        ));
    }

    public AttendanceRecordResponse checkOut(HttpServletRequest request) {
        RequestContext context = context(request);
        return callExecutor.execute(() -> learningHttpService.checkOut(
                context.bearerToken(),
                context.cohortId()
        ));
    }

    private RequestContext context(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        UserProfileResponse profile = callExecutor.execute(
                () -> learningHttpService.getMyProfile(bearerToken)
        );
        if (profile.approvedCohort() == null || profile.approvedCohort().cohortId() == null) {
            throw new BusinessException(LearningBffErrorCode.APPROVED_COHORT_REQUIRED);
        }
        return new RequestContext(bearerToken, profile.approvedCohort().cohortId());
    }

    private static LocalDate serviceDate(Instant instant) {
        var localDateTime = instant.atZone(SERVICE_ZONE);
        return localDateTime.toLocalTime().isBefore(SERVICE_DAY_START)
                ? localDateTime.toLocalDate().minusDays(1)
                : localDateTime.toLocalDate();
    }

    private record RequestContext(String bearerToken, Long cohortId) {
    }
}
