package site.omagotchi.frontend.team.presentation.response;

import site.omagotchi.frontend.team.application.result.TeamDetailView;

import java.time.OffsetDateTime;
import java.util.List;

public record TeamDetailResponse(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt,
        int memberCount,
        Long myMemberId,
        String myRole,
        List<TeamMemberResponse> members
) {
    public static TeamDetailResponse from(TeamDetailView view) {
        return new TeamDetailResponse(
                view.teamId(),
                view.cohortId(),
                view.name(),
                view.createdAt(),
                view.memberCount(),
                view.myMemberId(),
                view.myRole(),
                view.members().stream().map(TeamMemberResponse::from).toList()
        );
    }
}
