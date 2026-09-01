package site.omagotchi.frontend.attendance.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.attendance.application.port.AttendanceClient;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.PageResponseContractValidator;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class LearningRestAttendanceClient implements AttendanceClient {

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
