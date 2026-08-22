package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordResponse;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordPageResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceBffService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    // 자정을 기준으로 하면 야간 학습 기록이 이틀로 나뉘므로 오전 4시를 하루 경계로 둔다.
    private static final LocalTime SERVICE_DAY_START = LocalTime.of(4, 0);

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    public AttendanceRecordPageResponse getHistory(
            HttpServletRequest request,
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
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
        AttendanceRecordPageResponse response = getHistory(request, today, today, 0, 1);

        // 하류가 2xx를 반환해도 items가 비어 있거나 null일 수 있으므로 방어한다.
        List<AttendanceRecordResponse> items = response == null ? null : response.items();
        if (items == null || items.isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(items.getFirst());
    }

    public AttendanceRecordResponse checkIn(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return callExecutor.execute(() -> learningHttpService.checkIn(
                context.bearerToken(),
                context.cohortId()
        ));
    }

    public AttendanceRecordResponse checkOut(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        return callExecutor.execute(() -> learningHttpService.checkOut(
                context.bearerToken(),
                context.cohortId()
        ));
    }

    private static LocalDate serviceDate(Instant instant) {
        var localDateTime = instant.atZone(SERVICE_ZONE);
        return localDateTime.toLocalTime().isBefore(SERVICE_DAY_START)
                ? localDateTime.toLocalDate().minusDays(1)
                : localDateTime.toLocalDate();
    }
}
