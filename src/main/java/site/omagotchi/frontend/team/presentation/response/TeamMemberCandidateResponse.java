package site.omagotchi.frontend.team.presentation.response;

import site.omagotchi.frontend.team.application.result.TeamMemberCandidateView;

import java.util.UUID;

public record TeamMemberCandidateResponse(
        UUID userId,
        String displayName,
        String email,
        String status
) {
    public static TeamMemberCandidateResponse from(TeamMemberCandidateView view) {
        return new TeamMemberCandidateResponse(
                view.userId(), view.displayName(), view.email(), view.status());
    }
}
