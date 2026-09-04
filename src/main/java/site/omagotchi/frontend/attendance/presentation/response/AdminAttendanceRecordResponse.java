package site.omagotchi.frontend.attendance.presentation.response;

import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 기수 관리자 출결 목록의 한 행.
 *
 * <p>무타입 {@code JsonNode} 프록시를 대신한다. 프록시는 Learning이 필드를 빼거나
 * 이름을 바꿔도 컴파일이 통과하고 화면에서 조용히 값이 사라졌다 — 이번 출결 화면의
 * 구성원 미표시가 정확히 그 경로로 발생했다.</p>
 *
 * <p>{@code userId}·{@code nickname}은 {@code null}일 수 있다. 표시 이름은 대표 캐릭터가
 * 있어야 생기는 부가 정보이므로, 없다고 목록을 실패시키지 않고 화면이 대체 표기를
 * 고르게 둔다.</p>
 */
public record AdminAttendanceRecordResponse(
        Long id,
        Long cohortMembershipId,
        UUID userId,
        String nickname,
        LocalDate attendanceDate,
        String autoStatus,
        String finalStatus,
        Instant checkedInAt,
        Instant checkedOutAt,
        Integer lateMinutes,
        Integer earlyLeaveMinutes
) {

    public static AdminAttendanceRecordResponse from(LearningAttendanceRecordResponse response) {
        if (response == null
                || response.id() == null
                || response.attendanceDate() == null
                || isBlank(response.autoStatus())
                || isBlank(response.finalStatus())) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 관리자 출결 기록 응답 누락"
            );
        }
        return new AdminAttendanceRecordResponse(
                response.id(),
                response.cohortMembershipId(),
                response.userId(),
                response.nickname(),
                response.attendanceDate(),
                response.autoStatus(),
                response.finalStatus(),
                response.checkedInAt(),
                response.checkedOutAt(),
                response.lateMinutes(),
                response.earlyLeaveMinutes()
        );
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
