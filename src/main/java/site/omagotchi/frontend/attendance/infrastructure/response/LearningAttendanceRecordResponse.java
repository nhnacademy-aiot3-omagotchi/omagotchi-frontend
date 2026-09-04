package site.omagotchi.frontend.attendance.infrastructure.response;


import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Learning의 출결 기록 응답.
 *
 * <p>{@code cohortMembershipId}·{@code userId}·{@code nickname}은 관리자 목록에서만
 * 채워진다. 본인 조회와 입·퇴실 응답에서는 대상이 요청자 자신이라 Learning이 비워
 * 보내므로, 이 셋을 필수로 검증하면 사용자 경로가 통째로 깨진다.</p>
 */
public record LearningAttendanceRecordResponse(
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
}
