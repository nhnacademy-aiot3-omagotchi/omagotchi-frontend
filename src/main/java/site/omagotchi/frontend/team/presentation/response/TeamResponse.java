package site.omagotchi.frontend.team.presentation.response;

import site.omagotchi.frontend.team.application.result.TeamView;

import java.time.OffsetDateTime;

public record TeamResponse(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt
) {
    public static TeamResponse from(TeamView view) {
        return new TeamResponse(view.teamId(), view.cohortId(), view.name(), view.createdAt());
    }
}
