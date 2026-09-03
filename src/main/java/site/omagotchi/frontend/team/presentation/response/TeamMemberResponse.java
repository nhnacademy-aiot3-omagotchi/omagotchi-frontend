package site.omagotchi.frontend.team.presentation.response;

import site.omagotchi.frontend.team.application.result.TeamMemberView;

import java.time.OffsetDateTime;

public record TeamMemberResponse(
        Long memberId,
        String displayName,
        String role,
        OffsetDateTime joinedAt
) {
    public static TeamMemberResponse from(TeamMemberView view) {
        return new TeamMemberResponse(
                view.memberId(), view.displayName(), view.role(), view.joinedAt());
    }
}
