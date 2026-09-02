package site.omagotchi.frontend.team.application.result;

import java.util.UUID;

/** userId는 선택한 후보를 팀원 추가 명령의 targetUserId로 전달할 때만 사용한다. */
public record TeamMemberCandidateView(
        UUID userId,
        String displayName,
        String email,
        String status
) {
}
