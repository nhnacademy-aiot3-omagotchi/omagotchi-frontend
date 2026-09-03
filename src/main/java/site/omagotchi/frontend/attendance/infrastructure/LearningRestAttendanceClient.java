package site.omagotchi.frontend.attendance.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.attendance.application.port.AttendanceClient;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;
import site.omagotchi.frontend.attendance.infrastructure.request.LearningAttendanceSpaceRequest;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceSpaceMoveResponse;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningCurrentPresenceResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.PageResponseContractValidator;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class LearningRestAttendanceClient implements AttendanceClient {

    private static final Set<String> PRESENCE_STATES = Set.of(
            "PRESENT",
            "AWAY",
            "MEETING",
            "STUDYING"
    );

    private final AttendanceHttpService httpService;
    private final LearningGatewayCallExecutor callExecutor;

    @Override
    public AttendancePageResult getHistory(
            String bearerToken,
            Long cohortId,
            LocalDate from,
            LocalDate to,
            Integer page,
            Integer size
    ) {
        PageResponse<LearningAttendanceRecordResponse> response = callExecutor.execute(
                () -> httpService.getMyAttendanceRecords(
                        bearerToken,
                        cohortId,
                        from == null ? null : from.toString(),
                        to == null ? null : to.toString(),
                        page,
                        size
                )
        );
        PageResponse<LearningAttendanceRecordResponse> validResponse =
                PageResponseContractValidator.requireValid(
                        response,
                        "Learning 출결 이력 조회"
                );
        PageInfo pageInfo = validResponse.page();
        return new AttendancePageResult(
                validResponse.items().stream()
                        .map(LearningRestAttendanceClient::toResult)
                        .toList(),
                new PageMetadata(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }

    @Override
    public AttendanceRecordResult checkIn(String bearerToken, Long cohortId) {
        return toResult(callExecutor.execute(
                () -> httpService.checkIn(bearerToken, cohortId)
        ));
    }

    @Override
    public AttendanceRecordResult checkOut(String bearerToken, Long cohortId) {
        return toResult(callExecutor.execute(
                () -> httpService.checkOut(bearerToken, cohortId)
        ));
    }

    @Override
    public Optional<CurrentPresenceResult> getCurrentPresence(
            String bearerToken,
            Long cohortId
    ) {
        LearningCurrentPresenceResponse response = callExecutor.execute(
                () -> httpService.getCurrentPresence(bearerToken, cohortId)
        );
        if (response == null) {
            return Optional.empty();
        }
        if (response.state() == null
                || !PRESENCE_STATES.contains(response.state())
                || response.startedAt() == null
                || (response.spaceId() != null && response.spaceId() <= 0L)) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 현재 위치 응답 누락"
            );
        }
        return Optional.of(new CurrentPresenceResult(
                response.spaceId(),
                response.state(),
                response.startedAt()
        ));
    }

    @Override
    public Long moveLab(String bearerToken, Long cohortId, Long spaceId) {
        return requireMovedSpace(callExecutor.execute(
                () -> httpService.moveLab(
                        bearerToken,
                        cohortId,
                        new LearningAttendanceSpaceRequest(spaceId)
                )
        ));
    }

    @Override
    public Long moveStudySpace(String bearerToken, Long cohortId, Long spaceId) {
        return requireMovedSpace(callExecutor.execute(
                () -> httpService.moveStudySpace(
                        bearerToken,
                        cohortId,
                        new LearningAttendanceSpaceRequest(spaceId)
                )
        ));
    }

    private static Long requireMovedSpace(LearningAttendanceSpaceMoveResponse response) {
        if (response == null || response.spaceId() == null || response.spaceId() <= 0L) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 공간 이동 응답 누락"
            );
        }
        return response.spaceId();
    }

    private static AttendanceRecordResult toResult(LearningAttendanceRecordResponse response) {
        if (response == null
                || response.attendanceDate() == null
                || response.autoStatus() == null
                || response.autoStatus().isBlank()
                || response.finalStatus() == null
                || response.finalStatus().isBlank()
                || response.lateMinutes() == null
                || response.earlyLeaveMinutes() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 출결 기록 응답 누락"
            );
        }
        return new AttendanceRecordResult(
                response.attendanceDate(),
                response.autoStatus(),
                response.finalStatus(),
                response.checkedInAt(),
                response.checkedOutAt(),
                response.lateMinutes(),
                response.earlyLeaveMinutes()
        );
    }
}
