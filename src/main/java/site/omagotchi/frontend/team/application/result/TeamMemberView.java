package site.omagotchi.frontend.team.application.result;

import java.time.OffsetDateTime;

/** memberId는 팀원 제외와 마스터 위임 명령에 사용하는 team_members 식별자다. */
public record TeamMemberView(
        Long memberId,
        String displayName,
        String role,
        OffsetDateTime joinedAt
) {
}
